import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { ChatView, type ChatProposal, type ChatMessage } from "./ChatView";

export const metadata = {
  title: "取引チャット — iHub",
};

type ProposalRaw = {
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
  meetup_lat: number | null;
  meetup_lng: number | null;
};

type GoodsRow = {
  id: string;
  title: string;
  photo_urls: string[] | null;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

type MessageRaw = {
  id: string;
  proposal_id: string;
  sender_id: string;
  message_type:
    | "text"
    | "photo"
    | "outfit_photo"
    | "location"
    | "arrival_status"
    | "system";
  body: string | null;
  photo_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function pickName(
  v: { name: string } | { name: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]?.name ?? null : v.name;
}

export default async function TransactionChatPage({
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

  // proposal を fetch
  const { data: proposalRow } = await supabase
    .from("proposals")
    .select(
      `id, sender_id, receiver_id, status, cash_offer, cash_amount,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       meetup_start_at, meetup_end_at, meetup_place_name, meetup_lat, meetup_lng`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!proposalRow) notFound();
  const p = proposalRow as ProposalRaw;
  if (p.sender_id !== user.id && p.receiver_id !== user.id) notFound();

  // 合意済 or ネゴ中 のみチャット可（draft/expired/cancelled は不可）
  if (
    !["agreed", "negotiating", "agreement_one_side"].includes(p.status)
  ) {
    redirect(`/proposals/${id}`);
  }

  const isMeSender = p.sender_id === user.id;
  const partnerId = isMeSender ? p.receiver_id : p.sender_id;

  // 相手 user
  const { data: partner } = await supabase
    .from("users")
    .select("id, handle, display_name, primary_area")
    .eq("id", partnerId)
    .maybeSingle();

  // 提示物アイテム
  const allInvIds = [
    ...p.sender_have_ids,
    ...p.receiver_have_ids,
  ].filter((x, i, a) => a.indexOf(x) === i);
  const invById = new Map<
    string,
    { label: string; goodsTypeName: string | null; photoUrl: string | null }
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
        const charName = pickName(r.character);
        const groupName = pickName(r.group);
        invById.set(r.id, {
          label: charName ?? groupName ?? r.title,
          goodsTypeName: pickName(r.goods_type),
          photoUrl: (r.photo_urls && r.photo_urls[0]) ?? null,
        });
      }
    }
  }

  // ユーザー視点：受け取る ⇄ 出す
  // 自分が sender なら sender_have が「私の譲」、receiver_have が「私が受け取る」
  const myGiveIds = isMeSender ? p.sender_have_ids : p.receiver_have_ids;
  const myGiveQtys = isMeSender ? p.sender_have_qtys : p.receiver_have_qtys;
  const myReceiveIds = isMeSender ? p.receiver_have_ids : p.sender_have_ids;
  const myReceiveQtys = isMeSender
    ? p.receiver_have_qtys
    : p.sender_have_qtys;

  function toItems(ids: string[], qtys: number[]) {
    return ids.map((id, i) => {
      const inv = invById.get(id);
      return {
        id,
        label: inv?.label ?? "?",
        goodsTypeName: inv?.goodsTypeName ?? null,
        photoUrl: inv?.photoUrl ?? null,
        qty: qtys[i] ?? 1,
      };
    });
  }

  const proposal: ChatProposal = {
    id: p.id,
    status: p.status as ChatProposal["status"],
    cashOffer: p.cash_offer,
    cashAmount: p.cash_amount,
    myGiveItems: toItems(myGiveIds, myGiveQtys),
    myReceiveItems: p.cash_offer && !isMeSender
      ? [] // 相手が cash 提案 → 私が金銭を受け取る（このパターンは MVP は通常出ない）
      : toItems(myReceiveIds, myReceiveQtys),
    meetupStartAt: p.meetup_start_at,
    meetupEndAt: p.meetup_end_at,
    meetupPlaceName: p.meetup_place_name,
    meetupLat: p.meetup_lat,
    meetupLng: p.meetup_lng,
    partner: {
      id: partnerId,
      handle: partner?.handle ?? "?",
      displayName: partner?.display_name ?? "?",
      primaryArea: partner?.primary_area ?? null,
    },
    me: {
      id: user.id,
    },
  };

  // メッセージ一覧
  const { data: msgs } = await supabase
    .from("messages")
    .select(
      `id, proposal_id, sender_id, message_type, body, photo_url,
       location_lat, location_lng, location_label, meta, created_at`,
    )
    .eq("proposal_id", id)
    .order("created_at", { ascending: true });

  const messages: ChatMessage[] = ((msgs as MessageRaw[]) ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    isMine: m.sender_id === user.id,
    type: m.message_type,
    body: m.body,
    photoUrl: m.photo_url,
    lat: m.location_lat,
    lng: m.location_lng,
    locationLabel: m.location_label,
    meta: m.meta,
    createdAt: m.created_at,
  }));

  // 双方の到着状態（最新の arrival_status を見る）
  function latestArrival(
    forUserId: string,
  ): "enroute" | "arrived" | "left" | null {
    const last = messages
      .filter((m) => m.type === "arrival_status" && m.senderId === forUserId)
      .pop();
    if (!last) return null;
    const status = (last.meta as { status?: string } | null)?.status;
    if (status === "enroute" || status === "arrived" || status === "left")
      return status;
    return null;
  }

  // 服装写真の最新（双方）
  function latestOutfit(forUserId: string): string | null {
    const last = messages
      .filter((m) => m.type === "outfit_photo" && m.senderId === forUserId)
      .pop();
    return last?.photoUrl ?? null;
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack
        title={`@${proposal.partner.handle}`}
        sub={
          (latestArrival(proposal.partner.id) === "arrived"
            ? "● 会場到着"
            : latestArrival(proposal.partner.id) === "enroute"
              ? "向かっています"
              : "未到着") +
          (proposal.partner.primaryArea
            ? ` ・${proposal.partner.primaryArea}`
            : "")
        }
        backHref="/transactions"
      />
      <ChatView
        proposal={proposal}
        messages={messages}
        myArrival={latestArrival(user.id)}
        partnerArrival={latestArrival(proposal.partner.id)}
        myOutfitPhoto={latestOutfit(user.id)}
        partnerOutfitPhoto={latestOutfit(proposal.partner.id)}
      />
    </main>
  );
}
