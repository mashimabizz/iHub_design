-- =====================================================================
-- iter60: flex_level の値をモックアップ準拠に変更
-- =====================================================================
-- 旧: strict / normal / flexible
-- 新: exact（完全一致のみ）/ character_any（キャラ問わず）/ series_any（シリーズ問わず）
-- マッチングロジック設計時の意味と一致させる。

-- 既存データを変換
update public.goods_inventory
   set flex_level = case flex_level
                      when 'strict' then 'exact'
                      when 'normal' then 'character_any'
                      when 'flexible' then 'series_any'
                      else flex_level
                   end
 where flex_level is not null;

-- check 制約を更新
alter table public.goods_inventory
  drop constraint if exists goods_inventory_flex_level_check;

alter table public.goods_inventory
  add constraint goods_inventory_flex_level_check check (
    flex_level is null
    or flex_level in ('exact', 'character_any', 'series_any')
  );

comment on column public.goods_inventory.flex_level is
  'wish のマッチング許容範囲: exact=完全一致のみ / character_any=キャラ問わず / series_any=シリーズ問わず';
