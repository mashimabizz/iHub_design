-- =====================================================================
-- iter67.4: listings 求側を「複数選択肢」モデルに再設計
-- =====================================================================
-- 仕様: notes/08 §iter67.4
--
-- 旧 (iter67.3)：listings に have_*, wish_* を平坦に保持
-- 新 (iter67.4)：
--   - listings：譲側のみ + 譲の代表 group/goods_type
--   - listing_wish_options（新規）：求側の選択肢（1 listing につき 1〜5 件）
--
-- 制約:
-- - 譲側：全 have_ids が同 group + 同 goods_type（trigger 検証）
-- - 求側：各選択肢内も同 group + 同 goods_type（is_cash_offer=true は例外で wish_ids 空 OK）
-- - 1 listing あたり最大 5 選択肢
-- - 選択肢ごとに exchange_type（同種/異種/同異種）と is_cash_offer フラグ
--
-- データ移行：dev のみ運用前なので listings は delete してリセット

-- 0. 既存データ削除
delete from public.listings;

-- 1. 旧 trigger 削除
drop trigger if exists trg_validate_listing_refs on public.listings;

-- 2. listings から wish 関連カラム削除
alter table public.listings
  drop column if exists wish_ids,
  drop column if exists wish_qtys,
  drop column if exists wish_logic;

-- 旧 OR×OR ガード制約も削除（新スキーマでは選択肢ごとに別 trigger で検証）
alter table public.listings
  drop constraint if exists listings_no_or_or_multi,
  drop constraint if exists listings_wish_lengths_match;

-- 3. listings に譲の代表 group/goods_type 追加
alter table public.listings
  add column have_group_id uuid references public.groups_master(id),
  add column have_goods_type_id uuid references public.goods_types_master(id);

-- 4. 譲側 trigger（同 group + 同 goods_type 制約 + 自動算出）
create or replace function public.validate_listing_haves()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ref_user uuid;
  ref_kind text;
  ref_group uuid;
  ref_type uuid;
  hid uuid;
  q integer;
  i integer;
  first_group uuid;
  first_type uuid;
begin
  -- have_ids: 必須・全件検証 + qty >= 1 + 同 group + 同 goods_type
  if new.have_ids is null or array_length(new.have_ids, 1) is null then
    raise exception 'have_ids must contain at least one item';
  end if;

  for i in 1..array_length(new.have_ids, 1) loop
    hid := new.have_ids[i];
    q := new.have_qtys[i];
    if q is null or q < 1 then
      raise exception 'have_qtys[%] must be >= 1 (got %)', i, q;
    end if;
    select user_id, kind, group_id, goods_type_id
      into ref_user, ref_kind, ref_group, ref_type
      from public.goods_inventory where id = hid;
    if ref_user is null then
      raise exception 'have_ids[%]=% not found', i, hid;
    end if;
    if ref_user <> new.user_id then
      raise exception 'have_ids[%] must belong to listing owner', i;
    end if;
    if ref_kind <> 'for_trade' then
      raise exception 'have_ids[%] must be kind=for_trade', i;
    end if;
    if i = 1 then
      first_group := ref_group;
      first_type := ref_type;
    else
      if ref_group is distinct from first_group then
        raise exception '譲るグッズは全て同じグループでなければなりません（have_ids[%]）', i;
      end if;
      if ref_type is distinct from first_type then
        raise exception '譲るグッズは全て同じ種別でなければなりません（have_ids[%]）', i;
      end if;
    end if;
  end loop;

  -- 自動算出
  new.have_group_id := first_group;
  new.have_goods_type_id := first_type;

  return new;
end;
$$;

create trigger trg_validate_listing_haves
  before insert or update on public.listings
  for each row execute function public.validate_listing_haves();

-- 5. 新規：listing_wish_options
create table public.listing_wish_options (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  position integer not null check (position between 1 and 5),

  -- 選択肢の (group, goods_type) — UI で表示用、定価交換時は null 許容
  wish_group_id uuid references public.groups_master(id),
  wish_goods_type_id uuid references public.goods_types_master(id),

  -- 選択肢内の wish 群（is_cash_offer=true なら空配列）
  wish_ids uuid[] not null default '{}',
  wish_qtys integer[] not null default '{}',
  logic text not null default 'or' check (logic in ('and', 'or')),

  -- 同種/異種/同異種（譲側 (group, goods_type) との関係）
  exchange_type text not null default 'any'
    check (exchange_type in ('same_kind', 'cross_kind', 'any')),

  -- 定価交換フラグ（true なら wish_ids は空、wish_qtys[0] は希望金額として扱う）
  is_cash_offer boolean not null default false,
  cash_amount integer check (cash_amount is null or (cash_amount >= 1 and cash_amount <= 9999999)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listing_wish_options is
  '個別募集 (listings) の求側「選択肢」。1 listing につき 1〜5 件。選択肢間は OR（相手が1つ選ぶ）。';
comment on column public.listing_wish_options.is_cash_offer is
  'true=定価交換選択肢。wish_ids 空、cash_amount に金額';

create index idx_listing_wish_options_listing on public.listing_wish_options(listing_id);
create index idx_listing_wish_options_wish_ids
  on public.listing_wish_options using gin(wish_ids);

create unique index idx_listing_wish_options_listing_position
  on public.listing_wish_options(listing_id, position);

create trigger trg_listing_wish_options_updated_at
  before update on public.listing_wish_options
  for each row execute function public.set_updated_at();

-- 6. listing_wish_options validation trigger
create or replace function public.validate_listing_wish_option()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  parent_user uuid;
  parent_have_logic text;
  ref_user uuid;
  ref_kind text;
  ref_group uuid;
  ref_type uuid;
  wid uuid;
  q integer;
  i integer;
  cnt integer;
  first_group uuid;
  first_type uuid;
begin
  -- 親 listing の user_id / have_logic 取得
  select user_id, have_logic into parent_user, parent_have_logic
    from public.listings where id = new.listing_id;
  if parent_user is null then
    raise exception 'parent listing not found';
  end if;

  if new.is_cash_offer then
    -- 定価交換選択肢：wish_ids/qtys は空、cash_amount 必須
    if array_length(new.wish_ids, 1) is not null then
      raise exception '定価交換選択肢では wish_ids は空にしてください';
    end if;
    if new.cash_amount is null then
      raise exception '定価交換選択肢では cash_amount（金額）が必須です';
    end if;
    -- group/goods_type は無視可
  else
    -- 通常選択肢
    if new.cash_amount is not null then
      raise exception 'cash_amount は定価交換選択肢でのみ設定可能です';
    end if;
    if new.wish_ids is null or array_length(new.wish_ids, 1) is null then
      raise exception 'wish_ids must contain at least one item';
    end if;
    if array_length(new.wish_ids, 1) <> array_length(new.wish_qtys, 1) then
      raise exception 'wish_ids と wish_qtys の長さが一致しません';
    end if;

    for i in 1..array_length(new.wish_ids, 1) loop
      wid := new.wish_ids[i];
      q := new.wish_qtys[i];
      if q is null or q < 1 then
        raise exception 'wish_qtys[%] must be >= 1 (got %)', i, q;
      end if;
      select user_id, kind, group_id, goods_type_id
        into ref_user, ref_kind, ref_group, ref_type
        from public.goods_inventory where id = wid;
      if ref_user is null then
        raise exception 'wish_ids[%] not found', i;
      end if;
      if ref_user <> parent_user then
        raise exception 'wish_ids[%] must belong to listing owner', i;
      end if;
      if ref_kind <> 'wanted' then
        raise exception 'wish_ids[%] must be kind=wanted', i;
      end if;
      if i = 1 then
        first_group := ref_group;
        first_type := ref_type;
      else
        if ref_group is distinct from first_group then
          raise exception '選択肢内の wish は全て同じグループでなければなりません';
        end if;
        if ref_type is distinct from first_type then
          raise exception '選択肢内の wish は全て同じ種別でなければなりません';
        end if;
      end if;
    end loop;

    -- 選択肢内 OR×OR ガード（譲 OR & このオプション OR で両側 ≥2 アイテム）
    if parent_have_logic = 'or'
       and new.logic = 'or'
       and (select array_length(have_ids, 1) from public.listings where id = new.listing_id) > 1
       and array_length(new.wish_ids, 1) > 1 then
      raise exception '譲側 OR × 求側選択肢 OR × 両側 ≥2 アイテムは曖昧なため指定できません';
    end if;

    -- group/goods_type を自動算出
    new.wish_group_id := first_group;
    new.wish_goods_type_id := first_type;
  end if;

  -- 1 listing あたり最大 5 選択肢
  select count(*) into cnt from public.listing_wish_options
    where listing_id = new.listing_id
      and (TG_OP = 'INSERT' or id <> new.id);
  if cnt >= 5 then
    raise exception '1 listing につき選択肢は最大 5 件までです';
  end if;

  return new;
end;
$$;

create trigger trg_validate_listing_wish_option
  before insert or update on public.listing_wish_options
  for each row execute function public.validate_listing_wish_option();

-- 7. RLS
alter table public.listing_wish_options enable row level security;

-- 自分の listing 経由のオプションは全件管理可
create policy "Users manage own listing_wish_options"
  on public.listing_wish_options for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_wish_options.listing_id
        and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_wish_options.listing_id
        and l.user_id = auth.uid()
    )
  );

-- 他人の active な listing 経由のオプションも閲覧可能（マッチング用）
create policy "Anyone can read active listing_wish_options"
  on public.listing_wish_options for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_wish_options.listing_id
        and l.status = 'active'
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
