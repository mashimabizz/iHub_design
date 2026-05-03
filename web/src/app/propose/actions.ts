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
 * iter70-C：再打診（条件修正）用 — 既存 proposal を cancelled に。
 *
 * フロー：
 *   1. ユーザーが取引チャットの「条件を変えて再打診」ボタンを押す
 *   2. /propose/[partnerId]?proposalId=...&revise=1 へ遷移
 *   3. プリフィルされたフォームを編集 → 提出 → createProposal で新規 proposal 作成
 *   4. 新規が成功したらこの cancelProposal を呼んで旧 proposal を cancelled に
 *
 * 自分が sender / receiver どちらでもキャンセル可能。
 */
export async function cancelProposal(input: {
  id: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id")
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
    return { error: "この打診はキャンセルできない状態です" };

  const { error } = await supabase
    .from("proposals")
    .update({
      status: "cancelled",
      last_action_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  // system message：再打診のためキャンセル
  await supabase.from("messages").insert({
    proposal_id: input.id,
    sender_id: user.id,
    message_type: "system",
    body: input.reason ?? "条件を変更して再打診したため、この打診はキャンセルされました",
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.id}`);
  revalidatePath(`/transactions/${input.id}`);
  return undefined;
}

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
    .select("status, receiver_id, sender_id")
    .eq("id", input.id)
    .maybeSingle();
  if (!proposal) return { error: "打診が見つかりません" };
  if (proposal.receiver_id !== user.id)
    return { error: "受信者ではありません" };
  if (!["sent", "negotiating"].includes(proposal.status))
    return { error: "この打診はもう応答できません" };

  let newStatus: string;
  if (input.action === "accept") newStatus = "agreed";
  else if (input.action === "reject") newStatus = "rejected";
  else newStatus = "negotiating";

  const updateFields: Record<string, unknown> = {
    status: newStatus,
    last_action_at: new Date().toISOString(),
  };
  if (input.action === "reject" && input.rejectedTemplate)
    updateFields.rejected_template = input.rejectedTemplate;
  if (input.action === "accept") updateFields.agreed_by_receiver = true;

  const { error } = await supabase
    .from("proposals")
    .update(updateFields)
    .eq("id", input.id);

  if (error) return { error: error.message };
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.id}`);
  return undefined;
}
