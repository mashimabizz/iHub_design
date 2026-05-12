import { supabase } from "./supabase";

type ActionResult = {
  error?: string;
  redirectTo?: string;
};

type ProposalEvidenceRow = {
  id: string;
  status: string;
  sender_id: string;
  receiver_id: string;
  evidence_photo_url: string | null;
};

type ProposalCompletionRow = {
  id: string;
  status: string;
  sender_id: string;
  receiver_id: string;
  approved_by_sender: boolean | null;
  approved_by_receiver: boolean | null;
  evidence_photo_url: string | null;
  sender_have_ids: string[] | null;
  sender_have_qtys: number[] | null;
  receiver_have_ids: string[] | null;
  receiver_have_qtys: number[] | null;
  listing_id: string | null;
};

type InventorySourceRow = {
  id: string;
  group_id: string | null;
  character_id: string | null;
  goods_type_id: string | null;
  title: string | null;
  description: string | null;
  condition: string | null;
  photo_urls: string[] | null;
  series: string | null;
  hue: number | string | null;
  quantity?: number | null;
};

type ListingRow = {
  id: string;
  have_ids: string[] | null;
  have_qtys: number[] | null;
  status: string;
};

export async function uploadEvidenceImage(input: {
  proposalId: string;
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<string> {
  if (!supabase) throw new Error("Supabaseが未設定です");
  const ext = extensionFrom(input.fileName ?? input.uri, input.mimeType);
  const path = `${input.proposalId}/evidence-${Date.now()}.${ext}`;
  const response = await fetch(input.uri);
  const body = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("chat-photos")
    .upload(path, body, {
      contentType: input.mimeType ?? "image/jpeg",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from("chat-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl ?? path;
}

export async function addEvidencePhoto(input: {
  proposalId: string;
  photoUrl: string;
  userId: string;
}): Promise<ActionResult> {
  if (!supabase) return { error: "Supabaseが未設定です" };
  const { data: prop } = await supabase
    .from("proposals")
    .select("id, status, sender_id, receiver_id, evidence_photo_url")
    .eq("id", input.proposalId)
    .maybeSingle();
  const proposal = prop as ProposalEvidenceRow | null;
  if (!proposal) return { error: "取引が見つかりません" };
  if (proposal.sender_id !== input.userId && proposal.receiver_id !== input.userId) {
    return { error: "参加者ではありません" };
  }
  if (proposal.status !== "agreed") {
    return { error: "合意済の取引のみ撮影できます" };
  }

  const { data: maxRow } = await supabase
    .from("proposal_evidence_photos")
    .select("position")
    .eq("proposal_id", input.proposalId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = ((maxRow as { position?: number } | null)?.position ?? 0) + 1;
  const now = new Date().toISOString();

  const { error: insertError } = await supabase
    .from("proposal_evidence_photos")
    .insert({
      proposal_id: input.proposalId,
      photo_url: input.photoUrl,
      position: nextPosition,
      taken_at: now,
      taken_by: input.userId,
    });
  if (insertError) return { error: insertError.message };

  const updateFields: Record<string, unknown> = {
    evidence_taken_at: now,
    evidence_taken_by: input.userId,
  };
  if (!proposal.evidence_photo_url) updateFields.evidence_photo_url = input.photoUrl;
  await supabase.from("proposals").update(updateFields).eq("id", input.proposalId);
  return {};
}

export async function removeEvidencePhoto(input: {
  photoId: string;
  proposalId: string;
  userId: string;
}): Promise<ActionResult> {
  if (!supabase) return { error: "Supabaseが未設定です" };
  const { error } = await supabase
    .from("proposal_evidence_photos")
    .delete()
    .eq("id", input.photoId)
    .eq("taken_by", input.userId);
  if (error) return { error: error.message };

  const { data: rows } = await supabase
    .from("proposal_evidence_photos")
    .select("photo_url")
    .eq("proposal_id", input.proposalId)
    .order("position", { ascending: true })
    .limit(1);
  const first = ((rows as { photo_url: string }[] | null) ?? [])[0];
  await supabase
    .from("proposals")
    .update({ evidence_photo_url: first?.photo_url ?? null })
    .eq("id", input.proposalId);
  return {};
}

export async function notifyEvidenceComplete(input: {
  proposalId: string;
  photoCount: number;
  userId: string;
}): Promise<ActionResult> {
  if (!supabase) return { error: "Supabaseが未設定です" };
  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: input.userId,
    message_type: "system",
    body: `✓ 取引証跡が届きました（${input.photoCount}枚）`,
    meta: { action: "open_approve" },
  });
  if (error) return { error: error.message };
  return { redirectTo: "/transaction-detail" };
}

export async function approveCompletion(input: {
  proposalId: string;
  userId: string;
}): Promise<ActionResult> {
  if (!supabase) return { error: "Supabaseが未設定です" };
  const { data: prop } = await supabase
    .from("proposals")
    .select(
      `id, status, sender_id, receiver_id,
       approved_by_sender, approved_by_receiver, evidence_photo_url,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       listing_id`,
    )
    .eq("id", input.proposalId)
    .maybeSingle();
  const proposal = prop as ProposalCompletionRow | null;
  if (!proposal) return { error: "取引が見つかりません" };
  if (proposal.sender_id !== input.userId && proposal.receiver_id !== input.userId) {
    return { error: "参加者ではありません" };
  }
  if (proposal.status !== "agreed") return { error: "合意済の取引のみ承認できます" };
  if (!proposal.evidence_photo_url) return { error: "先に取引証跡を撮影してください" };

  const isMeSender = proposal.sender_id === input.userId;
  const alreadyApproved = isMeSender
    ? !!proposal.approved_by_sender
    : !!proposal.approved_by_receiver;

  if (!alreadyApproved) {
    await applyInventoryCompletionSideEffects(proposal, input.userId, isMeSender);
  }

  const approvedBySender = isMeSender ? true : !!proposal.approved_by_sender;
  const approvedByReceiver = isMeSender ? !!proposal.approved_by_receiver : true;
  const bothApproved = approvedBySender && approvedByReceiver;

  const { error } = await supabase
    .from("proposals")
    .update({
      approved_by_sender: approvedBySender,
      approved_by_receiver: approvedByReceiver,
      ...(bothApproved
        ? {
            status: "completed",
            completed_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq("id", input.proposalId);
  if (error) return { error: error.message };

  if (bothApproved && proposal.listing_id) {
    await supabase
      .from("listings")
      .update({ status: "closed" })
      .eq("id", proposal.listing_id);
  }

  await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: input.userId,
    message_type: "system",
    body: bothApproved
      ? "両者が承認しました。取引完了 ✓"
      : "あなたが承認しました（相手の承認待ち）",
  });

  return bothApproved
    ? { redirectTo: "/transaction-rate" }
    : {};
}

export async function submitEvaluation(input: {
  proposalId: string;
  userId: string;
  stars: number;
  comment?: string;
}): Promise<ActionResult> {
  if (!supabase) return { error: "Supabaseが未設定です" };
  if (input.stars < 1 || input.stars > 5) {
    return { error: "評価は1〜5で指定してください" };
  }
  if (input.comment && input.comment.length > 1000) {
    return { error: "コメントは1000文字以内でお願いします" };
  }

  const { data: prop } = await supabase
    .from("proposals")
    .select("status, sender_id, receiver_id")
    .eq("id", input.proposalId)
    .maybeSingle();
  const proposal = prop as Pick<
    ProposalCompletionRow,
    "status" | "sender_id" | "receiver_id"
  > | null;
  if (!proposal) return { error: "取引が見つかりません" };
  if (proposal.sender_id !== input.userId && proposal.receiver_id !== input.userId) {
    return { error: "参加者ではありません" };
  }
  if (proposal.status !== "completed") {
    return { error: "完了した取引のみ評価できます" };
  }

  const rateeId = proposal.sender_id === input.userId
    ? proposal.receiver_id
    : proposal.sender_id;
  const { error } = await supabase.from("user_evaluations").insert({
    proposal_id: input.proposalId,
    rater_id: input.userId,
    ratee_id: rateeId,
    stars: input.stars,
    comment: input.comment?.trim() || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "既に評価済みです" };
    return { error: error.message };
  }
  return { redirectTo: "/transactions" };
}

async function applyInventoryCompletionSideEffects(
  proposal: ProposalCompletionRow,
  userId: string,
  isMeSender: boolean,
) {
  if (!supabase) return;
  const myGiveIds = isMeSender
    ? proposal.sender_have_ids ?? []
    : proposal.receiver_have_ids ?? [];
  const myGiveQtys = isMeSender
    ? proposal.sender_have_qtys ?? []
    : proposal.receiver_have_qtys ?? [];
  const myReceiveIds = isMeSender
    ? proposal.receiver_have_ids ?? []
    : proposal.sender_have_ids ?? [];
  const myReceiveQtys = isMeSender
    ? proposal.receiver_have_qtys ?? []
    : proposal.sender_have_qtys ?? [];

  if (myGiveIds.length > 0) {
    const depletedIds: string[] = [];
    const partnerId = isMeSender ? proposal.receiver_id : proposal.sender_id;
    const { data: partner } = await supabase
      .from("users")
      .select("handle")
      .eq("id", partnerId)
      .maybeSingle();
    const partnerHandle = (partner as { handle?: string | null } | null)?.handle ?? "?";
    const dateStr = formatDate(new Date());
    const { data: sourceRows } = await supabase
      .from("goods_inventory")
      .select(
        "id, group_id, character_id, goods_type_id, title, description, condition, photo_urls, series, hue, quantity",
      )
      .in("id", myGiveIds)
      .eq("user_id", userId);
    const sourceMap = new Map(
      ((sourceRows as InventorySourceRow[] | null) ?? []).map((row) => [row.id, row]),
    );

    for (let i = 0; i < myGiveIds.length; i += 1) {
      const giveId = myGiveIds[i];
      const giveQty = myGiveQtys[i] ?? 1;
      const source = sourceMap.get(giveId);
      if (!source) continue;
      const remain = Math.max(0, (source.quantity ?? 1) - giveQty);
      await supabase
        .from("goods_inventory")
        .update({ quantity: remain, ...(remain === 0 ? { status: "archived" } : {}) })
        .eq("id", giveId)
        .eq("user_id", userId);
      if (remain === 0) depletedIds.push(giveId);

      await supabase.from("goods_inventory").insert({
        user_id: userId,
        kind: "for_trade",
        status: "traded",
        group_id: source.group_id,
        character_id: source.character_id,
        goods_type_id: source.goods_type_id,
        title: source.title,
        description: `@${partnerHandle} へ譲渡（${dateStr}）${source.description ? `\n---\n${source.description}` : ""}`,
        condition: source.condition,
        quantity: giveQty,
        photo_urls: source.photo_urls ?? [],
        series: source.series,
        hue: source.hue,
        traded_via_proposal_id: proposal.id,
        traded_at: new Date().toISOString(),
      });
    }
    await removeUnavailableHavesFromListings(userId, depletedIds);
  }

  if (myReceiveIds.length > 0) {
    const { data: sourceRows } = await supabase
      .from("goods_inventory")
      .select(
        "id, group_id, character_id, goods_type_id, title, description, condition, photo_urls, series, hue",
      )
      .in("id", myReceiveIds);
    const sources = (sourceRows as InventorySourceRow[] | null) ?? [];
    if (sources.length > 0) {
      const partnerId = isMeSender ? proposal.receiver_id : proposal.sender_id;
      const { data: partner } = await supabase
        .from("users")
        .select("handle")
        .eq("id", partnerId)
        .maybeSingle();
      const partnerHandle = (partner as { handle?: string | null } | null)?.handle ?? "?";
      const dateStr = formatDate(new Date());
      await supabase.from("goods_inventory").insert(
        sources.map((source) => {
          const qty = myReceiveQtys[myReceiveIds.indexOf(source.id)] ?? 1;
          return {
            user_id: userId,
            kind: "for_trade",
            status: "keep",
            group_id: source.group_id,
            character_id: source.character_id,
            goods_type_id: source.goods_type_id,
            title: source.title,
            description: `@${partnerHandle} から取引で受け取り（${dateStr}）${source.description ? `\n---\n${source.description}` : ""}`,
            condition: source.condition,
            quantity: qty,
            photo_urls: source.photo_urls ?? [],
            series: source.series,
            hue: source.hue,
            acquired_from_proposal_id: proposal.id,
            acquired_at: new Date().toISOString(),
          };
        }),
      );
      await decrementMatchingWishes(userId, sources, myReceiveIds, myReceiveQtys);
    }
  }
}

async function decrementMatchingWishes(
  userId: string,
  receivedItems: InventorySourceRow[],
  receiveIds: string[],
  receiveQtys: number[],
) {
  if (!supabase) return;
  for (const item of receivedItems) {
    const qty = receiveQtys[receiveIds.indexOf(item.id)] ?? 1;
    let query = supabase
      .from("goods_inventory")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("kind", "wanted")
      .eq("status", "active")
      .eq("goods_type_id", item.goods_type_id);
    if (item.group_id) query = query.eq("group_id", item.group_id);
    if (item.character_id) query = query.eq("character_id", item.character_id);
    const { data: matches } = await query;
    const target = ((matches as { id: string; quantity: number | null }[] | null) ?? [])[0];
    if (!target) continue;
    const remain = Math.max(0, (target.quantity ?? 1) - qty);
    await supabase
      .from("goods_inventory")
      .update({ quantity: remain, ...(remain === 0 ? { status: "traded" } : {}) })
      .eq("id", target.id)
      .eq("user_id", userId);
  }
}

async function removeUnavailableHavesFromListings(
  userId: string,
  inventoryIds: string[],
) {
  if (!supabase || inventoryIds.length === 0) return;
  const removeSet = new Set(inventoryIds);
  const { data: rows } = await supabase
    .from("listings")
    .select("id, have_ids, have_qtys, status")
    .eq("user_id", userId)
    .in("status", ["active", "paused"]);

  for (const listing of (rows as ListingRow[] | null) ?? []) {
    const haveIds = listing.have_ids ?? [];
    if (!haveIds.some((id) => removeSet.has(id))) continue;
    const nextIds: string[] = [];
    const nextQtys: number[] = [];
    for (let i = 0; i < haveIds.length; i += 1) {
      const id = haveIds[i];
      if (removeSet.has(id)) continue;
      nextIds.push(id);
      nextQtys.push(listing.have_qtys?.[i] ?? 1);
    }
    if (nextIds.length === 0) {
      await supabase
        .from("listings")
        .update({ status: "closed" })
        .eq("id", listing.id)
        .eq("user_id", userId);
      continue;
    }
    await supabase
      .from("listings")
      .update({ have_ids: nextIds, have_qtys: nextQtys })
      .eq("id", listing.id)
      .eq("user_id", userId);
  }
}

function extensionFrom(nameOrUri: string, mimeType?: string | null) {
  const fromName = nameOrUri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/.test(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (mimeType?.includes("png")) return "png";
  if (mimeType?.includes("heic")) return "heic";
  return "jpg";
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
