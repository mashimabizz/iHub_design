"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_EXCHANGE = ["same_kind", "cross_kind", "any"] as const;
const VALID_STATUS = ["active", "paused", "matched", "closed"] as const;

export type ListingExchangeType = "same_kind" | "cross_kind" | "any";
export type ListingStatus = "active" | "paused" | "matched" | "closed";

/**
 * 個別募集を作成。
 * inventory_id (kind=for_trade) と wish_ids[] (kind=wanted) は同 user のもの。
 * trigger でも検証されるが、サーバー側でも事前チェック。
 */
export async function createListing(input: {
  inventoryId: string;
  wishIds: string[];
  exchangeType?: ListingExchangeType;
  ratioGive: number;
  ratioReceive: number;
  note?: string;
}): Promise<ActionResult> {
  const exchangeType = input.exchangeType ?? "any";
  if (!VALID_EXCHANGE.includes(exchangeType)) {
    return { error: "交換タイプが不正です" };
  }
  if (input.ratioGive < 1 || input.ratioGive > 10) {
    return { error: "譲の比率は 1〜10 で指定してください" };
  }
  if (input.ratioReceive < 1 || input.ratioReceive > 10) {
    return { error: "受の比率は 1〜10 で指定してください" };
  }
  if (!input.wishIds || input.wishIds.length === 0) {
    return { error: "求める wish を 1 件以上選択してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("listings").insert({
    user_id: user.id,
    inventory_id: input.inventoryId,
    wish_ids: input.wishIds,
    exchange_type: exchangeType,
    ratio_give: input.ratioGive,
    ratio_receive: input.ratioReceive,
    note: input.note?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/listings");
  return undefined;
}

export async function updateListing(input: {
  id: string;
  wishIds?: string[];
  exchangeType?: ListingExchangeType;
  ratioGive?: number;
  ratioReceive?: number;
  status?: ListingStatus;
  note?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updateFields: Record<string, unknown> = {};
  if (input.wishIds !== undefined) {
    if (input.wishIds.length === 0)
      return { error: "wish を 1 件以上選択してください" };
    updateFields.wish_ids = input.wishIds;
  }
  if (input.exchangeType) {
    if (!VALID_EXCHANGE.includes(input.exchangeType))
      return { error: "交換タイプが不正です" };
    updateFields.exchange_type = input.exchangeType;
  }
  if (input.ratioGive !== undefined) {
    if (input.ratioGive < 1 || input.ratioGive > 10)
      return { error: "譲の比率は 1〜10" };
    updateFields.ratio_give = input.ratioGive;
  }
  if (input.ratioReceive !== undefined) {
    if (input.ratioReceive < 1 || input.ratioReceive > 10)
      return { error: "受の比率は 1〜10" };
    updateFields.ratio_receive = input.ratioReceive;
  }
  if (input.status) {
    if (!VALID_STATUS.includes(input.status))
      return { error: "ステータス値が不正です" };
    updateFields.status = input.status;
  }
  if (input.note !== undefined)
    updateFields.note = input.note.trim() || null;

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
