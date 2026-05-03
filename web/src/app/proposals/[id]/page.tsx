import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { ProposalDetailView, type ProposalDetail } from "./ProposalDetailView";

export const metadata = {
  title: "打診詳細 — iHub",
};

type ProposalRaw = {
  id: string;
  sender_id: string;
  receiver_id: string;
  match_type: "perfect" | "forward" | "backward";
  sender_have_ids: string[];
  sender_have_qtys: number[];
  receiver_have_ids: string[];
  receiver_have_qtys: number[];
  message: string | null;
  message_tone: "standard" | "casual" | "polite" | null;
  status: string;
  agreed_by_sender: boolean;
  agreed_by_receiver: boolean;
  rejected_template: string | null;
  meetup_start_at: string | null;
  meetup_end_at: string | null;
  meetup_place_name: string | null;
  meetup_lat: number | null;
  meetup_lng: number | null;
  expose_calendar: boolean;
  cash_offer: boolean;
  cash_amount: number | null;
  listing_id: string | null;
  expires_at: string | null;
  last_action_at: string | null;
  created_at: string;
};

type GoodsRow = {
  id: string;
  title: string;
  photo_urls: string[] | null;
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

export default async function ProposalDetailPage({
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
      `id, sender_id, receiver_id, match_type,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       message, message_tone, status, agreed_by_sender, agreed_by_receiver,
       rejected_template,
       meetup_start_at, meetup_end_at, meetup_place_name, meetup_lat, meetup_lng,
       expose_calendar, cash_offer, cash_amount, listing_id,
       expires_at, last_action_at, created_at`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();
  const p = row as ProposalRaw;

  // 自分が sender or receiver のみアクセス可
  if (p.sender_id !== user.id && p.receiver_id !== user.id) notFound();

  const isReceiver = p.receiver_id === user.id;

  // 相手 user 情報
  const partnerId = isReceiver ? p.sender_id : p.receiver_id;
  const { data: partner } = await supabase
    .from("users")
    .select("id, handle, display_name, primary_area")
    .eq("id", partnerId)
    .maybeSingle();

  // 提示物アイテムの詳細を fetch
  const allInvIds = [
    ...p.sender_have_ids,
    ...p.receiver_have_ids,
  ].filter((x, i, a) => a.indexOf(x) === i);

  let invById = new Map<
    string,
    { title: string; photoUrl: string | null; label: string; groupName: string | null; characterName: string | null; goodsTypeName: string | null }
  >();
  if (allInvIds.length > 0) {
    const { data: invs } = await supabase
      .from("goods_inventory")
      .select(
        "id, title, photo_urls, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .in("id", allInvIds);
    if (invs) {
      for (const r of invs as GoodsRow[]) {
        const groupName = pickName(r.group);
        const charName = pickName(r.character);
        const typeName = pickName(r.goods_type);
        invById.set(r.id, {
          title: r.title,
          photoUrl: (r.photo_urls && r.photo_urls[0]) ?? null,
          label: charName ?? groupName ?? r.title,
          groupName,
          characterName: charName,
          goodsTypeName: typeName,
        });
      }
    }
  }

  function toItems(
    ids: string[],
    qtys: number[],
  ): ProposalDetail["senderItems"] {
    return ids.map((id, i) => {
      const inv = invById.get(id);
      return {
        id,
        label: inv?.label ?? "?",
        title: inv?.title ?? "?",
        photoUrl: inv?.photoUrl ?? null,
        groupName: inv?.groupName ?? null,
        characterName: inv?.characterName ?? null,
        goodsTypeName: inv?.goodsTypeName ?? null,
        qty: qtys[i] ?? 1,
      };
    });
  }

  const detail: ProposalDetail = {
    id: p.id,
    isReceiver,
    isSender: !isReceiver,
    matchType: p.match_type,
    status: p.status as ProposalDetail["status"],
    senderItems: toItems(p.sender_have_ids, p.sender_have_qtys),
    receiverItems: toItems(p.receiver_have_ids, p.receiver_have_qtys),
    message: p.message ?? "",
    messageTone: p.message_tone,
    meetupStartAt: p.meetup_start_at,
    meetupEndAt: p.meetup_end_at,
    meetupPlaceName: p.meetup_place_name,
    meetupLat: p.meetup_lat,
    meetupLng: p.meetup_lng,
    exposeCalendar: p.expose_calendar,
    cashOffer: p.cash_offer,
    cashAmount: p.cash_amount,
    listingId: p.listing_id,
    expiresAt: p.expires_at,
    lastActionAt: p.last_action_at,
    createdAt: p.created_at,
    rejectedTemplate: p.rejected_template,
    partner: {
      id: partnerId,
      handle: partner?.handle ?? "?",
      displayName: partner?.display_name ?? "?",
      primaryArea: partner?.primary_area ?? null,
    },
  };

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack
        title="打診詳細"
        sub={isReceiver ? "受信" : "送信"}
        backHref="/proposals"
      />
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-12 pt-4">
        <ProposalDetailView detail={detail} />
      </div>
    </main>
  );
}
