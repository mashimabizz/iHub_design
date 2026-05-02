-- =====================================================================
-- iter65.5: listings の wish_id（単数）を wish_ids（複数）に変更
-- =====================================================================
-- ユーザー要望: 個別募集で「求める wish」を複数選択可能にする。
-- 1 譲 × 1 wish の制約は崩し、1 譲 × 複数 wish に拡張。

-- ---------------------------------------------------------------------
-- 1. wish_ids カラム追加
-- ---------------------------------------------------------------------
alter table public.listings
  add column if not exists wish_ids uuid[] not null default '{}';

-- 既存データを wish_id → wish_ids に移行
update public.listings
   set wish_ids = array[wish_id]
 where wish_id is not null
   and (wish_ids is null or array_length(wish_ids, 1) is null);

-- ---------------------------------------------------------------------
-- 2. 旧 wish_id 列を drop
-- ---------------------------------------------------------------------
-- 既存の trigger は wish_id を参照しているので、先に trigger を drop
drop trigger if exists trg_validate_listing_refs on public.listings;

alter table public.listings drop column if exists wish_id;

-- ---------------------------------------------------------------------
-- 3. trigger を再作成（複数 wish_ids 対応）
-- ---------------------------------------------------------------------
create or replace function public.validate_listing_refs()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  inv_user uuid;
  inv_kind text;
  wish_id uuid;
  wish_user uuid;
  wish_kind text;
begin
  -- inventory チェック
  select user_id, kind into inv_user, inv_kind
    from public.goods_inventory where id = new.inventory_id;
  if inv_user is null then
    raise exception 'inventory_id not found';
  end if;
  if inv_user <> new.user_id then
    raise exception 'inventory_id must belong to listing owner (user_id=%)', new.user_id;
  end if;
  if inv_kind <> 'for_trade' then
    raise exception 'inventory_id must be kind=for_trade (got %)', inv_kind;
  end if;

  -- wish_ids: 必須・全件検証
  if new.wish_ids is null or array_length(new.wish_ids, 1) is null
     or array_length(new.wish_ids, 1) < 1 then
    raise exception 'wish_ids must contain at least one wish';
  end if;

  foreach wish_id in array new.wish_ids loop
    select user_id, kind into wish_user, wish_kind
      from public.goods_inventory where id = wish_id;
    if wish_user is null then
      raise exception 'wish_id % not found', wish_id;
    end if;
    if wish_user <> new.user_id then
      raise exception 'wish_id % must belong to listing owner (user_id=%)', wish_id, new.user_id;
    end if;
    if wish_kind <> 'wanted' then
      raise exception 'wish_id % must be kind=wanted (got %)', wish_id, wish_kind;
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_validate_listing_refs
  before insert or update on public.listings
  for each row execute function public.validate_listing_refs();

-- ---------------------------------------------------------------------
-- 4. インデックス（wish_ids GIN）
-- ---------------------------------------------------------------------
create index if not exists idx_listings_wish_ids
  on public.listings using gin(wish_ids);

drop index if exists public.idx_listings_wish;

-- =====================================================================
-- 完了
-- =====================================================================
