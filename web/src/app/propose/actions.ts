"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { createNotification } from "@/lib/notify";
import { assertProposalItemsMarketAvailable } from "@/lib/marketAvailability";

type ActionResult = { error?: string; proposalId?: string } | undefined;

type MeetupMode = "today" | "scheduled";
type MeetupCandidateInput = {
  startAt: string;
  endAt: string;
  placeName: string;
  lat: number;
  lng: number;
  mode?: MeetupMode;
};

function normalizeMeetupCandidates(input: {
  meetupStartAt: string;
  meetupEndAt: string;
  meetupPlaceName: string;
  meetupLat: number;
  meetupLng: number;
  meetupCandidates?: MeetupCandidateInput[];
}): { candidates?: Required<MeetupCandidateInput>[]; error?: string } {
  const rawCandidates =
    input.meetupCandidates && input.meetupCandidates.length > 0
      ? input.meetupCandidates
      : [
          {
            startAt: input.meetupStartAt,
            endAt: input.meetupEndAt,
            placeName: input.meetupPlaceName,
            lat: input.meetupLat,
            lng: input.meetupLng,
            mode: "scheduled" as const,
          },
        ];

  if (rawCandidates.length > 3) {
    return { error: "交換できる候補は 3 件までにしてください" };
  }

  const candidates: Required<MeetupCandidateInput>[] = [];
  for (const [index, candidate] of rawCandidates.entries()) {
    const label = `候補${index + 1}`;
    const placeName = candidate.placeName?.trim();
    if (!candidate.startAt || !candidate.endAt || !placeName) {
      return { error: `${label} の交換できる時間と場所を入力してください` };
    }

    const startAt = new Date(candidate.startAt);
    const endAt = new Date(candidate.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return { error: `${label} の時間をもう一度指定してください` };
    }
    if (endAt <= startAt) {
      return { error: `${label} の終了時刻は開始時刻より後にしてください` };
    }
    if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) {
      return { error: `${label} の場所を地図上で選んでください` };
    }

    candidates.push({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      placeName,
      lat: candidate.lat,
      lng: candidate.lng,
      mode: candidate.mode === "today" ? "today" : "scheduled",
    });
  }

  if (candidates.length === 0) {
    return { error: "交換できる候補を 1 件以上設定してください" };
  }

  return { candidates };
}

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
  meetupCandidates?: MeetupCandidateInput[];
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
  const messageBody = input.message.trim();

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

  const meetupValidation = normalizeMeetupCandidates(input);
  if (meetupValidation.error) return { error: meetupValidation.error };
  const meetupCandidates = meetupValidation.candidates ?? [];
  const primaryMeetup = meetupCandidates[0]!;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (user.id === input.receiverId)
    return { error: "自分自身には打診できません" };

  const capacity = await assertProposalItemsMarketAvailable(
    createServiceRoleClient(),
    {
      senderId: user.id,
      receiverId: input.receiverId,
      senderHaveIds: input.senderHaveIds,
      senderHaveQtys: input.senderHaveQtys,
      receiverHaveIds: input.cashOffer ? [] : input.receiverHaveIds,
      receiverHaveQtys: input.cashOffer ? [] : input.receiverHaveQtys,
    },
  );
  if (capacity.error) return capacity;

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
      message: messageBody,
      message_tone: input.messageTone ?? "standard",
      status: "sent",
      // iter74: 打診した側は自分の打診内容にデフォルト合意扱い
      agreed_by_sender: true,
      agreed_by_receiver: false,
      last_action_at: now.toISOString(),
      expires_at: expires.toISOString(),
      meetup_start_at: primaryMeetup.startAt,
      meetup_end_at: primaryMeetup.endAt,
      meetup_place_name: primaryMeetup.placeName,
      meetup_lat: primaryMeetup.lat,
      meetup_lng: primaryMeetup.lng,
      meetup_candidates: meetupCandidates,
      expose_calendar: input.exposeCalendar,
      listing_id: input.listingId ?? null,
      cash_offer: !!input.cashOffer,
      cash_amount: input.cashOffer ? input.cashAmount : null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "送信に失敗しました" };

  // iter92: 受信者に通知
  const { data: senderUser } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  const senderHandle = (senderUser?.handle as string | undefined) ?? "?";
  await createNotification(supabase, {
    userId: input.receiverId,
    kind: "proposal_received",
    title: `@${senderHandle} から打診が届きました`,
    body: messageBody.slice(0, 100) || "打診が届きました",
    linkPath: `/proposals/${data.id}`,
    proposalId: data.id,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  return { proposalId: data.id };
}

/**
 * iter78-E: 打診の期限を +7 日延長。最大 3 回まで。
 *
 * 双方（sender / receiver）どちらでも実行可能。
 * status は sent / negotiating / agreement_one_side のみ対象。
 * agreed や completed では不要。
 *
 * extension_count を increment し、expires_at を新しい期限に更新。
 * system message として「⏰ 期限が延長されました（残 N 日）」を投稿。
 */
const MAX_EXTENSIONS = 3;
const EXTENSION_DAYS = 7;

export async function extendProposal(input: {
  id: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prop } = await supabase
    .from("proposals")
    .select(
      "id, status, sender_id, receiver_id, extension_count, expires_at",
    )
    .eq("id", input.id)
    .maybeSingle();
  if (!prop) return { error: "打診が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (
    !["sent", "negotiating", "agreement_one_side"].includes(prop.status)
  ) {
    return { error: "この打診は延長できない状態です" };
  }
  const currentCount = (prop.extension_count as number) ?? 0;
  if (currentCount >= MAX_EXTENSIONS) {
    return { error: `延長できるのは最大 ${MAX_EXTENSIONS} 回までです` };
  }

  // 現在の expires_at が past の場合は now を起点に、未来なら expires_at を起点に +7 日
  const baseTs = prop.expires_at ? new Date(prop.expires_at).getTime() : 0;
  const nowTs = Date.now();
  const startTs = Math.max(baseTs, nowTs);
  const newExpires = new Date(
    startTs + EXTENSION_DAYS * 24 * 60 * 60_000,
  ).toISOString();

  const { error } = await supabase
    .from("proposals")
    .update({
      expires_at: newExpires,
      extension_count: currentCount + 1,
      last_action_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  // 残日数（端数切り上げ）
  const remainDays = Math.ceil(
    (new Date(newExpires).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  await supabase.from("messages").insert({
    proposal_id: input.id,
    sender_id: user.id,
    message_type: "system",
    body: `⏰ 期限が延長されました（残 ${remainDays}日 ・ 延長 ${currentCount + 1}/${MAX_EXTENSIONS}）`,
    meta: { action: "extend", extended_by: user.id },
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.id}`);
  revalidatePath(`/transactions/${input.id}`);
  revalidatePath("/transactions");
  return { proposalId: input.id };
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
  meetupCandidates?: MeetupCandidateInput[];
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

  const meetupValidation = normalizeMeetupCandidates(input);
  if (meetupValidation.error) return { error: meetupValidation.error };
  const meetupCandidates = meetupValidation.candidates ?? [];
  const primaryMeetup = meetupCandidates[0]!;

  // proposal を update（status は negotiating に戻す）
  // iter74: 修正者は新内容に合意済とみなす、相手は再確認待ち
  const now = new Date();
  const updateFields: Record<string, unknown> = {
    sender_have_ids: newSenderIds,
    sender_have_qtys: newSenderQtys,
    receiver_have_ids: input.cashOffer ? [] : newReceiverIds,
    receiver_have_qtys: input.cashOffer ? [] : newReceiverQtys,
    cash_offer: !!input.cashOffer,
    cash_amount: input.cashOffer ? input.cashAmount : null,
    meetup_start_at: primaryMeetup.startAt,
    meetup_end_at: primaryMeetup.endAt,
    meetup_place_name: primaryMeetup.placeName,
    meetup_lat: primaryMeetup.lat,
    meetup_lng: primaryMeetup.lng,
    meetup_candidates: meetupCandidates,
    status: "agreement_one_side",
    agreed_by_sender: isMeSender,
    agreed_by_receiver: !isMeSender,
    last_action_at: now.toISOString(),
  };
  if (input.message?.trim()) {
    updateFields.message = input.message.trim();
  }

  const capacity = await assertProposalItemsMarketAvailable(
    createServiceRoleClient(),
    {
      senderId: prop.sender_id,
      receiverId: prop.receiver_id,
      senderHaveIds: newSenderIds,
      senderHaveQtys: newSenderQtys,
      receiverHaveIds: input.cashOffer ? [] : newReceiverIds,
      receiverHaveQtys: input.cashOffer ? [] : newReceiverQtys,
      excludeProposalId: input.id,
    },
  );
  if (capacity.error) return capacity;

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

  // iter92: 相手に「打診内容が修正されました」通知
  const counterpartId = isMeSender ? prop.receiver_id : prop.sender_id;
  const { data: meUserRev } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  const meHandleRev = (meUserRev?.handle as string | undefined) ?? "?";
  await createNotification(supabase, {
    userId: counterpartId,
    kind: "proposal_revised",
    title: `@${meHandleRev} が打診内容を修正しました`,
    linkPath: `/transactions/${input.id}`,
    proposalId: input.id,
  });

  revalidatePath(`/transactions/${input.id}`);
  revalidatePath("/transactions");
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
      `status, receiver_id, sender_id, agreed_by_sender, agreed_by_receiver,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys`,
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

  if (input.action === "accept" && updateFields.status === "agreed") {
    const capacity = await assertProposalItemsMarketAvailable(
      createServiceRoleClient(),
      {
        senderId: proposal.sender_id,
        receiverId: proposal.receiver_id,
        senderHaveIds: (proposal.sender_have_ids as string[]) ?? [],
        senderHaveQtys: (proposal.sender_have_qtys as number[]) ?? [],
        receiverHaveIds: (proposal.receiver_have_ids as string[]) ?? [],
        receiverHaveQtys: (proposal.receiver_have_qtys as number[]) ?? [],
        excludeProposalId: input.id,
      },
    );
    if (capacity.error) return capacity;
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
    // iter92: 両者合意になったら相手（=sender）に「合意成立」通知
    if (both) {
      const counterpartId = isReceiver ? proposal.sender_id : proposal.receiver_id;
      const { data: meUser } = await supabase
        .from("users")
        .select("handle")
        .eq("id", user.id)
        .maybeSingle();
      const meHandle = (meUser?.handle as string | undefined) ?? "?";
      await createNotification(supabase, {
        userId: counterpartId,
        kind: "proposal_accepted",
        title: `@${meHandle} が合意しました — 取引を進めましょう`,
        linkPath: `/transactions/${input.id}`,
        proposalId: input.id,
      });
    }
  } else if (input.action === "reject") {
    await supabase.from("messages").insert({
      proposal_id: input.id,
      sender_id: user.id,
      message_type: "system",
      body: "打診が拒否されました",
      meta: { action: "reject" },
    });
    // iter92: 拒否通知（sender 宛て）
    const { data: meUser2 } = await supabase
      .from("users")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    const meHandle2 = (meUser2?.handle as string | undefined) ?? "?";
    await createNotification(supabase, {
      userId: proposal.sender_id,
      kind: "proposal_rejected",
      title: `@${meHandle2} が打診を拒否しました`,
      linkPath: `/transactions/${input.id}`,
      proposalId: input.id,
    });
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.id}`);
  revalidatePath(`/transactions/${input.id}`);
  revalidatePath("/");
  return undefined;
}
