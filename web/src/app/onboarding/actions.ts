"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action は redirect せず、success/error だけ返す。
 * ナビゲーションは呼び出し側 Client Component で router.push する
 * （体感速度を上げるため）。
 */
type ActionResult = { error?: string } | undefined;

// ----------------------------------------------------------------------
// saveGender: 性別を保存
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

  revalidatePath("/onboarding/oshi");
  return undefined;
}

// ----------------------------------------------------------------------
// saveOshi: 推し（既存グループ + 審査中リクエスト）を保存
// ----------------------------------------------------------------------
export async function saveOshi(input: {
  groupIds: string[];
  requestIds: string[];
}): Promise<ActionResult> {
  const total = input.groupIds.length + input.requestIds.length;
  if (total === 0) {
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

  // 選択順に priority を振る（既存グループ → 審査中リクエストの順）
  const rows = [
    ...input.groupIds.map((group_id, idx) => ({
      user_id: user.id,
      group_id,
      kind: "box" as const,
      priority: idx + 1,
    })),
    ...input.requestIds.map((oshi_request_id, idx) => ({
      user_id: user.id,
      oshi_request_id,
      kind: "box" as const,
      priority: input.groupIds.length + idx + 1,
    })),
  ];

  const { error: insertError } = await supabase
    .from("user_oshi")
    .insert(rows);
  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/onboarding/members");
  return undefined;
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

  // 推し選択画面のキャッシュを無効化（戻った時に新しい審査中アイテムが見える）
  revalidatePath("/onboarding/oshi");
  return undefined;
}
