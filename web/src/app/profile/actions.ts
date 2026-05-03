"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

const VALID_GENDER = ["female", "male", "other", "no_answer"] as const;

/**
 * プロフィール基本情報を更新（display_name / handle / avatar_url / gender / primary_area）
 *
 * 注: handle 変更時は重複チェックする。
 */
export async function updateProfile(input: {
  handle: string;
  displayName: string;
  bio?: string; // users.bio 列はないので、display_name 補助情報として無視するか
  // → 現状 schema に bio 列なし。今回は display_name と handle のみ更新。
  gender?: "female" | "male" | "other" | "no_answer";
  primaryArea?: string;
}): Promise<ActionResult> {
  const handle = input.handle.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!handle.match(/^[a-z0-9_]{3,20}$/)) {
    return {
      error: "ハンドルは半角英数字・アンダースコアの 3〜20 文字で入力してください",
    };
  }
  if (!displayName || displayName.length > 50) {
    return { error: "表示名は 1〜50 文字で入力してください" };
  }
  if (input.gender && !VALID_GENDER.includes(input.gender)) {
    return { error: "性別の値が不正です" };
  }
  if (input.primaryArea && input.primaryArea.length > 50) {
    return { error: "活動エリアは 50 文字以内で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // handle 重複チェック（自分以外）
  const { data: dup } = await supabase
    .from("users")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();
  if (dup) {
    return { error: "このハンドル名は既に使われています" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      handle,
      display_name: displayName,
      gender: input.gender ?? null,
      primary_area: input.primaryArea?.trim() || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return undefined;
}

/**
 * 推し設定: グループを丸ごと削除（user_oshi の該当 group_id 全行）
 */
export async function removeOshiGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id)
    .eq("group_id", groupId);

  if (error) return { error: error.message };
  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}

/**
 * 推しメンバーをグループに追加（user_oshi に新規行）
 *
 * - 既存の同 group + character エントリがあれば何もしない
 * - kind は 'specific'（メンバー個別）
 */
export async function addCharacterToOshi(input: {
  groupId: string;
  characterId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 既存チェック
  const { data: existing } = await supabase
    .from("user_oshi")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", input.groupId)
    .eq("character_id", input.characterId)
    .maybeSingle();

  if (existing) return undefined; // 何もしない

  // 「箱推し」エントリ（character_id = null）が同 group にあれば、それを delete してから個別を追加
  await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id)
    .eq("group_id", input.groupId)
    .is("character_id", null)
    .is("character_request_id", null);

  // priority は同 group の最大値+1（無ければ 1）
  const { data: maxRow } = await supabase
    .from("user_oshi")
    .select("priority")
    .eq("user_id", user.id)
    .eq("group_id", input.groupId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPriority = (maxRow?.priority ?? 0) + 1;

  const { error } = await supabase.from("user_oshi").insert({
    user_id: user.id,
    group_id: input.groupId,
    character_id: input.characterId,
    kind: "specific",
    priority: nextPriority,
  });

  if (error) return { error: error.message };
  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}

/**
 * 推しメンバーを削除（user_oshi 該当行を 1 件 delete）
 *
 * 削除後、同グループに行が 1 つもなくなったら、kind='box' のエントリを 1 つ復活させる
 * （= グループ自体は推しのまま、メンバー指定なし状態）
 */
export async function removeCharacterFromOshi(input: {
  groupId: string;
  characterId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id)
    .eq("group_id", input.groupId)
    .eq("character_id", input.characterId);
  if (error) return { error: error.message };

  // 同グループに残っている行を確認
  const { data: remaining } = await supabase
    .from("user_oshi")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", input.groupId);

  if (!remaining || remaining.length === 0) {
    // 箱推し復活
    await supabase.from("user_oshi").insert({
      user_id: user.id,
      group_id: input.groupId,
      character_id: null,
      kind: "box",
      priority: 1,
    });
  }

  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}
