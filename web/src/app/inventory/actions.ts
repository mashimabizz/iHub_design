"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_KINDS = ["for_trade", "wanted"] as const;
const VALID_CONDITIONS = ["sealed", "mint", "good", "fair", "poor"] as const;

export async function saveInventoryItem(input: {
  kind: "for_trade" | "wanted";
  groupId?: string;
  characterId?: string;
  goodsTypeId: string;
  title: string;
  series?: string;
  description?: string;
  condition?: "sealed" | "mint" | "good" | "fair" | "poor";
  quantity: number;
  hue?: number;
}): Promise<ActionResult> {
  if (!VALID_KINDS.includes(input.kind)) {
    return { error: "種別が不正です" };
  }
  const title = input.title.trim();
  if (!title || title.length > 100) {
    return { error: "タイトルは 1〜100 文字で入力してください" };
  }
  if (!input.goodsTypeId) {
    return { error: "グッズ種別を選択してください" };
  }
  if (!input.groupId && !input.characterId) {
    return { error: "グループまたはメンバーを選択してください" };
  }
  if (input.condition && !VALID_CONDITIONS.includes(input.condition)) {
    return { error: "コンディション値が不正です" };
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
    kind: input.kind,
    group_id: input.groupId ?? null,
    character_id: input.characterId ?? null,
    goods_type_id: input.goodsTypeId,
    title,
    series: input.series?.trim() || null,
    description: input.description?.trim() || null,
    condition: input.kind === "for_trade" ? input.condition ?? null : null,
    quantity: input.quantity,
    hue: input.hue ?? null,
    photo_urls: [],
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return undefined;
}

// active / keep / traded / archived のステータス変更
export async function updateInventoryStatus(
  id: string,
  status: "active" | "keep" | "traded" | "archived",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("goods_inventory")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return undefined;
}

// 携帯モード一斉切替（active な for_trade 全アイテムの carrying を変更）
export async function toggleCarryingAll(
  carrying: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("goods_inventory")
    .update({ carrying })
    .eq("user_id", user.id)
    .eq("kind", "for_trade")
    .eq("status", "active");

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  return undefined;
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("goods_inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return undefined;
}
