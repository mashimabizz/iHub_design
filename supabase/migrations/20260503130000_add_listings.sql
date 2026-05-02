-- =====================================================================
-- iter64 (Phase C): listings 追加（個別募集）
-- =====================================================================
-- 譲 1 件 + wish 1 件 + 比率 + 優先度 + タグ。
-- UI 表記は「個別募集」、"listing" は表に出さない。
-- 仕様: notes/18 §B-2, notes/05 §3, notes/09 §8

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 譲（goods_inventory.kind='for_trade'）
  inventory_id uuid not null references public.goods_inventory(id) on delete cascade,
  -- wish（goods_inventory.kind='wanted'）
  wish_id uuid not null references public.goods_inventory(id) on delete cascade,

  exchange_type text not null default 'any'
    check (exchange_type in ('same_kind', 'cross_kind', 'any')),
  ratio_give integer not null default 1
    check (ratio_give between 1 and 10),
  ratio_receive integer not null default 1
    check (ratio_receive between 1 and 10),
  priority integer not null default 3
    check (priority between 1 and 5),

  status text not null default 'active'
    check (status in ('active', 'paused', 'matched', 'closed')),
  note text check (note is null or length(note) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.listings is
  '個別募集（譲 1 + wish 1 + 比率 + 優先度 + タグのピンポイント募集）';

create index idx_listings_user on public.listings(user_id);
create index idx_listings_inventory on public.listings(inventory_id);
create index idx_listings_wish on public.listings(wish_id);
create index idx_listings_status on public.listings(status);

create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 整合性 trigger:
--   - listings.user_id == inventory.user_id == wish.user_id
--   - inventory は kind='for_trade'
--   - wish は kind='wanted'
-- ---------------------------------------------------------------------
create or replace function public.validate_listing_refs()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  inv_user uuid;
  inv_kind text;
  wish_user uuid;
  wish_kind text;
begin
  select user_id, kind into inv_user, inv_kind
    from public.goods_inventory where id = new.inventory_id;
  select user_id, kind into wish_user, wish_kind
    from public.goods_inventory where id = new.wish_id;

  if inv_user is null or wish_user is null then
    raise exception 'inventory_id or wish_id not found';
  end if;
  if inv_user <> new.user_id or wish_user <> new.user_id then
    raise exception 'inventory_id and wish_id must belong to the listing owner (user_id=%)', new.user_id;
  end if;
  if inv_kind <> 'for_trade' then
    raise exception 'inventory_id must be kind=for_trade (got %)', inv_kind;
  end if;
  if wish_kind <> 'wanted' then
    raise exception 'wish_id must be kind=wanted (got %)', wish_kind;
  end if;

  return new;
end;
$$;

create trigger trg_validate_listing_refs
  before insert or update on public.listings
  for each row execute function public.validate_listing_refs();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.listings enable row level security;

-- 自分の listings は全件可視
create policy "Users manage own listings"
  on public.listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 他人の active な listings は誰でも閲覧可能（マッチングで利用）
create policy "Anyone can read active listings"
  on public.listings for select
  using (status = 'active');

-- =====================================================================
-- 完了
-- =====================================================================
