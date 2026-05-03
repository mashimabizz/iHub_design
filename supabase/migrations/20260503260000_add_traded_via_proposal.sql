-- =====================================================================
-- iter70-A: 譲った履歴の trace 用カラム追加
-- =====================================================================
-- iter69-A では「受け取った」側のみ acquired_from_proposal_id を持っていた。
-- ユーザー要望：自分が譲った分も /inventory の「過去に譲った」タブに
-- 履歴レコードとして残してほしい。
--
-- 実装：approveCompletion で譲り側の qty 分の履歴レコードを INSERT。
--   - kind='for_trade' / status='traded' / quantity=譲った数 / traded_via_proposal_id
-- 元の在庫レコードは quantity を減算（0 になったら status='archived'）。

alter table public.goods_inventory
  add column if not exists traded_via_proposal_id uuid
    references public.proposals(id) on delete set null,
  add column if not exists traded_at timestamptz;

comment on column public.goods_inventory.traded_via_proposal_id is
  '取引完了で他ユーザーへ譲った場合の履歴レコード（status=traded）が指す元 proposal';
comment on column public.goods_inventory.traded_at is
  '取引完了で譲った日時（give 側の履歴レコードにのみ入る）';

create index if not exists idx_goods_inventory_traded_proposal
  on public.goods_inventory(traded_via_proposal_id);

-- =====================================================================
-- 完了
-- =====================================================================
