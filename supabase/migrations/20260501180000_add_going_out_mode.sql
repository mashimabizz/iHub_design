-- =====================================================================
-- iter59: 外出モード（is_going_out）追加
-- =====================================================================
-- ユーザーが「自宅」 / 「外出中」を切替。
-- 外出モード ON のとき、goods_inventory.carrying=true のアイテムが
-- マッチング対象になる（マッチングロジックは Phase 0c 後半で実装）。

alter table public.users
  add column is_going_out boolean not null default false;

comment on column public.users.is_going_out is
  '外出モード。true=持参中 carrying のものだけがマッチング対象 / false=自宅・マッチング対象外';

create index idx_users_is_going_out on public.users(is_going_out);

-- =====================================================================
-- 完了
-- =====================================================================
