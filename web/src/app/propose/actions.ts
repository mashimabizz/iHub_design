"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; proposalId?: string } | undefined;

export async function createProposal(input: {
  receiverId: string;
  matchType: "perfect" | "forward" | "backward";
  senderHaveIds: string[];
  senderHaveQtys: number[];
  receiverHaveIds: string[];
  receiverHaveQtys: number[];
  message: string;
  messageTone?: "standard" | "casual" | "polite";
  /** 待ち合わせ：時間帯 + 地図座標（iter67.1 統一フォーム） */
  meetupStartAt: string; // ISO
  meetupEndAt: string; // ISO
  meetupPlaceName: string;
  meetupLat: number;
  meetupLng: number;
  exposeCalendar: boolean;
  listingId?: string | null;
  /** iter67.7：定価交換打診（receiverHaveIds は空で OK、金額のみ送信） */
  cashOffer?: boolean;
  cashAmount?: number | null;
}): Promise<ActionResult> {
  if (!input.receiverId) return { error: "受信者が不明です" };
  if (input.senderHaveIds.length === 0)
    return { error: "あなたが出すアイテムを選んでください" };
  if (input.senderHaveIds.length !== input.senderHaveQtys.length)
    return { error: "数量配列の長さが不一致" };
  if (!input.message.trim()) return { error: "メッセージを入力してください" };

  // cash_offer 分岐：通常打診 vs 定価交換打診
  if (input.cashOffer) {
    if (
      !input.cashAmount ||
      input.cashAmount < 1 ||
      input.cashAmount > 9999999
    ) {
      return { error: "定価交換の金額を 1〜9,999,999 で指定してください" };
    }
    if (input.receiverHaveIds.length > 0) {
      return {
        error: "定価交換打診では「受け取るアイテム」を空にしてください",
      };
    }
  } else {
    if (input.receiverHaveIds.length === 0)
      return { error: "受け取るアイテムを選んでください" };
    if (input.receiverHaveIds.length !== input.receiverHaveQtys.length)
      return { error: "数量配列の長さが不一致" };
  }

  // 待ち合わせバリデーション
  if (
    !input.meetupStartAt ||
    !input.meetupEndAt ||
    !input.meetupPlaceName?.trim()
  ) {
    return { error: "待ち合わせの時間帯と場所を入力してください" };
  }
  if (new Date(input.meetupEndAt) <= new Date(input.meetupStartAt)) {
    return { error: "終了時刻は開始時刻より後にしてください" };
  }
  if (
    !Number.isFinite(input.meetupLat) ||
    !Number.isFinite(input.meetupLng)
  ) {
    return { error: "地図上で待ち合わせ場所を選んでください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === input.receiverId)
    return { error: "自分自身には打診できません" };

  // last_action_at = now, expires_at = +7 days
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60_000);

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      sender_id: user.id,
      receiver_id: input.receiverId,
      match_type: input.matchType,
      sender_have_ids: input.senderHaveIds,
      sender_have_qtys: input.senderHaveQtys,
      receiver_have_ids: input.cashOffer ? [] : input.receiverHaveIds,
      receiver_have_qtys: input.cashOffer ? [] : input.receiverHaveQtys,
      message: input.message.trim(),
      message_tone: input.messageTone ?? "standard",
      status: "sent",
      last_action_at: now.toISOString(),
      expires_at: expires.toISOString(),
      meetup_start_at: input.meetupStartAt,
      meetup_end_at: input.meetupEndAt,
      meetup_place_name: input.meetupPlaceName.trim(),
      meetup_lat: input.meetupLat,
      meetup_lng: input.meetupLng,
      expose_calendar: input.exposeCalendar,
      listing_id: input.listingId ?? null,
      cash_offer: !!input.cashOffer,
      cash_amount: input.cashOffer ? input.cashAmount : null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "送信に失敗しました" };

  revalidatePath("/");
  revalidatePath("/proposals");
  return { proposalId: data.id };
}

/**
 * iter71-C：再打診（条件修正）— 同じ proposal を update + diff system message。
 *
 * iter70-C 時は「旧 proposal を cancelled + 新規 proposal 作成」だったが、
 * 別チャットになって不便。同じチャットを継続しつつ、修正前後の diff を
 * system message として表示する形に変更。
 *
 * 受信側（receiver）が再打診した場合は、視点を反転して保存する：
 *   - 自分（receiver_id）が出す → sender_have_*（views are flipped at runtime）
 *   ただし、ここでは role 入れ替えは行わず、そのままの ID で保持。
 *   再打診後も sender_id は変わらないが「直近修正者」として
 *   last_action_at と system message で誰の修正かを記録する。
 *
 * status は 'negotiating' に下げ直す（合意フラグもリセット）。
 */
export async function reviseProposal(input: {
  id: string;
  /** 視点：呼び出し側は「自分が出す」「自分が受け取る」で渡す */
  meSenderHaveIds: string[];
  meSenderHaveQtys: number[];
  meReceiverHaveIds: string[];
  meReceiverHaveQtys: number[];
  message?: string;
  meetupStartAt: string;
  meetupEndAt: string;
  meetupPlaceName: string;
  meetupLat: number;
  meetupLng: number;
  cashOffer?: boolean;
  cashAmount?: number | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select(
      `id, status, sender_id, receiver_id,
       sender_have_ids, sender_have_qtys,
       receiver_have_ids, receiver_have_qtys,
       meetup_start_at, meetup_end_at, meetup_place_name, meetup_lat, meetup_lng,
       cash_offer, cash_amount`,
    )
    .eq("id", input.id)
    .maybeSingle();
  if (!prop) return { error: "打診が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (
    !["sent", "negotiating", "agreement_one_side", "agreed"].includes(
      prop.status,
    )
  )
    return { error: "この打診は修正できない状態です" };

  // 修正者の視点を proposal の sender/receiver 視点へ変換
  const isMeSender = prop.sender_id === user.id;
  const newSenderIds = isMeSender
    ? input.meSenderHaveIds
    : input.meReceiverHaveIds;
  const newSenderQtys = isMeSender
    ? input.meSenderHaveQtys
    : input.meReceiverHaveQtys;
  const newReceiverIds = isMeSender
    ? input.meReceiverHaveIds
    : input.meSenderHaveIds;
  const newReceiverQtys = isMeSender
    ? input.meReceiverHaveQtys
    : input.meSenderHaveQtys;

  // proposal を update（status は negotiating に戻す）
  const now = new Date();
  const updateFields: Record<string, unknown> = {
    sender_have_ids: newSenderIds,
    sender_have_qtys: newSenderQtys,
    receiver_have_ids: input.cashOffer ? [] : newReceiverIds,
    receiver_have_qtys: input.cashOffer ? [] : newReceiverQtys,
    cash_offer: !!input.cashOffer,
    cash_amount: input.cashOffer ? input.cashAmount : null,
    meetup_start_at: input.meetupStartAt,
    meetup_end_at: input.meetupEndAt,
    meetup_place_name: input.meetupPlaceName.trim(),
    meetup_lat: input.meetupLat,
    meetup_lng: input.meetupLng,
    status: "negotiating",
    agreed_by_sender: false,
    agreed_by_receiver: false,
    last_action_at: now.toISOString(),
  };
  if (input.message?.trim()) {
    updateFields.message = input.message.trim();
  }
  const { error } = await supabase
    .from("proposals")
    .update(updateFields)
    .eq("id", input.id);
  if (error) return { error: error.message };

  await supabase.from("messages").insert({
    proposal_id: input.id,
    sender_id: user.id,
    message_type: "system",
    body: "打診内容が修正されました",
    meta: { action: "revise", revised_by: user.id },
  });

  revalidatePath(`/transactions/${input.id}`);
  revalidatePath("/proposals");
  return { proposalId: input.id };
}

/**
 * iter73-A: respondToProposal を sender/receiver 両対応に拡張。
 *
 * - accept：sender / receiver どちらでも可能。自分側の agreed_by_* を true にして
 *   両者 true なら status='agreed'、片方なら 'agreement_one_side'。
 *   再打診後に再度合意するケースも考慮（agreed_by_* がリセットされた状態から再合意）。
 * - reject / negotiate：受信者のみ可能（送信者は cancel か revise を使う）。
 */
export async function respondToProposal(input: {
  id: string;
  action: "accept" | "reject" | "negotiate";
  rejectedTemplate?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal } = await supabase
    .from("proposals")
    .select(
      "status, receiver_id, sender_id, agreed_by_sender, agreed_by_receiver",
    )
    .eq("id", input.id)
    .maybeSingle();
  if (!proposal) return { error: "打診が見つかりません" };

  const isSender = proposal.sender_id === user.id;
  const isReceiver = proposal.receiver_id === user.id;
  if (!isSender && !isReceiver) return { error: "参加者ではありません" };

  if ((input.action === "reject" || input.action === "negotiate") && !isReceiver) {
    return { error: "拒否・ネゴは受信者のみ可能です" };
  }

  if (
    !["sent", "negotiating", "agreement_one_side"].includes(proposal.status)
  )
    return { error: "この打診はもう応答できません" };

  const updateFields: Record<string, unknown> = {
    last_action_at: new Date().toISOString(),
  };

  if (input.action === "accept") {
    // 自分側の合意フラグを true に。両者 true なら agreed、片方なら agreement_one_side
    const newAgreedSender = isSender ? true : proposal.agreed_by_sender;
    const newAgreedReceiver = isReceiver ? true : proposal.agreed_by_receiver;
    updateFields.agreed_by_sender = newAgreedSender;
    updateFields.agreed_by_receiver = newAgreedReceiver;
    updateFields.status =
      newAgreedSender && newAgreedReceiver ? "agreed" : "agreement_one_side";
  } else if (input.action === "reject") {
    updateFields.status = "rejected";
    if (input.rejectedTemplate)
      updateFields.rejected_template = input.rejectedTemplate;
  } else {
    updateFields.status = "negotiating";
  }

  const { error } = await supabase
    .from("proposals")
    .update(updateFields)
    .eq("id", input.id);
  if (error) return { error: error.message };

  // accept 時は system message を投稿（両者合意 / 片方合意で文言変える）
  if (input.action === "accept") {
    const both = updateFields.status === "agreed";
    await supabase.from("messages").insert({
      proposal_id: input.id,
      sender_id: user.id,
      message_type: "system",
      body: both
        ? "両者が合意しました。取引を進めましょう ✓"
        : "あなたが合意しました（相手の合意待ち）",
      meta: { action: "agree", agreed_by: user.id },
    });
  } else if (input.action === "reject") {
    await supabase.from("messages").insert({
      proposal_id: input.id,
      sender_id: user.id,
      message_type: "system",
      body: "打診が拒否されました",
      meta: { action: "reject" },
    });
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.id}`);
  revalidatePath(`/transactions/${input.id}`);
  return undefined;
}
