import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RateView, type RateData, type WishProgress } from "./RateView";

export const metadata = {
  title: "取引完了 — iHub",
};

type Row = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  receiver_have_ids: string[];
  receiver_have_qtys: number[];
  sender_have_ids: string[];
  sender_have_qtys: number[];
};

type GoodsRow = {
  id: string;
  title: string;
  group_id: string | null;
  character_id: string | null;
  goods_type_id: string | null;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

function pickName(
  v: { name: string } | { name: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]?.name ?? null : v.name;
}

export default async function RatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("proposals")
    .select(
      `id, sender_id, receiver_id, status,
       receiver_have_ids, receiver_have_qtys,
       sender_have_ids, sender_have_qtys`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();
  const p = row as Row;
  if (p.sender_id !== user.id && p.receiver_id !== user.id) notFound();
  if (p.status !== "completed") redirect(`/transactions/${id}`);

  // 既に評価済か
  const { data: existing } = await supabase
    .from("user_evaluations")
    .select("id, stars, comment")
    .eq("proposal_id", id)
    .eq("rater_id", user.id)
    .maybeSingle();

  // 相手 user
  const isMeSender = p.sender_id === user.id;
  const partnerId = isMeSender ? p.receiver_id : p.sender_id;
  const { data: partner } = await supabase
    .from("users")
    .select("handle, display_name")
    .eq("id", partnerId)
    .maybeSingle();

  // 私が受け取ったアイテム = 私の wish 進捗の更新源
  const myReceivedIds = isMeSender ? p.receiver_have_ids : p.sender_have_ids;

  // 受け取ったアイテムの character / goods_type 別に進捗集計
  let wishProgress: WishProgress | null = null;
  if (myReceivedIds.length > 0) {
    const { data: invs } = await supabase
      .from("goods_inventory")
      .select(
        "id, title, group_id, character_id, goods_type_id, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .in("id", myReceivedIds);
    const first = (invs as GoodsRow[])?.[0];
    if (first) {
      const charName = pickName(first.character);
      const groupName = pickName(first.group);
      const typeName = pickName(first.goods_type);
      const focusName = charName ?? groupName ?? "推し";

      // 私の wish のうち、同 character + 同 goods_type のもの = total
      // そのうち、completed proposal で受け取り済の数 = acquired
      // ここでは雑に「総数 4・取得 3」のサンプル相当でもいいが、
      // 本実装：
      //   total = 私の wish のうち matching 条件のもの
      //   acquired = 完了済み proposal 経由で受け取った同条件アイテム数（自分の receive 側）
      let total = 0;
      let acquired = 0;
      if (first.character_id && first.goods_type_id) {
        // total: my wish 該当数
        const { count: wishCount } = await supabase
          .from("goods_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "wanted")
          .eq("character_id", first.character_id)
          .eq("goods_type_id", first.goods_type_id);
        total = wishCount ?? 0;

        // acquired: 自分の inventory に同条件の for_trade があるもの
        // （簡略化：今回受け取った 1 件分も含む）
        const { count: invCount } = await supabase
          .from("goods_inventory")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "for_trade")
          .eq("character_id", first.character_id)
          .eq("goods_type_id", first.goods_type_id);
        acquired = invCount ?? 0;
      }

      wishProgress = {
        focusName,
        groupName,
        typeName,
        total: total > 0 ? total : Math.max(acquired + 1, 4), // フォールバック
        acquired,
      };
    }
  }

  const data: RateData = {
    proposalId: p.id,
    partnerHandle: partner?.handle ?? "?",
    partnerDisplayName: partner?.display_name ?? "?",
    alreadyRated: !!existing,
    myStars: existing?.stars ?? null,
    myComment: existing?.comment ?? null,
    wishProgress,
  };

  return <RateView data={data} />;
}
