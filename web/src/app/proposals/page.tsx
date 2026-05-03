import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/home/BottomNav";
import { ProposalsView, type ProposalRow } from "./ProposalsView";

export const metadata = {
  title: "打診 — iHub",
};

type RawRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  match_type: "perfect" | "forward" | "backward";
  message: string | null;
  status: string;
  cash_offer: boolean;
  cash_amount: number | null;
  meetup_start_at: string | null;
  meetup_end_at: string | null;
  meetup_place_name: string | null;
  expires_at: string | null;
  created_at: string;
  last_action_at: string | null;
};

export default async function ProposalsListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 自分が sender or receiver の打診一覧（draft 除外）
  const { data: rows } = await supabase
    .from("proposals")
    .select(
      `id, sender_id, receiver_id, match_type, message, status,
       cash_offer, cash_amount,
       meetup_start_at, meetup_end_at, meetup_place_name,
       expires_at, created_at, last_action_at`,
    )
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .neq("status", "draft")
    .order("last_action_at", { ascending: false });

  const list = (rows as RawRow[]) ?? [];

  // 相手の handle / display_name を bulk fetch
  const partnerIds = Array.from(
    new Set(list.map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id))),
  );
  let usersById = new Map<
    string,
    { handle: string; displayName: string }
  >();
  if (partnerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, handle, display_name")
      .in("id", partnerIds);
    if (users) {
      usersById = new Map(
        users.map((u) => [
          u.id,
          { handle: u.handle, displayName: u.display_name },
        ]),
      );
    }
  }

  const proposals: ProposalRow[] = list.map((r) => {
    const direction = r.sender_id === user.id ? "sent" : "received";
    const partnerId = direction === "sent" ? r.receiver_id : r.sender_id;
    const partner = usersById.get(partnerId);
    return {
      id: r.id,
      direction,
      partnerId,
      partnerHandle: partner?.handle ?? "?",
      partnerDisplayName: partner?.displayName ?? "?",
      matchType: r.match_type,
      messageExcerpt: (r.message ?? "").slice(0, 60),
      status: r.status as ProposalRow["status"],
      cashOffer: r.cash_offer,
      cashAmount: r.cash_amount,
      meetupStartAt: r.meetup_start_at,
      meetupEndAt: r.meetup_end_at,
      meetupPlaceName: r.meetup_place_name,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      lastActionAt: r.last_action_at,
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
        <div className="h-[60px]" />
        <div className="border-b border-[#3a324a0f] bg-white px-[18px] pb-3 pt-3">
          <div className="mx-auto max-w-md">
            <div className="text-[19px] font-extrabold tracking-[0.3px] text-[#3a324a]">
              打診
            </div>
            <div className="mt-[1px] text-[11px] text-[#3a324a8c]">
              受信・送信した打診の一覧
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pt-3">
          <ProposalsView proposals={proposals} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
