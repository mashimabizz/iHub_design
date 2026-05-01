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

// ----------------------------------------------------------------------
// saveMembers: 各推しごとにメンバー選択（箱推し or 特定メンバー）を保存
// ----------------------------------------------------------------------
export async function saveMembers(
  selections: Record<string, { isBox: boolean; memberIds: string[] }>,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 既存の user_oshi を全て取得（priority 順）
  const { data: existing } = await supabase
    .from("user_oshi")
    .select("id, group_id, oshi_request_id, priority")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  if (!existing || existing.length === 0) {
    return { error: "推し情報が見つかりません。再度推し選択からお進みください" };
  }

  // 既存を全削除
  const { error: deleteError } = await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    return { error: deleteError.message };
  }

  // 新しい行を構築（priority は 1 から再採番）
  type NewRow = {
    user_id: string;
    group_id: string | null;
    oshi_request_id: string | null;
    character_id?: string;
    kind: "box" | "specific" | "multi";
    priority: number;
  };
  const newRows: NewRow[] = [];
  let p = 1;

  for (const oshi of existing) {
    const sel = selections[oshi.id];
    // 審査中（oshi_request_id 経由）はメンバー選択不可なので常に box 扱い
    const isPendingRequest = !!oshi.oshi_request_id;
    if (
      isPendingRequest ||
      !sel ||
      sel.isBox ||
      sel.memberIds.length === 0
    ) {
      newRows.push({
        user_id: user.id,
        group_id: oshi.group_id,
        oshi_request_id: oshi.oshi_request_id,
        kind: "box",
        priority: p++,
      });
    } else {
      const kind = sel.memberIds.length > 1 ? "multi" : "specific";
      for (const cid of sel.memberIds) {
        newRows.push({
          user_id: user.id,
          group_id: oshi.group_id,
          oshi_request_id: oshi.oshi_request_id,
          character_id: cid,
          kind,
          priority: p++,
        });
      }
    }
  }

  const { error: insertError } = await supabase
    .from("user_oshi")
    .insert(newRows);
  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/onboarding/area");
  return undefined;
}
