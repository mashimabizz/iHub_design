"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; redirectTo?: string } | undefined;

/**
 * iter68-A: 取引チャット用 server actions
 *
 * 共通：proposal の sender or receiver のみ送信可（RLS でも担保）
 */

export async function sendTextMessage(input: {
  proposalId: string;
  body: string;
}): Promise<ActionResult> {
  const body = input.body.trim();
  if (!body) return { error: "メッセージを入力してください" };
  if (body.length > 2000) return { error: "2000 文字以内で入力してください" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // proposal のステータス確認（agreement_one_side / agreed / negotiating で送信可）
  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "打診が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };

  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "text",
    body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

export async function sendLocationMessage(input: {
  proposalId: string;
  lat: number;
  lng: number;
  label?: string;
}): Promise<ActionResult> {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng))
    return { error: "緯度経度が不正です" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "location",
    location_lat: input.lat,
    location_lng: input.lng,
    location_label: input.label?.trim() || null,
    body: input.label?.trim() || "現在地を共有しました",
  });
  if (error) return { error: error.message };

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

/**
 * 到着ステータスを更新（自分の側のみ）
 * status: 'enroute' | 'arrived' | 'left'
 */
export async function updateArrivalStatus(input: {
  proposalId: string;
  status: "enroute" | "arrived" | "left";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "arrival_status",
    body:
      input.status === "enroute"
        ? "向かっています"
        : input.status === "arrived"
          ? "会場に到着しました"
          : "会場を離れました",
    meta: { status: input.status },
  });
  if (error) return { error: error.message };

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

/* ─── iter68.1: 複数枚証跡対応 ─────────────────────────────── */

/**
 * 撮影した 1 枚を proposal_evidence_photos に追加。
 *
 * iter68.2 注意：撮影 ≠ 承認に分離。
 *   - 撮影は単に「証跡を提出」する行為
 *   - 承認は /approve 画面で明示的に「承認して完了」ボタンを押す
 *   - 両者承認で initially は status='completed' に遷移
 */
export async function addEvidencePhoto(input: {
  proposalId: string;
  photoUrl: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id, evidence_photo_url")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (prop.status !== "agreed")
    return { error: "合意済の取引のみ撮影できます" };

  // 次の position 計算
  const { data: maxRow } = await supabase
    .from("proposal_evidence_photos")
    .select("position")
    .eq("proposal_id", input.proposalId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("proposal_evidence_photos").insert({
    proposal_id: input.proposalId,
    photo_url: input.photoUrl,
    position: nextPos,
    taken_at: new Date().toISOString(),
    taken_by: user.id,
  });
  if (error) return { error: error.message };

  // 互換性：proposals.evidence_photo_url が空なら最初の写真をミラー（旧ロジック向け）
  // iter68.2：撮影 ≠ 承認に分離したので approved_by の自動 true は削除
  const updateFields: Record<string, unknown> = {
    evidence_taken_at: new Date().toISOString(),
    evidence_taken_by: user.id,
  };
  if (!prop.evidence_photo_url) {
    updateFields.evidence_photo_url = input.photoUrl;
  }
  await supabase
    .from("proposals")
    .update(updateFields)
    .eq("id", input.proposalId);

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

/**
 * 撮影者が自分の写真を削除（差し替え時）
 */
export async function removeEvidencePhoto(input: {
  photoId: string;
  proposalId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("proposal_evidence_photos")
    .delete()
    .eq("id", input.photoId)
    .eq("taken_by", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

/**
 * 撮影完了通知：チャットに「✓ 取引証跡が届きました（タップで確認へ）」system message を投稿
 * meta.action='open_approve' でフロントが tap 可能カードとして描画。
 */
export async function notifyEvidenceComplete(input: {
  proposalId: string;
  photoCount: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "system",
    body: `✓ 取引証跡が届きました（${input.photoCount}枚）`,
    meta: { action: "open_approve" },
  });

  revalidatePath(`/transactions/${input.proposalId}`);
  return { redirectTo: `/transactions/${input.proposalId}` };
}

/* ─── iter68-D/E/F: 取引証跡 / 双方承認 / 評価 ─────────────── */

/**
 * 撮影した取引証跡を Storage upload → proposal.evidence_photo_url を更新
 * Client side で upload してから photo_url を渡してくる想定
 */
export async function setEvidencePhoto(input: {
  proposalId: string;
  photoUrl: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id, evidence_photo_url")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (prop.status !== "agreed")
    return { error: "合意済の取引のみ撮影できます" };

  const { error } = await supabase
    .from("proposals")
    .update({
      evidence_photo_url: input.photoUrl,
      evidence_taken_at: new Date().toISOString(),
      evidence_taken_by: user.id,
      // 撮影者本人は自動承認
      ...(prop.sender_id === user.id
        ? { approved_by_sender: true }
        : { approved_by_receiver: true }),
    })
    .eq("id", input.proposalId);

  if (error) return { error: error.message };
  revalidatePath(`/transactions/${input.proposalId}`);
  return { redirectTo: `/transactions/${input.proposalId}/approve` };
}

/**
 * 双方承認：自分の approve フラグを true に。両方 true なら status='completed' + completed_at
 */
export async function approveCompletion(input: {
  proposalId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select(
      "status, sender_id, receiver_id, approved_by_sender, approved_by_receiver, evidence_photo_url",
    )
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (prop.status !== "agreed") return { error: "合意済の取引のみ承認できます" };
  if (!prop.evidence_photo_url) return { error: "先に取引証跡を撮影してください" };

  const isMeSender = prop.sender_id === user.id;
  const newSender = isMeSender ? true : prop.approved_by_sender;
  const newReceiver = isMeSender ? prop.approved_by_receiver : true;
  const both = newSender && newReceiver;

  const { error } = await supabase
    .from("proposals")
    .update({
      approved_by_sender: newSender,
      approved_by_receiver: newReceiver,
      ...(both
        ? {
            status: "completed",
            completed_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq("id", input.proposalId);

  if (error) return { error: error.message };

  // system message：承認 / 完了
  await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "system",
    body: both
      ? "両者が承認しました。取引完了 ✓"
      : "あなたが承認しました（相手の承認待ち）",
  });

  revalidatePath(`/transactions/${input.proposalId}`);
  return both
    ? { redirectTo: `/transactions/${input.proposalId}/rate` }
    : undefined;
}

/**
 * 「相違あり」フラグ：今は dispute へのプレースホルダー（次イテで本実装）
 */
export async function flagDispute(input: {
  proposalId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // system message として記録
  await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: "system",
    body: "相違あり：取引内容に問題があると報告されました（dispute フローは次イテで実装予定）",
  });

  revalidatePath(`/transactions/${input.proposalId}`);
  return undefined;
}

/**
 * 評価送信：1 取引につき 1 件まで（DB unique 制約）
 */
export async function submitEvaluation(input: {
  proposalId: string;
  stars: number;
  comment?: string;
}): Promise<ActionResult> {
  if (input.stars < 1 || input.stars > 5)
    return { error: "評価は 1〜5 で指定してください" };
  if (input.comment && input.comment.length > 1000)
    return { error: "コメントは 1000 文字以内でお願いします" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (prop.status !== "completed")
    return { error: "完了した取引のみ評価できます" };

  const rateeId =
    prop.sender_id === user.id ? prop.receiver_id : prop.sender_id;

  const { error } = await supabase.from("user_evaluations").insert({
    proposal_id: input.proposalId,
    rater_id: user.id,
    ratee_id: rateeId,
    stars: input.stars,
    comment: input.comment?.trim() || null,
  });
  if (error) {
    // unique violation = 既に評価済
    if (error.code === "23505") return { error: "既に評価済みです" };
    return { error: error.message };
  }

  revalidatePath(`/transactions/${input.proposalId}`);
  revalidatePath(`/transactions`);
  return { redirectTo: "/transactions" };
}
