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

  // ─ diff 算出（aggregated id → qty で比較） ─
  function buildMap(ids: string[], qtys: number[]): Map<string, number> {
    const m = new Map<string, number>();
    for (let i = 0; i < ids.length; i++) {
      m.set(ids[i], (m.get(ids[i]) ?? 0) + (qtys[i] ?? 1));
    }
    return m;
  }
  const oldSender = buildMap(
    (prop.sender_have_ids as string[]) ?? [],
    (prop.sender_have_qtys as number[]) ?? [],
  );
  const oldReceiver = buildMap(
    (prop.receiver_have_ids as string[]) ?? [],
    (prop.receiver_have_qtys as number[]) ?? [],
  );
  const newSender = buildMap(newSenderIds, newSenderQtys);
  const newReceiver = buildMap(newReceiverIds, newReceiverQtys);

  function diffSummary(
    oldM: Map<string, number>,
    newM: Map<string, number>,
  ): { added: { id: string; qty: number }[]; removed: { id: string; qty: number }[] } {
    const added: { id: string; qty: number }[] = [];
    const removed: { id: string; qty: number }[] = [];
    const ids = new Set([...oldM.keys(), ...newM.keys()]);
    for (const id of ids) {
      const o = oldM.get(id) ?? 0;
      const n = newM.get(id) ?? 0;
      if (n > o) added.push({ id, qty: n - o });
      if (o > n) removed.push({ id, qty: o - n });
    }
    return { added, removed };
  }
  const senderDiff = diffSummary(oldSender, newSender);
  const receiverDiff = diffSummary(oldReceiver, newReceiver);

  // 商品名解決（diff 表示用）
  const allIds = Array.from(
    new Set(
      [
        ...senderDiff.added,
        ...senderDiff.removed,
        ...receiverDiff.added,
        ...receiverDiff.removed,
      ].map((x) => x.id),
    ),
  );
  const titleById = new Map<string, string>();
  if (allIds.length > 0) {
    const { data: invs } = await supabase
      .from("goods_inventory")
      .select(
        "id, title, character:characters_master(name), group:groups_master(name)",
      )
      .in("id", allIds);
    if (invs) {
      for (const r of invs as {
        id: string;
        title: string;
        character: { name: string } | { name: string }[] | null;
        group: { name: string } | { name: string }[] | null;
      }[]) {
        const ch = Array.isArray(r.character) ? r.character[0] : r.character;
        const gr = Array.isArray(r.group) ? r.group[0] : r.group;
        titleById.set(r.id, ch?.name ?? gr?.name ?? r.title);
      }
    }
  }
  function listText(items: { id: string; qty: number }[]): string {
    if (items.length === 0) return "—";
    return items
      .map((x) => `${titleById.get(x.id) ?? x.id} ×${x.qty}`)
      .join(" / ");
  }

  // 待ち合わせ・cash の差分
  const meetupChanged =
    prop.meetup_start_at !== input.meetupStartAt ||
    prop.meetup_end_at !== input.meetupEndAt ||
    (prop.meetup_place_name ?? "") !== input.meetupPlaceName.trim() ||
    prop.meetup_lat !== input.meetupLat ||
    prop.meetup_lng !== input.meetupLng;
  const cashChanged =
    !!prop.cash_offer !== !!input.cashOffer ||
    (prop.cash_amount ?? null) !== (input.cashAmount ?? null);

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

  // diff 内容を system message に
  const lines: string[] = [];
  lines.push(`✎ 打診内容が修正されました（修正者：あなた以外なら相手）`);
  if (senderDiff.added.length > 0 || senderDiff.removed.length > 0) {
    lines.push(
      `[出すもの] +${listText(senderDiff.added)} / -${listText(senderDiff.removed)}`,
    );
  }
  if (receiverDiff.added.length > 0 || receiverDiff.removed.length > 0) {
    lines.push(
      `[受け取るもの] +${listText(receiverDiff.added)} / -${listText(receiverDiff.removed)}`,
    );
  }
  if (cashChanged) {
    lines.push(
      `[定価交換] ${prop.cash_offer ? `¥${prop.cash_amount?.toLocaleString()}` : "なし"} → ${input.cashOffer ? `¥${input.cashAmount?.toLocaleString()}` : "なし"}`,
    );
  }
  if (meetupChanged) {
    lines.push(
      `[待ち合わせ] ${prop.meetup_place_name ?? "—"} → ${input.meetupPlaceName}`,
    );
  }
  if (input.message?.trim()) {
    lines.push(`💬 「${input.message.trim().slice(0, 80)}${input.message.trim().length > 80 ? "…" : ""}」`);
  }

  await supabase.from("messages").insert({
    proposal_id: input.id,
    sender_id: user.id,
    message_type: "system",
    body: lines.join("\n"),
    meta: { action: "revise", revised_by: user.id },
  });

  revalidatePath(`/transactions/${input.id}`);
  revalidatePath("/proposals");
  return { proposalId: input.id };
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
