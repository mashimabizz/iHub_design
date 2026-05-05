"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { removeUnavailableHavesFromListings } from "@/lib/marketAvailability";

type ActionResult = { error?: string } | undefined;
/**
 * iter106: 新規作成時の戻り値（クライアント側でタグ attach に使う id）
 */
type CreateResult = { error?: string; id?: string } | undefined;

const VALID_CONDITIONS = ["sealed", "mint", "good", "fair", "poor"] as const;

// ----------------------------------------------------------------------
// saveBatchInventoryItems: 複数アイテムを一括登録（撮影フロー用）
// ----------------------------------------------------------------------
export async function saveBatchInventoryItems(input: {
  items: Array<{
    groupId: string;
    goodsTypeId: string;
    characterId?: string | null;
    characterRequestId?: string | null; // 審査中メンバーの選択
    title: string;
    series?: string;
    condition: "sealed" | "mint" | "good" | "fair" | "poor";
    quantity: number;
    photoUrl?: string; // 任意：写真ナシでも登録可
  }>;
  startCarrying?: boolean;
}): Promise<ActionResult> {
  if (!input.items || input.items.length === 0) {
    return { error: "登録するアイテムがありません" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // バリデーション
  for (const it of input.items) {
    if (!it.title || it.title.length > 100) {
      return { error: "タイトルが不正なアイテムがあります" };
    }
    if (!it.goodsTypeId || !it.groupId) {
      return { error: "グループまたは種別が未指定のアイテムがあります" };
    }
    if (!VALID_CONDITIONS.includes(it.condition)) {
      return { error: "コンディションが不正です" };
    }
    if (it.quantity < 1 || it.quantity > 999) {
      return { error: "数量は 1〜999 で入力してください" };
    }
  }

  const rows = input.items.map((it) => ({
    user_id: user.id,
    kind: "for_trade" as const,
    group_id: it.groupId,
    character_id: it.characterRequestId ? null : (it.characterId ?? null),
    character_request_id: it.characterRequestId ?? null,
    goods_type_id: it.goodsTypeId,
    title: it.title.trim(),
    series: it.series?.trim() || null,
    condition: it.condition,
    quantity: it.quantity,
    photo_urls: it.photoUrl ? [it.photoUrl] : [],
    carrying: input.startCarrying ?? false,
  }));

  const { error } = await supabase.from("goods_inventory").insert(rows);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return undefined;
}

// ----------------------------------------------------------------------
// requestCharacterFromInventory: 在庫登録中にメンバー追加リクエスト
// ----------------------------------------------------------------------
// onboarding の saveCharacterRequest と同じテーブルへ insert するが、
// inventory 経由かつ groupId のみ受け付けるシンプル版。
export async function requestCharacterFromInventory(input: {
  groupId: string;
  name: string;
  note?: string;
}): Promise<{ error?: string; id?: string }> {
  const trimmed = input.name.trim();
  if (!trimmed) return { error: "メンバー名を入力してください" };
  if (trimmed.length > 100) return { error: "メンバー名は100文字以内です" };
  if (!input.groupId) return { error: "グループが未指定です" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("character_requests")
    .insert({
      user_id: user.id,
      group_id: input.groupId,
      requested_name: trimmed,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data?.id };
}

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
}): Promise<CreateResult> {
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

  // iter106: id を取得してクライアントでのタグ attach に使えるようにする
  const { data: inserted, error } = await supabase
    .from("goods_inventory")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  return { id: (inserted as { id: string }).id };
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

  const { data: current } = await supabase
    .from("goods_inventory")
    .select("id, kind")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("goods_inventory")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  if (current?.kind === "for_trade" && status !== "active") {
    await removeUnavailableHavesFromListings(supabase, user.id, [id]);
    revalidatePath("/listings");
  }
  revalidatePath("/inventory");
  revalidatePath("/");
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

/**
 * 在庫アイテムの編集（フィールド一括更新）
 *
 * - meta（group / character / goodsType / title / series / quantity 等）+ 写真URL配列
 * - photoUrls を渡した場合は配列を完全置換
 * - 写真の Storage 削除は別アクション（deleteStoragePhoto）でクライアント側から
 */
export async function updateInventoryItem(input: {
  id: string;
  groupId: string;
  characterId?: string | null;
  characterRequestId?: string | null; // 審査中メンバー
  goodsTypeId: string;
  title: string;
  series?: string;
  description?: string;
  condition?: "sealed" | "mint" | "good" | "fair" | "poor";
  quantity: number;
  photoUrls?: string[];
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 100) {
    return { error: "タイトルは 1〜100 文字で入力してください" };
  }
  if (!input.goodsTypeId || !input.groupId) {
    return { error: "グループと種別は必須です" };
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

  const updateFields: Record<string, unknown> = {
    group_id: input.groupId,
    character_id: input.characterRequestId ? null : (input.characterId ?? null),
    character_request_id: input.characterRequestId ?? null,
    goods_type_id: input.goodsTypeId,
    title,
    series: input.series?.trim() || null,
    description: input.description?.trim() || null,
    condition: input.condition ?? null,
    quantity: input.quantity,
  };
  if (input.photoUrls !== undefined) {
    updateFields.photo_urls = input.photoUrls;
  }

  const { error } = await supabase
    .from("goods_inventory")
    .update(updateFields)
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.id}`);
  return undefined;
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase
    .from("goods_inventory")
    .select("id, kind")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (current?.kind === "for_trade") {
    await removeUnavailableHavesFromListings(supabase, user.id, [id]);
  }

  const { error } = await supabase
    .from("goods_inventory")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/inventory");
  revalidatePath("/listings");
  revalidatePath("/");
  return undefined;
}
