-- =====================================================================
-- iter105: タグ機能（goods_inventory にイベント名・シリーズ等のタグを付与）
-- =====================================================================
-- 目的：
--   現状 goods_type + group/character の一致だけで「マッチ候補」を出して
--   いるが、シリーズやイベントの違いはユーザー目視確認に依存している。
--   タグ機能で「LUMENA Debut Album」「Type A」のような追加情報を持たせ、
--   マッチング優先度（iter107）に類似度スコアとして組み込む。
--
-- 設計：
--   - 全タグ自動承認（運用負荷ゼロ）
--   - 同一正規化文字列は 1 行にまとまる（揺れ吸収）
--   - 使用人数バッジは tag_users（自動同期）で正確管理
--   - pg_trgm でふんわり類似度マッチ（iter107 で利用）
--
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. pg_trgm 拡張（trigram similarity）
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- 2. 正規化関数（lowercase + NFKC + 空白圧縮）
-- ---------------------------------------------------------------------
-- 入力: "  LUMENA Debut  Album  "
-- 出力: "lumena debut album"
--
-- - lower: 大文字→小文字
-- - normalize(NFKC): 全角英数→半角、互換文字を正規化
-- - 連続空白は 1 個に圧縮、前後の空白除去
create or replace function normalize_tag_label(label text) returns text
  language sql
  immutable
  parallel safe
as $$
  select regexp_replace(
    btrim(lower(normalize(label, NFKC))),
    '\s+',
    ' ',
    'g'
  );
$$;

-- ---------------------------------------------------------------------
-- 3. tags_master：タグ本体
-- ---------------------------------------------------------------------
create table tags_master (
  id uuid primary key default gen_random_uuid(),
  -- ユーザー表示用ラベル（最初に作った人の入力。空白除去のみ）
  label text not null check (char_length(label) between 1 and 50),
  -- マッチ用正規化文字列（unique）
  normalized_label text not null,
  -- 作成者（NULL = システム or 削除済ユーザー）
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (normalized_label)
);

-- 正規化文字列に GIN trigram index（pg_trgm の % / similarity() を高速化）
create index idx_tags_normalized_trgm
  on tags_master
  using gin (normalized_label gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 4. goods_inventory_tags：在庫アイテム ↔ タグの多対多
-- ---------------------------------------------------------------------
create table goods_inventory_tags (
  inventory_id uuid not null
    references goods_inventory(id) on delete cascade,
  tag_id uuid not null
    references tags_master(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (inventory_id, tag_id)
);

create index idx_inv_tags_inv on goods_inventory_tags(inventory_id);
create index idx_inv_tags_tag on goods_inventory_tags(tag_id);

-- ---------------------------------------------------------------------
-- 5. tag_users：タグごとの利用ユーザー集合（使用人数バッジ用）
-- ---------------------------------------------------------------------
-- 同一ユーザーが複数 inventory に同じタグを付けても 1 行で済むよう
-- (tag_id, user_id) を PK に。trigger で自動同期。
create table tag_users (
  tag_id uuid not null references tags_master(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tag_id, user_id)
);

create index idx_tag_users_tag on tag_users(tag_id);

-- ---------------------------------------------------------------------
-- 6. trigger：goods_inventory_tags 変化に応じて tag_users を同期
-- ---------------------------------------------------------------------
-- INSERT: 該当 (tag, user) が tag_users になければ追加
-- DELETE: ユーザーがその tag を他のどの inventory でも使っていなければ削除
create or replace function sync_tag_users() returns trigger
  language plpgsql
as $$
declare
  v_user_id uuid;
begin
  if (TG_OP = 'INSERT') then
    select user_id into v_user_id
      from goods_inventory where id = NEW.inventory_id;
    if v_user_id is not null then
      insert into tag_users (tag_id, user_id)
        values (NEW.tag_id, v_user_id)
        on conflict do nothing;
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    select user_id into v_user_id
      from goods_inventory where id = OLD.inventory_id;
    if v_user_id is not null then
      -- 同じ user_id が他の inventory でこの tag を使っていなければ削除
      if not exists (
        select 1
          from goods_inventory_tags git
          join goods_inventory gi on gi.id = git.inventory_id
         where git.tag_id = OLD.tag_id
           and gi.user_id = v_user_id
           and git.inventory_id <> OLD.inventory_id
      ) then
        delete from tag_users
         where tag_id = OLD.tag_id and user_id = v_user_id;
      end if;
    end if;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_sync_tag_users
  after insert or delete on goods_inventory_tags
  for each row execute function sync_tag_users();

-- ---------------------------------------------------------------------
-- 7. RPC: タグを在庫に付ける（同時に新規タグも自動作成）
-- ---------------------------------------------------------------------
-- 入力: inventory_id（オーナー本人のみ可）, raw_label（ユーザー入力文字列）
-- 戻り: tag_id
-- 動作:
--   1. ownership check（auth.uid() === goods_inventory.user_id）
--   2. 正規化（normalize_tag_label）
--   3. tags_master を upsert（同 normalized_label があれば既存を返す）
--   4. goods_inventory_tags に attach（既にあれば no-op）
create or replace function attach_inventory_tag(
  p_inventory_id uuid,
  p_raw_label text
) returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_owner_id uuid;
  v_normalized text;
  v_label text;
  v_tag_id uuid;
begin
  -- ownership check
  select user_id into v_owner_id
    from goods_inventory
   where id = p_inventory_id;
  if v_owner_id is null then
    raise exception 'inventory not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'not owner';
  end if;

  v_normalized := normalize_tag_label(p_raw_label);
  v_label := btrim(p_raw_label);

  if length(v_normalized) = 0 or length(v_label) = 0 then
    raise exception 'empty label';
  end if;
  if char_length(v_label) > 50 then
    raise exception 'label too long (max 50 chars)';
  end if;

  -- 既存タグ検索 → なければ作成
  select id into v_tag_id
    from tags_master
   where normalized_label = v_normalized;

  if v_tag_id is null then
    insert into tags_master (label, normalized_label, created_by)
      values (v_label, v_normalized, auth.uid())
      returning id into v_tag_id;
  end if;

  -- attach（重複は no-op）
  insert into goods_inventory_tags (inventory_id, tag_id)
    values (p_inventory_id, v_tag_id)
    on conflict do nothing;

  return v_tag_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. RPC: タグを在庫から外す
-- ---------------------------------------------------------------------
create or replace function detach_inventory_tag(
  p_inventory_id uuid,
  p_tag_id uuid
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select user_id into v_owner_id
    from goods_inventory
   where id = p_inventory_id;
  if v_owner_id is null then
    raise exception 'inventory not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'not owner';
  end if;

  delete from goods_inventory_tags
   where inventory_id = p_inventory_id and tag_id = p_tag_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. RPC: タグの typeahead 検索（normalized prefix + similarity）
-- ---------------------------------------------------------------------
-- 入力: q（ユーザー入力中のタグ文字列）, limit
-- 戻り: 候補タグ + 利用ユーザー数（使用人数バッジ）
-- 並び：
--   1. 完全前方一致を最上位
--   2. trigram similarity 降順
--   3. 利用ユーザー数 降順
create or replace function search_tags(p_q text, p_limit int default 10)
returns table (
  id uuid,
  label text,
  user_count bigint,
  similarity_score float
)
  language plpgsql
  stable
  parallel safe
as $$
declare
  v_q text;
begin
  v_q := normalize_tag_label(coalesce(p_q, ''));
  if length(v_q) = 0 then
    return query
      select t.id, t.label,
             (select count(*) from tag_users tu where tu.tag_id = t.id) as user_count,
             0.0::float as similarity_score
        from tags_master t
       order by user_count desc, t.label asc
       limit p_limit;
    return;
  end if;

  return query
    select t.id, t.label,
           (select count(*) from tag_users tu where tu.tag_id = t.id) as user_count,
           similarity(t.normalized_label, v_q)::float as similarity_score
      from tags_master t
     where t.normalized_label % v_q
        or t.normalized_label like v_q || '%'
     order by
       (case when t.normalized_label like v_q || '%' then 1 else 0 end) desc,
       similarity(t.normalized_label, v_q) desc,
       (select count(*) from tag_users tu where tu.tag_id = t.id) desc
     limit p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 10. RLS: タグ関連テーブル
-- ---------------------------------------------------------------------
alter table tags_master enable row level security;
alter table goods_inventory_tags enable row level security;
alter table tag_users enable row level security;

-- tags_master: 全員 read OK、書き込みは attach_inventory_tag RPC 経由のみ
create policy "tags read all"
  on tags_master for select
  using (true);

-- goods_inventory_tags: read 全員 OK（マッチング演算で他人の inventory タグも参照する）
create policy "inv_tags read all"
  on goods_inventory_tags for select
  using (true);

-- 直接 INSERT/DELETE は禁止（attach_inventory_tag / detach_inventory_tag RPC 経由のみ）
-- → 何も policy を追加しないことで RLS で拒否される

-- tag_users: read 全員 OK（使用人数バッジで参照）
create policy "tag_users read all"
  on tag_users for select
  using (true);

-- 直接書き込み禁止（trigger 経由のみ）

-- ---------------------------------------------------------------------
-- 11. RPC への実行権限
-- ---------------------------------------------------------------------
grant execute on function attach_inventory_tag(uuid, text) to authenticated;
grant execute on function detach_inventory_tag(uuid, uuid) to authenticated;
grant execute on function search_tags(text, int) to authenticated, anon;
grant execute on function normalize_tag_label(text) to authenticated, anon;

-- =====================================================================
-- 完了
-- =====================================================================
-- 使い方の例（クライアント側）：
--   await supabase.rpc('attach_inventory_tag', {
--     p_inventory_id: invId,
--     p_raw_label: 'LUMENA Debut Album',
--   });
--   await supabase.rpc('search_tags', { p_q: 'lumena' });
-- =====================================================================
