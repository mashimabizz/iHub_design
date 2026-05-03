-- =====================================================================
-- iter67.7: proposals に定価交換 (cash_offer) サポート追加
-- =====================================================================
-- 仕様：
--   個別募集の選択肢に「定価交換」(is_cash_offer=true, cash_amount) があり、
--   そこから「この選択肢で打診」を押した場合、receiver 側のアイテム選択は
--   不要で、金額だけを送る形の打診になる。
--
-- 列追加：
--   proposals.cash_offer  boolean default false
--   proposals.cash_amount integer nullable (1〜9,999,999)
--
-- 制約：
--   cash_offer=true なら：receiver_have_ids が空 + cash_amount 必須
--   cash_offer=false なら：cash_amount は null

alter table public.proposals
  add column cash_offer boolean not null default false,
  add column cash_amount integer
    check (cash_amount is null or (cash_amount >= 1 and cash_amount <= 9999999));

-- cash_offer 制約：
--   cash_offer=true ⇒ cash_amount 必須 + receiver_have_ids 空
--   cash_offer=false ⇒ cash_amount null + receiver_have_ids ≥ 1
alter table public.proposals
  add constraint proposals_cash_offer_consistency
  check (
    (cash_offer = true
      and cash_amount is not null
      and (array_length(receiver_have_ids, 1) is null
           or array_length(receiver_have_ids, 1) = 0))
    or
    (cash_offer = false
      and cash_amount is null
      and array_length(receiver_have_ids, 1) >= 1)
  );

-- =====================================================================
-- 完了
-- =====================================================================
