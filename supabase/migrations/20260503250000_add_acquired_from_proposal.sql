-- =====================================================================
-- iter69-A: 取引完了時の在庫トランザクション処理用カラム追加
-- =====================================================================
-- 仕様: notes/08 §iter69-A
--
-- 取引完了 (proposals.status='completed') 時に、両者の在庫を更新する：
--   - 譲った側：goods_inventory.quantity 減算（0 なら status='traded'）
--   - 受け取った側：goods_inventory に kind=for_trade + status='keep' で
--     複製レコードを INSERT（自分用キープ）
--   - listing 経由の場合：listings.status='closed'
--
-- 受け取り元の proposal を辿れるよう、acquired_from_proposal_id と
-- acquired_at を追加する。

alter table public.goods_inventory
  add column if not exists acquired_from_proposal_id uuid
    references public.proposals(id) on delete set null,
  add column if not exists acquired_at timestamptz;

comment on column public.goods_inventory.acquired_from_proposal_id is
  '取引完了で他ユーザーから受け取った場合、その元 proposal の id（履歴トレース用）';
comment on column public.goods_inventory.acquired_at is
  '取引完了で受け取った日時（receive 側のキープにのみ入る）';

create index if not exists idx_goods_inventory_acquired_proposal
  on public.goods_inventory(acquired_from_proposal_id);

-- =====================================================================
-- 完了
-- =====================================================================
