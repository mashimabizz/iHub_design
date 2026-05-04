"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;
/** iter106: 新規作成時の戻り値（クライアント側でタグ attach に使う id） */
type CreateResult = { error?: string; id?: string } | undefined;

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
  photoUrls?: string[]; // iter94: wish 画像
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

  // iter106: id を取得してクライアントでのタグ attach に使えるようにする
  const { data: inserted, error } = await supabase
    .from("goods_inventory")
    .insert({
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
      photo_urls: input.photoUrls ?? [],
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/wishes");
  return { id: (inserted as { id: string }).id };
}

/**
 * iter88: wish の編集（最小フィールド：グループ・キャラ・種別・個数・メモ）
 *
 * ユーザー方針：wish は「作品名/グループ・キャラ・個数」を登録できれば良いので、
 * 譲るグッズ用の condition/photo/series/carrying は wish 側では一切触らない。
 * priority / flex_level / exchange_type も UI 廃止済（DB 既存値を維持）。
 */
export async function updateWishItem(input: {
  id: string;
  groupId?: string;
  characterId?: string;
  goodsTypeId: string;
  title: string;
  note?: string;
  quantity: number;
  photoUrls?: string[]; // iter94: wish 画像
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
  if (input.quantity < 1 || input.quantity > 999) {
    return { error: "数量は 1〜999 で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // iter145: 個別募集と紐付け中の wish は画像削除を禁止する。
  //   「画像あり = 同種/異種 不要」のロジックを破壊しないためのガード。
  //   差し替え（photoUrls.length > 0）は許可、削除（length=0 or undefined）は拒否。
  if (input.photoUrls !== undefined && input.photoUrls.length === 0) {
    // 既存の photo_urls を確認
    const { data: existing } = await supabase
      .from("goods_inventory")
      .select("photo_urls")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .eq("kind", "wanted")
      .maybeSingle();
    const hadPhoto =
      Array.isArray(existing?.photo_urls) &&
      (existing!.photo_urls as string[]).length > 0;
    if (hadPhoto) {
      // 紐付け中の listing があるか確認
      const { data: linkedOpts } = await supabase
        .from("listing_wish_options")
        .select("id, listing:listings!inner(status)")
        .contains("wish_ids", [input.id]);
      const linked = (linkedOpts ?? []).some((o) => {
        const lst = Array.isArray(o.listing) ? o.listing[0] : o.listing;
        return lst && (lst as { status?: string }).status !== "closed";
      });
      if (linked) {
        return {
          error:
            "この WISH は個別募集で使用中のため画像を削除できません（差し替えは可能）",
        };
      }
    }
  }

  const updateFields: Record<string, unknown> = {
    group_id: input.groupId ?? null,
    character_id: input.characterId ?? null,
    goods_type_id: input.goodsTypeId,
    title,
    description: input.note?.trim() || null,
    quantity: input.quantity,
  };
  if (input.photoUrls !== undefined) {
    updateFields.photo_urls = input.photoUrls;
  }

  const { error } = await supabase
    .from("goods_inventory")
    .update(updateFields)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .eq("kind", "wanted");

  if (error) return { error: error.message };
  revalidatePath("/wishes");
  revalidatePath(`/wishes/${input.id}/edit`);
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
