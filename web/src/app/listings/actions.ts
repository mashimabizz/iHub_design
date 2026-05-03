"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_STATUS = ["active", "paused", "matched", "closed"] as const;
const VALID_LOGIC = ["and", "or"] as const;
const VALID_EXCHANGE = ["same_kind", "cross_kind", "any"] as const;
const MAX_OPTIONS = 5;

export type ListingStatus = "active" | "paused" | "matched" | "closed";
export type ListingLogic = "and" | "or";
export type ListingExchangeType = "same_kind" | "cross_kind" | "any";

export type ListingOptionInput = {
  position: number;
  wishIds: string[];
  wishQtys: number[];
  logic: ListingLogic;
  exchangeType: ListingExchangeType;
  isCashOffer: boolean;
  cashAmount?: number | null;
};

/**
 * iter67.4：listing を「譲 1 バンドル + 求 N 選択肢」モデルで作成。
 *
 * - 譲側：同 group + 同 goods_type 必須（trigger でも検証）
 * - 求側：1〜5 選択肢、選択肢内も同 group + 同 goods_type
 * - 選択肢間は OR（相手が 1 つ選ぶ）
 * - 定価交換選択肢：is_cash_offer=true、wish_ids 空、cash_amount に金額
 */
export async function createListing(input: {
  haveIds: string[];
  haveQtys: number[];
  haveLogic: ListingLogic;
  options: ListingOptionInput[];
  note?: string;
}): Promise<ActionResult> {
  const v = validate(input);
  if (v) return v;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. listings 本体を INSERT
  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      have_ids: input.haveIds,
      have_qtys: input.haveQtys,
      have_logic: input.haveLogic,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();

  if (listingErr || !listing) {
    return { error: listingErr?.message ?? "個別募集の作成に失敗しました" };
  }

  // 2. 選択肢を bulk INSERT
  const { error: optsErr } = await supabase
    .from("listing_wish_options")
    .insert(
      input.options.map((o) => ({
        listing_id: listing.id,
        position: o.position,
        wish_ids: o.isCashOffer ? [] : o.wishIds,
        wish_qtys: o.isCashOffer ? [] : o.wishQtys,
        logic: o.logic,
        exchange_type: o.exchangeType,
        is_cash_offer: o.isCashOffer,
        cash_amount: o.isCashOffer ? (o.cashAmount ?? null) : null,
      })),
    );

  if (optsErr) {
    // 失敗時は listing 本体も削除（実用上はトランザクションで括りたいが Supabase RPC が必要）
    await supabase.from("listings").delete().eq("id", listing.id);
    return { error: optsErr.message };
  }

  revalidatePath("/listings");
  return undefined;
}

export async function updateListing(input: {
  id: string;
  status?: ListingStatus;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updateFields: Record<string, unknown> = {};
  if (input.status) {
    if (!VALID_STATUS.includes(input.status))
      return { error: "ステータス値が不正です" };
    updateFields.status = input.status;
  }
  if (input.note !== undefined) updateFields.note = input.note.trim() || null;

  if (Object.keys(updateFields).length === 0) return undefined;

  const { error } = await supabase
    .from("listings")
    .update(updateFields)
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/listings");
  return undefined;
}

export async function deleteListing(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/listings");
  return undefined;
}

/* ─── helpers ─────────────────────────────────────── */

function validate(input: {
  haveIds: string[];
  haveQtys: number[];
  haveLogic: ListingLogic;
  options: ListingOptionInput[];
}): { error: string } | undefined {
  if (!VALID_LOGIC.includes(input.haveLogic)) {
    return { error: "譲側の条件タイプ（AND/OR）が不正です" };
  }
  if (!input.haveIds.length) {
    return { error: "譲るグッズを 1 件以上選択してください" };
  }
  if (input.haveIds.length !== input.haveQtys.length) {
    return { error: "譲側の数量配列の長さが一致しません" };
  }
  if (input.haveQtys.some((q) => q < 1 || q > 99)) {
    return { error: "譲側の数量は 1〜99 で指定してください" };
  }

  if (!input.options.length) {
    return { error: "求める選択肢を 1 つ以上追加してください" };
  }
  if (input.options.length > MAX_OPTIONS) {
    return { error: `求める選択肢は最大 ${MAX_OPTIONS} 件です` };
  }

  // position が 1〜N のユニーク連番
  const positions = input.options.map((o) => o.position);
  const expectedSet = new Set(
    Array.from({ length: input.options.length }, (_, i) => i + 1),
  );
  if (
    new Set(positions).size !== positions.length ||
    !positions.every((p) => expectedSet.has(p))
  ) {
    return { error: "選択肢の position が不正です" };
  }

  for (const o of input.options) {
    if (!VALID_LOGIC.includes(o.logic)) {
      return { error: `選択肢 #${o.position} の条件タイプが不正です` };
    }
    if (!VALID_EXCHANGE.includes(o.exchangeType)) {
      return { error: `選択肢 #${o.position} の交換タイプが不正です` };
    }
    if (o.isCashOffer) {
      if (o.cashAmount == null || o.cashAmount < 1 || o.cashAmount > 9999999) {
        return {
          error: `選択肢 #${o.position}：定価交換は金額（1〜9,999,999）が必要です`,
        };
      }
    } else {
      if (!o.wishIds.length) {
        return {
          error: `選択肢 #${o.position}：求める wish を 1 件以上選んでください`,
        };
      }
      if (o.wishIds.length !== o.wishQtys.length) {
        return {
          error: `選択肢 #${o.position}：数量配列の長さが一致しません`,
        };
      }
      if (o.wishQtys.some((q) => q < 1 || q > 99)) {
        return { error: `選択肢 #${o.position}：数量は 1〜99 で指定してください` };
      }
      // OR×OR ガード（譲 OR & このオプション OR で両側 ≥2）
      if (
        input.haveLogic === "or" &&
        o.logic === "or" &&
        input.haveIds.length > 1 &&
        o.wishIds.length > 1
      ) {
        return {
          error: `選択肢 #${o.position}：譲 OR × 求 OR × 両側 ≥2 アイテム は曖昧なため指定できません`,
        };
      }
    }
  }

  return undefined;
}
