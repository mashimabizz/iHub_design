"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | void;

// ----------------------------------------------------------------------
// saveGender: 性別を保存して /onboarding/oshi へ
// ----------------------------------------------------------------------
export async function saveGender(gender: string): Promise<ActionResult> {
  const valid = ["female", "male", "other", "no_answer"];
  if (!valid.includes(gender)) {
    return { error: "不正な選択です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("users")
    .update({ gender, account_status: "onboarding" })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/oshi");
}

// ----------------------------------------------------------------------
// saveOshi: 推し（グループ）を保存して /onboarding/members へ
// ----------------------------------------------------------------------
export async function saveOshi(
  groupIds: string[],
): Promise<ActionResult> {
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return { error: "推しを 1 つ以上選択してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 既存 user_oshi を一旦削除（再訪問時に上書き）
  const { error: deleteError } = await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return { error: deleteError.message };
  }

  // 選択順に priority を 1, 2, 3... で挿入（kind='box' = 箱推し、後でメンバー選択時に specific/multi に変更）
  const rows = groupIds.map((group_id, idx) => ({
    user_id: user.id,
    group_id,
    kind: "box" as const,
    priority: idx + 1,
  }));

  const { error: insertError } = await supabase
    .from("user_oshi")
    .insert(rows);
  if (insertError) {
    return { error: insertError.message };
  }

  redirect("/onboarding/members");
}

// ----------------------------------------------------------------------
// saveOshiRequest: マスタに無い推しの追加リクエストを送信
// ----------------------------------------------------------------------
export async function saveOshiRequest(input: {
  name: string;
  genreId?: string;
  kind?: "group" | "work" | "solo";
  note?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name || name.length > 100) {
    return { error: "推しの名前は 1〜100 文字で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("oshi_requests").insert({
    user_id: user.id,
    requested_name: name,
    requested_genre_id: input.genreId || null,
    requested_kind: input.kind || null,
    note: input.note?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding/oshi");
}
