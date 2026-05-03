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
 * iter80-D4: respondent（被申告者）の反論フロー
 *
 * 3 択：
 *   accepted  事実を認める → status='closed' / outcome='cancelled'
 *               同時に proposals.status='cancelled' に
 *   disputed  反論を提出 → status='arbitrating'
 *               respondent_response_text + 追加証跡を保存
 *   silent    今は使わない（24h SLA 経過時に運営側 cron でセット予定）
 */
export async function respondToDispute(input: {
  id: string;
  response: "accepted" | "disputed";
  responseText?: string;
  evidencePhotoStoragePaths?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dispute } = await supabase
    .from("disputes")
    .select(
      "id, proposal_id, reporter_id, respondent_id, status, ticket_no, respondent_response",
    )
    .eq("id", input.id)
    .maybeSingle();
  if (!dispute) return { error: "申告が見つかりません" };
  if (dispute.respondent_id !== user.id) {
    return { error: "回答できるのは被申告者のみです" };
  }
  if (dispute.respondent_response) {
    return { error: "既に回答済みです" };
  }
  if (
    !["submitted", "response_pending"].includes(dispute.status as string)
  ) {
    return { error: "この申告には回答できません" };
  }

  if (input.response === "disputed" && !input.responseText?.trim()) {
    return { error: "反論内容を入力してください" };
  }
  if (
    input.evidencePhotoStoragePaths &&
    input.evidencePhotoStoragePaths.length > 3
  ) {
    return { error: "追加写真は最大 3 枚までです" };
  }

  // 証跡 URL 化
  const evidenceUrls: string[] = [];
  if (input.evidencePhotoStoragePaths) {
    for (const path of input.evidencePhotoStoragePaths) {
      const { data: signed, error: signedErr } = await supabase.storage
        .from("chat-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr || !signed) {
        return { error: signedErr?.message ?? "写真URL生成に失敗しました" };
      }
      evidenceUrls.push(signed.signedUrl);
    }
  }

  const nowIso = new Date().toISOString();

  if (input.response === "accepted") {
    // 即クローズ + proposals.status='cancelled'
    const { error: updErr } = await supabase
      .from("disputes")
      .update({
        respondent_response: "accepted",
        respondent_response_text: input.responseText?.trim() || null,
        respondent_evidence_urls: evidenceUrls,
        respondent_responded_at: nowIso,
        status: "closed",
        outcome: "cancelled",
        closed_at: nowIso,
        operator_comment: "被申告者が事実を認めたため、迅速処理されました",
      })
      .eq("id", input.id);
    if (updErr) return { error: updErr.message };

    // proposal も cancelled に
    await supabase
      .from("proposals")
      .update({ status: "cancelled", last_action_at: nowIso })
      .eq("id", dispute.proposal_id);

    await supabase.from("messages").insert({
      proposal_id: dispute.proposal_id,
      sender_id: user.id,
      message_type: "system",
      body: `✓ 申告 ${dispute.ticket_no} は事実と認められ、取引はキャンセルされました`,
      meta: { action: "dispute_accepted", dispute_id: dispute.id },
    });
  } else {
    // disputed → arbitrating に遷移
    const { error: updErr } = await supabase
      .from("disputes")
      .update({
        respondent_response: "disputed",
        respondent_response_text: input.responseText?.trim() || null,
        respondent_evidence_urls: evidenceUrls,
        respondent_responded_at: nowIso,
        status: "arbitrating",
      })
      .eq("id", input.id);
    if (updErr) return { error: updErr.message };

    await supabase.from("messages").insert({
      proposal_id: dispute.proposal_id,
      sender_id: user.id,
      message_type: "system",
      body: `⚖️ 申告 ${dispute.ticket_no} に反論が提出されました。運営による仲裁が開始されます`,
      meta: { action: "dispute_responded", dispute_id: dispute.id },
    });
  }

  revalidatePath(`/disputes/${input.id}`);
  revalidatePath(`/transactions/${dispute.proposal_id}`);
  revalidatePath("/transactions");
  return { disputeId: input.id };
}

/**
 * iter89-D5d: dispute への追加メッセージ送信（運営からの追加質問への返信、
 * または自発的な追加情報の提供）。
 *
 * 自分が reporter or respondent のときに、自分の役割で送信。
 * 運営側からの operator メッセージは admin panel / service role 経由で挿入される。
 */
export async function sendDisputeMessage(input: {
  disputeId: string;
  body: string;
  evidencePhotoStoragePaths?: string[];
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { error: "本文を入力してください" };
  if (body.length > 4000)
    return { error: "本文は 4000 文字以内でお願いします" };
  if (
    input.evidencePhotoStoragePaths &&
    input.evidencePhotoStoragePaths.length > 3
  ) {
    return { error: "添付写真は最大 3 枚までです" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 役割判定
  const { data: dispute } = await supabase
    .from("disputes")
    .select("id, reporter_id, respondent_id, status")
    .eq("id", input.disputeId)
    .maybeSingle();
  if (!dispute) return { error: "申告が見つかりません" };
  if (dispute.status === "closed")
    return { error: "クローズ済の申告には送信できません" };
  let role: "reporter" | "respondent";
  if (dispute.reporter_id === user.id) role = "reporter";
  else if (dispute.respondent_id === user.id) role = "respondent";
  else return { error: "参加者ではありません" };

  // 写真を signed URL に変換
  const photoUrls: string[] = [];
  if (input.evidencePhotoStoragePaths) {
    for (const path of input.evidencePhotoStoragePaths) {
      const { data: signed, error: signedErr } = await supabase.storage
        .from("chat-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr || !signed) {
        return { error: signedErr?.message ?? "写真URL生成に失敗しました" };
      }
      photoUrls.push(signed.signedUrl);
    }
  }

  const { error } = await supabase.from("dispute_messages").insert({
    dispute_id: input.disputeId,
    sender_id: user.id,
    sender_role: role,
    body,
    photo_urls: photoUrls,
  });
  if (error) return { error: error.message };

  revalidatePath(`/disputes/${input.disputeId}`);
  return { disputeId: input.disputeId };
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
