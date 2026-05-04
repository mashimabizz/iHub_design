import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/home/BottomNav";
import { autoExpireProposals } from "@/lib/expire";
import {
  TransactionsView,
  type TransactionRow,
} from "./TransactionsView";

export const metadata = {
  title: "取引 — iHub",
};

type RawRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  cash_offer: boolean;
  cash_amount: number | null;
  sender_have_ids: string[];
  sender_have_qtys: number[];
  receiver_have_ids: string[];
  receiver_have_qtys: number[];
  meetup_start_at: string | null;
  meetup_end_at: string | null;
  meetup_place_name: string | null;
  expires_at: string | null;
  created_at: string;
  last_action_at: string | null;
  completed_at: string | null;
  message: string | null;
};

type GoodsRow = {
  id: string;
  title: string;
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

/**
 * iter67-E: 取引タブ（モックアップ画像準拠）
 *
 * 3 タブ：
 * - 打診中：proposals.status in (sent, negotiating, agreement_one_side)
 * - 進行中：proposals.status = agreed（C-2 / C-3 段階）※ deals テーブル整備までの暫定
 * - 過去取引：proposals.status in (rejected, expired, cancelled)
 *           ※ 完了取引（deals.status=done）は次イテで合流
 */
export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // iter78-E: 期限切れを自動的に expired に遷移
  await autoExpireProposals(supabase, user.id);

  const { data: rows } = await supabase
    .from("proposals")
    .select(
      `id, sender_id, receiver_id, status, cash_offer, cash_amount,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       meetup_start_at, meetup_end_at, meetup_place_name,
       expires_at, created_at, last_action_at, completed_at, message`,
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .neq("status", "draft")
    .order("last_action_at", { ascending: false });

  const list = (rows as RawRow[]) ?? [];

  // iter76-D: 自分が付けた評価（stars）を proposals に紐づけ
  const completedIds = list
    .filter((r) => r.status === "completed")
    .map((r) => r.id);
  const myEvalByProposalId = new Map<string, number>();
  if (completedIds.length > 0) {
    const { data: evals } = await supabase
      .from("user_evaluations")
      .select("proposal_id, stars")
      .eq("rater_id", user.id)
      .in("proposal_id", completedIds);
    if (evals) {
      for (const e of evals) {
        myEvalByProposalId.set(e.proposal_id as string, e.stars as number);
      }
    }
  }

  // iter79-C: 進行中（open）の dispute を proposal 別に紐づけ
  const openDisputeByProposalId = new Map<
    string,
    { id: string; ticketNo: string }
  >();
  if (list.length > 0) {
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id, proposal_id, ticket_no, status")
      .in(
        "proposal_id",
        list.map((r) => r.id),
      )
      .neq("status", "closed");
    if (disputes) {
      for (const d of disputes) {
        openDisputeByProposalId.set(d.proposal_id as string, {
          id: d.id as string,
          ticketNo: d.ticket_no as string,
        });
      }
    }
  }

  // 相手 user
  const partnerIds = Array.from(
    new Set(
      list.map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id)),
    ),
  );
  // iter122: avatar_url も取得
  let usersById = new Map<
    string,
    { handle: string; displayName: string; avatarUrl: string | null }
  >();
  if (partnerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, handle, display_name, avatar_url")
      .in("id", partnerIds);
    if (users) {
      usersById = new Map(
        users.map((u) => [
          u.id,
          {
            handle: u.handle,
            displayName: u.display_name,
            avatarUrl: (u.avatar_url as string | null) ?? null,
          },
        ]),
      );
    }
  }

  // 全アイテム
  const allInvIds = new Set<string>();
  for (const r of list) {
    for (const id of r.sender_have_ids ?? []) allInvIds.add(id);
    for (const id of r.receiver_have_ids ?? []) allInvIds.add(id);
  }
  const invById = new Map<
    string,
    { label: string; goodsTypeName: string | null }
  >();
  if (allInvIds.size > 0) {
    const { data: invs } = await supabase
      .from("goods_inventory")
      .select(
        "id, title, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .in("id", Array.from(allInvIds));
    if (invs) {
      for (const r of invs as GoodsRow[]) {
        const charName = pickName(r.character);
        const groupName = pickName(r.group);
        invById.set(r.id, {
          label: charName ?? groupName ?? r.title,
          goodsTypeName: pickName(r.goods_type),
        });
      }
    }
  }

  function summarizeItems(ids: string[], qtys: number[]): string {
    if (!ids.length) return "—";
    return ids
      .slice(0, 3)
      .map((id, i) => {
        const inv = invById.get(id);
        const label = inv?.label ?? "?";
        return `${label}×${qtys[i] ?? 1}`;
      })
      .join(" / ");
  }

  const transactions: TransactionRow[] = list.map((r) => {
    const direction = r.sender_id === user.id ? "sent" : "received";
    const partnerId = direction === "sent" ? r.receiver_id : r.sender_id;
    const partner = usersById.get(partnerId);
    const senderItems = summarizeItems(r.sender_have_ids, r.sender_have_qtys);
    const receiverItems = r.cash_offer
      ? `💴 ¥${r.cash_amount?.toLocaleString() ?? "—"}`
      : summarizeItems(r.receiver_have_ids, r.receiver_have_qtys);

    // ユーザー視点：受け取る ↔ 出す
    let myReceive: string;
    let myGive: string;
    if (direction === "sent") {
      myGive = senderItems;
      myReceive = receiverItems;
    } else {
      myGive = receiverItems;
      myReceive = senderItems;
    }

    return {
      id: r.id,
      direction,
      partnerId,
      partnerHandle: partner?.handle ?? "?",
      partnerDisplayName: partner?.displayName ?? "?",
      partnerAvatarUrl: partner?.avatarUrl ?? null,
      status: r.status as TransactionRow["status"],
      cashOffer: r.cash_offer,
      cashAmount: r.cash_amount,
      myGiveSummary: myGive,
      myReceiveSummary: myReceive,
      meetupStartAt: r.meetup_start_at,
      meetupEndAt: r.meetup_end_at,
      meetupPlaceName: r.meetup_place_name,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      lastActionAt: r.last_action_at,
      completedAt: r.completed_at,
      myStars: myEvalByProposalId.get(r.id) ?? null,
      openDispute: openDisputeByProposalId.get(r.id) ?? null,
      messageExcerpt: r.message
        ? r.message.length > 60
          ? `${r.message.slice(0, 60)}…`
          : r.message
        : null,
    };
  });

  return (
    <>
      <main
        className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]"
        style={{
          fontFamily: '"Noto Sans JP", -apple-system, system-ui',
          color: "#3a324a",
        }}
      >
        {/* iter141: ヘッダーをプロフ画面と同じパターンに統一 */}
        <div className="bg-white px-[18px] pb-3 pt-12">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
              取引
            </h1>
          </div>
        </div>

        {/* iter127: TransactionsView 側で sticky + swipe を制御するため、
            ここでは padding/scroll を持たせない */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <TransactionsView transactions={transactions} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
