"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; disputeId?: string } | undefined;

const VALID_CATEGORIES = [
  "short",
  "wrong",
  "noshow",
  "cancel",
  "other",
] as const;
type DisputeCategory = (typeof VALID_CATEGORIES)[number];

/**
 * iter79-C: 申告フォーム送信（D-1 + D-2）
 *
 * - 自分（reporter）が proposal の参加者であることを確認
 * - 同一 proposal に open な dispute が既にあれば拒否
 * - dispute レコード作成 + ticket_no 生成 + system message 投稿
 * - status='submitted' で開始（次イテで relations_pending → arbitrating まで遷移）
 */
export async function submitDispute(input: {
  proposalId: string;
  category: DisputeCategory;
  factMemo?: string;
  evidencePhotoStoragePaths: string[];
}): Promise<ActionResult> {
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { error: "カテゴリ値が不正です" };
  }
  if (input.factMemo && input.factMemo.length > 4000) {
    return { error: "事実メモは 4000 文字以内でお願いします" };
  }
  if (input.evidencePhotoStoragePaths.length > 3) {
    return { error: "追加写真は最大 3 枚までです" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // proposal を読み取り、参加者・状態確認
  const { data: prop } = await supabase
    .from("proposals")
    .select("id, sender_id, receiver_id, status")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };

  // 申告できる status：agreed / completed のみ
  if (prop.status !== "agreed" && prop.status !== "completed") {
    return { error: "この取引は申告対象外です（合意済または完了済のみ）" };
  }

  const respondentId =
    prop.sender_id === user.id ? prop.receiver_id : prop.sender_id;

  // 既存の open dispute をチェック（同一 proposal に重複防止）
  const { data: existing } = await supabase
    .from("disputes")
    .select("id, status")
    .eq("proposal_id", input.proposalId)
    .neq("status", "closed")
    .maybeSingle();
  if (existing) {
    return { error: "この取引には既に申告中の事案があります" };
  }

  // 証跡 storage path → signed URL（1 年期限）に変換
  const evidenceUrls: string[] = [];
  for (const path of input.evidencePhotoStoragePaths) {
    const { data: signed, error: signedErr } = await supabase.storage
      .from("chat-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signedErr || !signed) {
      return { error: signedErr?.message ?? "写真URL生成に失敗しました" };
    }
    evidenceUrls.push(signed.signedUrl);
  }

  // 受付番号 DPT-YYMMDD-XXXX（XXXX は 0001〜9999 のシーケンシャル相当 — 簡略化のため timestamp 末尾4桁）
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(Date.now()).slice(-4);
  const ticketNo = `DPT-${yy}${mm}${dd}-${seq}`;

  // 24h SLA 期限
  const respondentDeadline = new Date(
    now.getTime() + 24 * 60 * 60_000,
  ).toISOString();
  const operatorDeadline = new Date(
    now.getTime() + 48 * 60 * 60_000,
  ).toISOString();

  const { data: created, error } = await supabase
    .from("disputes")
    .insert({
      proposal_id: input.proposalId,
      reporter_id: user.id,
      respondent_id: respondentId,
      category: input.category,
      fact_memo: input.factMemo?.trim() || null,
      evidence_photo_urls: evidenceUrls,
      status: "submitted",
      ticket_no: ticketNo,
      respondent_deadline_at: respondentDeadline,
      operator_deadline_at: operatorDeadline,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "申告の作成に失敗しました" };
  }

  // 取引チャットに system message を投稿
  await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "system",
    body: `⚠️ 申告が送信されました（${ticketNo}）— 運営が確認します`,
    meta: { action: "dispute_submitted", dispute_id: created.id },
  });

  revalidatePath(`/transactions/${input.proposalId}`);
  revalidatePath(`/transactions/${input.proposalId}/approve`);
  revalidatePath("/disputes");
  return { disputeId: created.id };
}

/**
 * iter79-C: 申告者または respondent が申告を取り下げ。
 * status='closed' + outcome='cancelled' 扱い。
 */
export async function withdrawDispute(input: {
  id: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, reporter_id, respondent_id, status, proposal_id, ticket_no")
    .eq("id", input.id)
    .maybeSingle();
  if (!dispute) return { error: "申告が見つかりません" };
  if (dispute.reporter_id !== user.id) {
    return { error: "取り下げは申告者のみ可能です" };
  }
  if (dispute.status === "closed") {
    return { error: "既にクローズ済です" };
  }

  const { error } = await supabase
    .from("disputes")
    .update({
      status: "closed",
      outcome: "cancelled",
      closed_at: new Date().toISOString(),
      operator_comment: "申告者により取り下げられました",
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  await supabase.from("messages").insert({
    proposal_id: dispute.proposal_id,
    sender_id: user.id,
    message_type: "system",
    body: `申告 ${dispute.ticket_no} は取り下げられました`,
    meta: { action: "dispute_withdrawn", dispute_id: dispute.id },
  });

  revalidatePath(`/transactions/${dispute.proposal_id}`);
  revalidatePath("/disputes");
  return undefined;
}
