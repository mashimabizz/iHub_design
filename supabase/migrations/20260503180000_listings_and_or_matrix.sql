-- =====================================================================
-- iter67.3: listings を「N×M × AND/OR」マトリクスに拡張
-- =====================================================================
-- 仕様: notes/08 §iter67.3, notes/05 §3 listings
--
-- 旧スキーマ：1 譲（inventory_id 単数）× 複数 wish_ids[] + 比率 ratio_give/receive
-- 新スキーマ：have_ids[]（複数譲）+ have_qtys[]（数量＝比率を内包）+ have_logic ('and'|'or')
--             wish_ids[]（既存）+ wish_qtys[] + wish_logic
--
-- 「比率」概念は qty に統合。listings.exchange_type は廃止し、
-- 各 wish (goods_inventory) の exchange_type で判断。
--
-- 禁止：have_logic='or' AND wish_logic='or' AND 両側 ≥2 アイテム（曖昧）
--
-- データ移行：dev のみ（運用前）なので既存 listings を delete して clean start。

-- 0. 既存テストデータを削除
delete from public.listings;

-- 1. 旧 trigger を drop（カラム参照を解放）
drop trigger if exists trg_validate_listing_refs on public.listings;

-- 2. 旧カラム削除
alter table public.listings
  drop column if exists inventory_id,
  drop column if exists exchange_type,
  drop column if exists ratio_give,
  drop column if exists ratio_receive,
  drop column if exists priority;

-- 3. 新カラム追加
alter table public.listings
  add column have_ids uuid[] not null default '{}',
  add column have_qtys integer[] not null default '{}',
  add column have_logic text not null default 'and'
    check (have_logic in ('and', 'or')),
  add column wish_qtys integer[] not null default '{}',
  add column wish_logic text not null default 'or'
    check (wish_logic in ('and', 'or'));

-- 4. 制約：have_ids/have_qtys 長さ一致 + 1 以上
alter table public.listings
  add constraint listings_have_lengths_match
  check (
    array_length(have_ids, 1) >= 1
    and array_length(have_ids, 1) = array_length(have_qtys, 1)
  );

-- 5. 制約：wish_ids/wish_qtys 長さ一致 + 1 以上
alter table public.listings
  add constraint listings_wish_lengths_match
  check (
    array_length(wish_ids, 1) >= 1
    and array_length(wish_ids, 1) = array_length(wish_qtys, 1)
  );

-- 6. 制約：OR × OR 両側 ≥2 は禁止（組合せ爆発防止）
alter table public.listings
  add constraint listings_no_or_or_multi
  check (
    not (
      have_logic = 'or' and wish_logic = 'or'
      and array_length(have_ids, 1) > 1
      and array_length(wish_ids, 1) > 1
    )
  );

-- 7. trigger 更新（have_ids[] / wish_ids[] / qty>=1 / 整合性）
create or replace function public.validate_listing_refs()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ref_user uuid;
  ref_kind text;
  hid uuid;
  wid uuid;
  q integer;
  i integer;
begin
  -- have_ids: 必須・全件検証 + qty >= 1
  if new.have_ids is null or array_length(new.have_ids, 1) is null then
    raise exception 'have_ids must contain at least one item';
  end if;

  for i in 1..array_length(new.have_ids, 1) loop
    hid := new.have_ids[i];
    q := new.have_qtys[i];
    if q is null or q < 1 then
      raise exception 'have_qtys[%] must be >= 1 (got %)', i, q;
    end if;
    select user_id, kind into ref_user, ref_kind
      from public.goods_inventory where id = hid;
    if ref_user is null then
      raise exception 'have_ids[%]=% not found', i, hid;
    end if;
    if ref_user <> new.user_id then
      raise exception 'have_ids[%]=% must belong to listing owner (user_id=%)', i, hid, new.user_id;
    end if;
    if ref_kind <> 'for_trade' then
      raise exception 'have_ids[%]=% must be kind=for_trade (got %)', i, hid, ref_kind;
    end if;
  end loop;

  -- wish_ids: 必須・全件検証 + qty >= 1
  if new.wish_ids is null or array_length(new.wish_ids, 1) is null then
    raise exception 'wish_ids must contain at least one item';
  end if;

  for i in 1..array_length(new.wish_ids, 1) loop
    wid := new.wish_ids[i];
    q := new.wish_qtys[i];
    if q is null or q < 1 then
      raise exception 'wish_qtys[%] must be >= 1 (got %)', i, q;
    end if;
    select user_id, kind into ref_user, ref_kind
      from public.goods_inventory where id = wid;
    if ref_user is null then
      raise exception 'wish_ids[%]=% not found', i, wid;
    end if;
    if ref_user <> new.user_id then
      raise exception 'wish_ids[%]=% must belong to listing owner (user_id=%)', i, wid, new.user_id;
    end if;
    if ref_kind <> 'wanted' then
      raise exception 'wish_ids[%]=% must be kind=wanted (got %)', i, wid, ref_kind;
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_validate_listing_refs
  before insert or update on public.listings
  for each row execute function public.validate_listing_refs();

-- 8. インデックス：have_ids GIN
create index if not exists idx_listings_have_ids
  on public.listings using gin(have_ids);

-- 9. 旧 idx_listings_inventory は不要（カラム drop 済み）。SQL 上は自動的に消える

-- =====================================================================
-- 完了
-- =====================================================================
