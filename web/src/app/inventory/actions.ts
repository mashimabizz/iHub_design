"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_CONDITIONS = ["sealed", "mint", "good", "fair", "poor"] as const;

/**
 * 譲るグッズを登録（kind='for_trade' 固定）
 * 求める（wish）は別画面 /wishes/new で別 action として扱う
 */
export async function saveInventoryItem(input: {
  groupId?: string;
  characterId?: string;
  goodsTypeId: string;
  title: string;
  series?: string;
  description?: string;
  condition?: "sealed" | "mint" | "good" | "fair" | "poor";
  quantity: number;
  hue?: number;
  startCarrying?: boolean;
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
    kind: "for_trade",
    group_id: input.groupId ?? null,
    character_id: input.characterId ?? null,
    goods_type_id: input.goodsTypeId,
    title,
    series: input.series?.trim() || null,
    description: input.description?.trim() || null,
    condition: input.condition ?? null,
    quantity: input.quantity,
    hue: input.hue ?? null,
    photo_urls: [],
    carrying: input.startCarrying ?? false,
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

// 個別アイテムの carrying トグル
export async function toggleItemCarrying(
  id: string,
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

// 外出モード切替（users.is_going_out）
export async function toggleGoingOut(
  isGoingOut: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("users")
    .update({ is_going_out: isGoingOut })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/inventory");
  revalidatePath("/", "layout");
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
