-- =====================================================================
-- iter59 fix: goods_inventory をモックアップ B-Inventory に合わせて拡張
-- =====================================================================
-- - status を 'active'/'keep'/'traded'/'reserved'/'archived' に拡張
-- - series（シリーズ名: 「WORLD TOUR」「5th Mini」等）
-- - carrying（携帯モードフラグ・今日持参中）
-- - hue（ItemCard の縞模様カラー・メンバーごとに色分け）

-- 既存の status 制約を更新
alter table public.goods_inventory
  drop constraint goods_inventory_status_check;

alter table public.goods_inventory
  add constraint goods_inventory_status_check check (
    status in ('active', 'keep', 'traded', 'reserved', 'archived')
  );

comment on column public.goods_inventory.status is
  'active=マッチ対象 / keep=自分用キープ（マッチ対象外）/ traded=過去譲渡履歴 / reserved=取引予約中 / archived=非表示';

-- 新規カラム
alter table public.goods_inventory add column series text
  check (series is null or length(series) <= 80);

alter table public.goods_inventory add column carrying boolean not null default false;

alter table public.goods_inventory add column hue integer
  check (hue is null or (hue >= 0 and hue <= 360));

comment on column public.goods_inventory.series is
  'シリーズ・弾名（WORLD TOUR / 5th Mini / 公式 / JAPAN 等）';
comment on column public.goods_inventory.carrying is
  '今日会場に持参中フラグ（携帯モード切替で一斉オンオフ可）';
comment on column public.goods_inventory.hue is
  'ItemCard の縞模様カラー（HSL 色相）。null の場合 group/character ハッシュから自動算出';

create index idx_goods_inventory_carrying on public.goods_inventory(carrying);

-- 既存の active な kind=for_trade レコードがあれば、status は active のままで OK（互換）
-- =====================================================================
-- 完了
-- =====================================================================
