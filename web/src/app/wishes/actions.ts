"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_PRIORITIES = ["top", "second", "flexible"] as const;
const VALID_FLEX = ["exact", "character_any", "series_any"] as const;
const VALID_EXCHANGE = ["same_kind", "cross_kind", "any"] as const;

export type WishPriority = "top" | "second" | "flexible";
export type WishFlexLevel = "exact" | "character_any" | "series_any";
export type ExchangeType = "same_kind" | "cross_kind" | "any";

export async function saveWishItem(input: {
  groupId?: string;
  characterId?: string;
  goodsTypeId: string;
  title: string;
  priority: WishPriority;
  flexLevel: WishFlexLevel;
  exchangeType?: ExchangeType; // iter62 / Phase A
  note?: string; // description カラムを使う
  quantity: number;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 100) {
    return { error: "タイトルは 1〜100 文字で入力してください" };
  }
  if (!input.goodsTypeId) {
    return { error: "グッズ種別を選択してください" };
  }
  if (!input.groupId && !input.characterId) {
    return { error: "推しのグループまたはメンバーを選択してください" };
  }
  if (!VALID_PRIORITIES.includes(input.priority)) {
    return { error: "優先度が不正です" };
  }
  if (!VALID_FLEX.includes(input.flexLevel)) {
    return { error: "柔軟度が不正です" };
  }
  const exchangeType = input.exchangeType ?? "any";
  if (!VALID_EXCHANGE.includes(exchangeType)) {
    return { error: "交換タイプが不正です" };
  }
  if (input.quantity < 1 || input.quantity > 999) {
    return { error: "数量は 1〜999 で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("goods_inventory").insert({
    user_id: user.id,
    kind: "wanted",
    group_id: input.groupId ?? null,
    character_id: input.characterId ?? null,
    goods_type_id: input.goodsTypeId,
    title,
    description: input.note?.trim() || null,
    priority: input.priority,
    flex_level: input.flexLevel,
    exchange_type: exchangeType,
    quantity: input.quantity,
    photo_urls: [],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/wishes");
  return undefined;
}

export async function deleteWishItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("goods_inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("kind", "wanted");

  if (error) return { error: error.message };
  revalidatePath("/wishes");
  return undefined;
}
