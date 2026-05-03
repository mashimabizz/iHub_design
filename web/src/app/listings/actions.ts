"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_STATUS = ["active", "paused", "matched", "closed"] as const;
const VALID_LOGIC = ["and", "or"] as const;

export type ListingStatus = "active" | "paused" | "matched" | "closed";
export type ListingLogic = "and" | "or";

/**
 * iter67.3：個別募集を「N×M × AND/OR」マトリクスで作成。
 *
 * - 譲側 (have): 複数のインベントリ + 各数量 + AND/OR
 * - 求側 (wish): 複数のウィッシュ + 各数量 + AND/OR
 * - 「比率」概念は qty に統合（別概念は持たない）
 * - OR × OR 両側 ≥2 アイテム は禁止（曖昧 / 組合せ爆発防止）
 *
 * trigger と DB 制約でも検証されるが、サーバー側でも事前チェック。
 */
export async function createListing(input: {
  haveIds: string[];
  haveQtys: number[];
  haveLogic: ListingLogic;
  wishIds: string[];
  wishQtys: number[];
  wishLogic: ListingLogic;
  note?: string;
}): Promise<ActionResult> {
  const v = validateMatrix(input);
  if (v) return v;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("listings").insert({
    user_id: user.id,
    have_ids: input.haveIds,
    have_qtys: input.haveQtys,
    have_logic: input.haveLogic,
    wish_ids: input.wishIds,
    wish_qtys: input.wishQtys,
    wish_logic: input.wishLogic,
    note: input.note?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/listings");
  return undefined;
}

export async function updateListing(input: {
  id: string;
  haveIds?: string[];
  haveQtys?: number[];
  haveLogic?: ListingLogic;
  wishIds?: string[];
  wishQtys?: number[];
  wishLogic?: ListingLogic;
  status?: ListingStatus;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 全マトリクス更新時は再 validate
  if (
    input.haveIds !== undefined ||
    input.wishIds !== undefined ||
    input.haveLogic !== undefined ||
    input.wishLogic !== undefined
  ) {
    // 部分更新は禁止（マトリクス全体を一括で渡してもらう）
    if (
      !input.haveIds ||
      !input.haveQtys ||
      !input.haveLogic ||
      !input.wishIds ||
      !input.wishQtys ||
      !input.wishLogic
    ) {
      return {
        error:
          "マトリクスを更新する場合は have/wish/logic 全てまとめて指定してください",
      };
    }
    const v = validateMatrix({
      haveIds: input.haveIds,
      haveQtys: input.haveQtys,
      haveLogic: input.haveLogic,
      wishIds: input.wishIds,
      wishQtys: input.wishQtys,
      wishLogic: input.wishLogic,
    });
    if (v) return v;
  }

  const updateFields: Record<string, unknown> = {};
  if (input.haveIds) updateFields.have_ids = input.haveIds;
  if (input.haveQtys) updateFields.have_qtys = input.haveQtys;
  if (input.haveLogic) updateFields.have_logic = input.haveLogic;
  if (input.wishIds) updateFields.wish_ids = input.wishIds;
  if (input.wishQtys) updateFields.wish_qtys = input.wishQtys;
  if (input.wishLogic) updateFields.wish_logic = input.wishLogic;
  if (input.status) {
    if (!VALID_STATUS.includes(input.status))
      return { error: "ステータス値が不正です" };
    updateFields.status = input.status;
  }
  if (input.note !== undefined)
    updateFields.note = input.note.trim() || null;

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

function validateMatrix(input: {
  haveIds: string[];
  haveQtys: number[];
  haveLogic: ListingLogic;
  wishIds: string[];
  wishQtys: number[];
  wishLogic: ListingLogic;
}): { error: string } | undefined {
  if (!VALID_LOGIC.includes(input.haveLogic)) {
    return { error: "譲側の条件タイプ（AND/OR）が不正です" };
  }
  if (!VALID_LOGIC.includes(input.wishLogic)) {
    return { error: "求側の条件タイプ（AND/OR）が不正です" };
  }
  if (!input.haveIds.length) {
    return { error: "譲るグッズを 1 件以上選択してください" };
  }
  if (!input.wishIds.length) {
    return { error: "求める wish を 1 件以上選択してください" };
  }
  if (input.haveIds.length !== input.haveQtys.length) {
    return { error: "譲側の数量配列の長さが一致しません" };
  }
  if (input.wishIds.length !== input.wishQtys.length) {
    return { error: "求側の数量配列の長さが一致しません" };
  }
  if (input.haveQtys.some((q) => q < 1 || q > 99)) {
    return { error: "譲側の数量は 1〜99 で指定してください" };
  }
  if (input.wishQtys.some((q) => q < 1 || q > 99)) {
    return { error: "求側の数量は 1〜99 で指定してください" };
  }
  // OR × OR 両側 ≥2 ガード
  if (
    input.haveLogic === "or" &&
    input.wishLogic === "or" &&
    input.haveIds.length > 1 &&
    input.wishIds.length > 1
  ) {
    return {
      error:
        "譲・求の両側でアイテム複数 × OR 条件 は曖昧なため指定できません。どちらかは AND にするか、片側を 1 件にしてください。",
    };
  }
  return undefined;
}
