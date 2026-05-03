"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

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
