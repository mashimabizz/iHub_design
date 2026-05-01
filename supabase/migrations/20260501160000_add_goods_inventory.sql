-- =====================================================================
-- iter59: goods_inventory テーブル追加（在庫管理）
-- =====================================================================
-- ユーザーが所有しているグッズ（譲りたい）と求めているグッズ（受け取りたい）
-- を管理する。譲/求めるは kind カラムで区別。
-- マッチングは「譲（自分） × 受（相手）」と「受（自分） × 譲（相手）」の交差。

-- ---------------------------------------------------------------------
-- 1. goods_inventory テーブル
-- ---------------------------------------------------------------------
create table public.goods_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 譲（出す）/ 受（求める）
  kind text not null check (kind in ('for_trade', 'wanted')),

  -- グッズ情報（マスタ参照）
  group_id uuid references public.groups_master(id) on delete restrict,
  character_id uuid references public.characters_master(id) on delete restrict,
  goods_type_id uuid not null references public.goods_types_master(id) on delete restrict,

  -- ユーザー入力
  title text not null check (length(title) between 1 and 100),
  description text check (description is null or length(description) <= 1000),
  -- 状態（譲のみ）: 未開封/極美/良好/普通/難あり
  condition text check (
    condition is null
    or condition in ('sealed', 'mint', 'good', 'fair', 'poor')
  ),
  quantity integer not null default 1 check (quantity >= 1),
  photo_urls text[] not null default '{}',

  -- ステータス
  status text not null default 'active' check (
    status in ('active', 'archived', 'reserved', 'traded')
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 譲/受いずれもグループは必須（メンバーは任意）
  check (group_id is not null or character_id is not null)
);

create index idx_goods_inventory_user on public.goods_inventory(user_id);
create index idx_goods_inventory_kind on public.goods_inventory(kind);
create index idx_goods_inventory_group on public.goods_inventory(group_id);
create index idx_goods_inventory_character on public.goods_inventory(character_id);
create index idx_goods_inventory_status on public.goods_inventory(status);
create index idx_goods_inventory_kind_status on public.goods_inventory(kind, status);

comment on table public.goods_inventory is 'ユーザーの在庫（譲 for_trade / 求 wanted）';

-- updated_at 自動更新
create trigger trg_goods_inventory_updated_at
  before update on public.goods_inventory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------
alter table public.goods_inventory enable row level security;

-- 全ユーザーが active な在庫を閲覧可（マッチング・公開プロフィール用）
create policy "Anyone can read active inventory" on public.goods_inventory
  for select using (status in ('active', 'reserved'));

-- 自分の在庫は全ステータス参照可
create policy "Users can read their own inventory" on public.goods_inventory
  for select using (auth.uid() = user_id);

-- 自分の在庫のみ作成・更新・削除可
create policy "Users can insert their own inventory" on public.goods_inventory
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own inventory" on public.goods_inventory
  for update using (auth.uid() = user_id);

create policy "Users can delete their own inventory" on public.goods_inventory
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 完了
-- =====================================================================
