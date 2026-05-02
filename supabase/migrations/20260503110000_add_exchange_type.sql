-- =====================================================================
-- iter62 (Phase A): exchange_type を goods_inventory に追加
-- =====================================================================
-- 「同種交換 / 異種交換 / どちらでも」の自己申告タグ。
-- システムは判定に使わない（マッチングロジックでは弾かない）。
-- マッチング結果カードに chip 表示し、ユーザー目視で判断する用途。
--
-- 仕様: notes/18_matching_v2_design.md §A-1 / §B-1
-- 注: notes/05 では user_wants.exchange_type と記載しているが、
--     実装は goods_inventory に wish/譲を統合しているため、
--     ここでは goods_inventory に追加する。
--     wish (kind='wanted') と 譲 (kind='for_trade') 両方で使える。
--     譲側では実質的に listings 経由で意味を持つ（iter64）。

alter table public.goods_inventory
  add column if not exists exchange_type text not null default 'any'
    check (exchange_type in ('same_kind', 'cross_kind', 'any'));

comment on column public.goods_inventory.exchange_type is
  '交換タイプの自己申告タグ（same_kind / cross_kind / any）。システム判定なし、UI 表示用。';

-- =====================================================================
-- 完了
-- =====================================================================
