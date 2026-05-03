import { redirect } from "next/navigation";

/**
 * iter91: 旧 /proposals 一覧は /transactions に統合済（情報設計の整合性）。
 *
 * - 打診中・進行中・過去取引の一覧 → /transactions の 3 タブで完結
 * - 受信打診で初応答が必要なものは TransactionsView の打診中タブに NEW バッジ表示
 * - 受信側の初応答画面 (/proposals/[id]) は唯一の用途として残置
 *
 * 旧 URL を直打ちで来たユーザーは /transactions に redirect。
 */
export default function ProposalsListRedirect() {
  redirect("/transactions");
}
