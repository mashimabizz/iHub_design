-- =====================================================================
-- iter60: wish 属性追加（priority + flex_level + note）
-- =====================================================================
-- goods_inventory.kind='wanted' を wish として扱う。
-- モックアップ hub-screens.jsx の WISHES 構造に対応する属性を追加。

-- 優先度：最優先 / 2 番手 / 妥協 OK
alter table public.goods_inventory
  add column priority text check (
    priority is null or priority in ('top', 'second', 'flexible')
  );

comment on column public.goods_inventory.priority is
  'wish の優先度: top=最優先 / second=2番手 / flexible=妥協OK（譲では NULL）';

-- 柔軟度：状態・条件への寛容度
alter table public.goods_inventory
  add column flex_level text check (
    flex_level is null or flex_level in ('strict', 'normal', 'flexible')
  );

comment on column public.goods_inventory.flex_level is
  'wish の柔軟度: strict=状態こだわる / normal=普通 / flexible=なんでもOK（譲では NULL）';

-- 公開メモ（既存 description は内部メモ、note は相手に見せる短いメモ）
-- 既存の description カラムを wish でも流用するので、ここでは追加しない。

create index idx_goods_inventory_priority on public.goods_inventory(priority);
create index idx_goods_inventory_flex_level on public.goods_inventory(flex_level);

-- =====================================================================
-- 完了
-- =====================================================================
