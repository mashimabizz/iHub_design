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

/**
 * iter71-D：チャット写真メッセージ送信
 * iter76-A: messageType を追加。"outfit_photo" は合意済み（agreed）専用。
 *
 * Client side で chat-photos バケットに upload し、その path を渡してくる想定。
 */
export async function sendPhotoMessage(input: {
  proposalId: string;
  storagePath: string;
  caption?: string;
  messageType?: "photo" | "outfit_photo";
}): Promise<ActionResult> {
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
  if (!prop) return { error: "打診が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };

  const messageType = input.messageType ?? "photo";
  if (messageType === "outfit_photo" && prop.status !== "agreed") {
    return { error: "服装写真は合意済の取引でのみ共有できます" };
  }

  // 1 年期限の signed URL を作成
  const { data: signed, error: signedErr } = await supabase.storage
    .from("chat-photos")
    .createSignedUrl(input.storagePath, 60 * 60 * 24 * 365);
  if (signedErr || !signed) {
    return { error: signedErr?.message ?? "写真URL生成に失敗しました" };
  }

  const { error } = await supabase.from("messages").insert({
    proposal_id: input.proposalId,
    sender_id: user.id,
    message_type: messageType,
    body:
      input.caption?.trim() ||
      (messageType === "outfit_photo" ? "服装写真を共有しました" : null),
    photo_url: signed.signedUrl,
    meta: { storage_path: input.storagePath },
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
 *
 * iter69-A：承認のタイミングで自分側の在庫処理を実行：
 *   - 自分が譲ったもの → 自分の goods_inventory.quantity を qty 分減算（0 なら status='traded'）
 *   - 自分が受け取ったもの → 自分の goods_inventory に kind='for_trade' + status='keep' で複製挿入
 *   - 自分の wish のうち、受け取った items にマッチするものは quantity 減算
 *   - 両者承認 (status='completed') 時に listing 経由なら listings.status='closed'
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
      `id, status, sender_id, receiver_id,
       approved_by_sender, approved_by_receiver, evidence_photo_url,
       sender_have_ids, sender_have_qtys, receiver_have_ids, receiver_have_qtys,
       listing_id`,
    )
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!prop) return { error: "取引が見つかりません" };
  if (prop.sender_id !== user.id && prop.receiver_id !== user.id)
    return { error: "参加者ではありません" };
  if (prop.status !== "agreed") return { error: "合意済の取引のみ承認できます" };
  if (!prop.evidence_photo_url) return { error: "先に取引証跡を撮影してください" };

  const isMeSender = prop.sender_id === user.id;
  const alreadyApproved = isMeSender
    ? prop.approved_by_sender
    : prop.approved_by_receiver;

  // 既に自分が承認済なら在庫処理はスキップ（重複減算防止）
  if (!alreadyApproved) {
    const myGiveIds: string[] = isMeSender
      ? prop.sender_have_ids ?? []
      : prop.receiver_have_ids ?? [];
    const myGiveQtys: number[] = isMeSender
      ? prop.sender_have_qtys ?? []
      : prop.receiver_have_qtys ?? [];
    const myReceiveIds: string[] = isMeSender
      ? prop.receiver_have_ids ?? []
      : prop.sender_have_ids ?? [];
    const myReceiveQtys: number[] = isMeSender
      ? prop.receiver_have_qtys ?? []
      : prop.sender_have_qtys ?? [];

    // 1. 自分が譲った items：
    //    - 元レコード：quantity 減算（0 なら status='archived'）
    //    - 譲った qty 分の **履歴レコード** を status='traded' で INSERT
    //      → /inventory の「過去に譲った」タブに表示される
    if (myGiveIds.length > 0) {
      const partnerId = isMeSender ? prop.receiver_id : prop.sender_id;
      const { data: partner } = await supabase
        .from("users")
        .select("handle")
        .eq("id", partnerId)
        .maybeSingle();
      const partnerHandle = (partner?.handle as string | undefined) ?? "?";
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const { data: srcGiveItems } = await supabase
        .from("goods_inventory")
        .select(
          "id, group_id, character_id, goods_type_id, title, description, condition, photo_urls, series, hue, quantity",
        )
        .in("id", myGiveIds)
        .eq("user_id", user.id);

      const giveSrcMap = new Map(
        (srcGiveItems ?? []).map((s) => [s.id, s] as const),
      );

      for (let i = 0; i < myGiveIds.length; i++) {
        const giveId = myGiveIds[i];
        const giveQty = myGiveQtys[i] ?? 1;
        const src = giveSrcMap.get(giveId);
        if (!src) continue;

        // 元レコード：quantity 減算
        const remain = Math.max(0, (src.quantity ?? 1) - giveQty);
        const updateFields: Record<string, unknown> = { quantity: remain };
        if (remain === 0) updateFields.status = "archived";
        await supabase
          .from("goods_inventory")
          .update(updateFields)
          .eq("id", giveId)
          .eq("user_id", user.id);

        // 履歴レコード（status='traded'）を INSERT — 「過去に譲った」タブに出る
        await supabase.from("goods_inventory").insert({
          user_id: user.id,
          kind: "for_trade",
          status: "traded",
          group_id: src.group_id,
          character_id: src.character_id,
          goods_type_id: src.goods_type_id,
          title: src.title,
          description: `@${partnerHandle} へ譲渡（${dateStr}）${src.description ? `\n---\n${src.description}` : ""}`,
          condition: src.condition,
          quantity: giveQty,
          photo_urls: src.photo_urls ?? [],
          series: src.series,
          hue: src.hue,
          traded_via_proposal_id: input.proposalId,
          traded_at: new Date().toISOString(),
        });
      }
    }

    // 2. 自分が受け取った items を kind='for_trade' + status='keep' で複製挿入
    if (myReceiveIds.length > 0) {
      const { data: srcItems } = await supabase
        .from("goods_inventory")
        .select(
          "id, group_id, character_id, goods_type_id, title, description, condition, photo_urls, series, hue",
        )
        .in("id", myReceiveIds);
      if (srcItems && srcItems.length > 0) {
        const partnerId = isMeSender ? prop.receiver_id : prop.sender_id;
        const { data: partner } = await supabase
          .from("users")
          .select("handle")
          .eq("id", partnerId)
          .maybeSingle();
        const partnerHandle = (partner?.handle as string | undefined) ?? "?";
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const inserts = srcItems.map((s) => {
          const idx = myReceiveIds.indexOf(s.id);
          const qty = myReceiveQtys[idx] ?? 1;
          return {
            user_id: user.id,
            kind: "for_trade",
            status: "keep", // 自分用キープ（マッチ対象外）
            group_id: s.group_id,
            character_id: s.character_id,
            goods_type_id: s.goods_type_id,
            title: s.title,
            description: `@${partnerHandle} から取引で受け取り（${dateStr}）${s.description ? `\n---\n${s.description}` : ""}`,
            condition: s.condition,
            quantity: qty,
            photo_urls: s.photo_urls ?? [],
            series: s.series,
            hue: s.hue,
            acquired_from_proposal_id: input.proposalId,
            acquired_at: new Date().toISOString(),
          };
        });
        await supabase.from("goods_inventory").insert(inserts);
      }
    }

    // 3. 自分の wish のうち、受け取り items とマッチするものを quantity 減算
    if (myReceiveIds.length > 0) {
      const { data: srcItems } = await supabase
        .from("goods_inventory")
        .select("id, group_id, character_id, goods_type_id")
        .in("id", myReceiveIds);
      if (srcItems) {
        for (let i = 0; i < srcItems.length; i++) {
          const s = srcItems[i];
          const qty = myReceiveQtys[myReceiveIds.indexOf(s.id)] ?? 1;
          // 同 group + 同 character + 同 goods_type の自分の wish (kind='wanted', status='active')
          let q = supabase
            .from("goods_inventory")
            .select("id, quantity")
            .eq("user_id", user.id)
            .eq("kind", "wanted")
            .eq("status", "active")
            .eq("goods_type_id", s.goods_type_id);
          if (s.group_id) q = q.eq("group_id", s.group_id);
          if (s.character_id) q = q.eq("character_id", s.character_id);
          const { data: matches } = await q;
          if (!matches || matches.length === 0) continue;
          // 最初の 1 件を qty 減算
          const target = matches[0];
          const remain = Math.max(0, (target.quantity ?? 1) - qty);
          const updateFields: Record<string, unknown> = { quantity: remain };
          if (remain === 0) updateFields.status = "traded";
          await supabase
            .from("goods_inventory")
            .update(updateFields)
            .eq("id", target.id)
            .eq("user_id", user.id);
        }
      }
    }
  }

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

  // 両者承認時：listing 経由なら listings.status='closed'
  if (both && prop.listing_id) {
    await supabase
      .from("listings")
      .update({ status: "closed" })
      .eq("id", prop.listing_id);
  }

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
  revalidatePath("/inventory");
  revalidatePath("/listings");
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
