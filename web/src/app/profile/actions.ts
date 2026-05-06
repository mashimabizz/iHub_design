"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;
type RequestAndAddResult = {
  error?: string;
  requestId?: string;
  name?: string;
};
type OshiGroupTarget =
  | string
  | {
      groupId?: string;
      oshiRequestId?: string;
    };
type OshiMemberTarget = {
  groupId?: string;
  oshiRequestId?: string;
  characterId?: string;
  characterRequestId?: string;
};

const VALID_GENDER = ["female", "male", "other", "no_answer"] as const;

function resolveGroupTarget(input: OshiGroupTarget): {
  groupId?: string;
  oshiRequestId?: string;
} {
  return typeof input === "string" ? { groupId: input } : input;
}

async function getNextUserOshiPriority(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { data: maxRow } = await supabase
    .from("user_oshi")
    .select("priority")
    .eq("user_id", userId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (maxRow?.priority ?? 0) + 1;
}

async function getParentPriorityRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  target: { groupId?: string; oshiRequestId?: string },
): Promise<
  {
    priority: number;
    character_id: string | null;
    character_request_id: string | null;
  }[]
> {
  let query = supabase
    .from("user_oshi")
    .select("priority, character_id, character_request_id")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  query = target.groupId
    ? query.eq("group_id", target.groupId)
    : query.eq("oshi_request_id", target.oshiRequestId!);

  const { data } = await query;
  return (data ?? []) as {
    priority: number;
    character_id: string | null;
    character_request_id: string | null;
  }[];
}

function nextPriorityPreservingParent(
  rows: {
    priority: number;
    character_id: string | null;
    character_request_id: string | null;
  }[],
): number {
  if (rows.length === 0) return 1;
  const hasSpecific = rows.some(
    (row) => row.character_id != null || row.character_request_id != null,
  );
  if (hasSpecific) {
    return Math.max(...rows.map((row) => row.priority)) + 1;
  }
  return Math.min(...rows.map((row) => row.priority));
}

/**
 * プロフィール基本情報を更新（display_name / handle / avatar_url / gender / primary_area）
 *
 * 注: handle 変更時は重複チェックする。
 * iter96: avatar_url の更新に対応。null を渡すと「削除」として保存される。
 */
export async function updateProfile(input: {
  handle: string;
  displayName: string;
  bio?: string; // users.bio 列はないので、display_name 補助情報として無視するか
  // → 現状 schema に bio 列なし。今回は display_name と handle のみ更新。
  gender?: "female" | "male" | "other" | "no_answer";
  primaryArea?: string;
  /** iter96: アバター画像 URL（クライアントで Storage にアップ済の publicUrl） */
  avatarUrl?: string | null;
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
  // avatarUrl は client 側で同一ユーザー folder の Storage URL を使うので、
  // ここでは長さの簡易バリデーションのみ
  if (input.avatarUrl && input.avatarUrl.length > 1000) {
    return { error: "アバター URL が不正です" };
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

  // 「avatarUrl が key ごと undefined」なら touch しない（誤削除防止）
  // 「avatarUrl が null（明示削除）」または「文字列」なら更新
  const updateRow: {
    handle: string;
    display_name: string;
    gender: string | null;
    primary_area: string | null;
    avatar_url?: string | null;
  } = {
    handle,
    display_name: displayName,
    gender: input.gender ?? null,
    primary_area: input.primaryArea?.trim() || null,
  };
  if (input.avatarUrl !== undefined) {
    updateRow.avatar_url = input.avatarUrl;
  }

  const { error } = await supabase
    .from("users")
    .update(updateRow)
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return undefined;
}

/**
 * 推し設定: グループを丸ごと削除（user_oshi の該当 parent 全行）
 */
export async function removeOshiGroup(
  input: OshiGroupTarget,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const target = resolveGroupTarget(input);
  if (!target.groupId && !target.oshiRequestId) {
    return { error: "削除する推しの指定が不正です" };
  }

  let query = supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id);

  query = target.groupId
    ? query.eq("group_id", target.groupId)
    : query.eq("oshi_request_id", target.oshiRequestId!);

  const { error } = await query;

  if (error) return { error: error.message };
  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}

/**
 * 推し設定: 登録済みマスタのグループ / 作品を追加（箱推し）
 *
 * - 既に同 group_id が登録済みなら何もしない
 * - priority はユーザー内の末尾へ追加
 */
export async function addOshiGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("user_oshi")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .limit(1);

  if (existing && existing.length > 0) return undefined;

  const nextPriority = await getNextUserOshiPriority(supabase, user.id);

  const { error } = await supabase.from("user_oshi").insert({
    user_id: user.id,
    group_id: groupId,
    character_id: null,
    kind: "box",
    priority: nextPriority,
  });

  if (error) return { error: error.message };
  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}

/**
 * 推し追加リクエストを送信し、承認待ちのまま user_oshi に仮登録する。
 */
export async function requestOshiAndAddToProfile(input: {
  name: string;
  genreId?: string;
  kind?: "group" | "work" | "solo";
  note?: string;
}): Promise<RequestAndAddResult> {
  const name = input.name.trim();
  if (!name || name.length > 100) {
    return { error: "推しの名前は 1〜100 文字で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request, error: requestError } = await supabase
    .from("oshi_requests")
    .insert({
      user_id: user.id,
      requested_name: name,
      requested_genre_id: input.genreId || null,
      requested_kind: input.kind || null,
      note: input.note?.trim() || null,
    })
    .select("id, requested_name")
    .single();

  if (requestError) return { error: requestError.message };

  const nextPriority = await getNextUserOshiPriority(supabase, user.id);
  const { error: addError } = await supabase.from("user_oshi").insert({
    user_id: user.id,
    group_id: null,
    character_id: null,
    oshi_request_id: request.id,
    character_request_id: null,
    kind: "box",
    priority: nextPriority,
  });

  if (addError) {
    await supabase
      .from("oshi_requests")
      .delete()
      .eq("id", request.id)
      .eq("user_id", user.id);
    return { error: addError.message };
  }

  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  revalidatePath("/onboarding/oshi");
  return { requestId: request.id, name: request.requested_name };
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

  const priorityRows = await getParentPriorityRows(supabase, user.id, {
    groupId: input.groupId,
  });

  // 「箱推し」エントリ（character_id = null）が同 group にあれば、それを delete してから個別を追加
  await supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id)
    .eq("group_id", input.groupId)
    .is("character_id", null)
    .is("character_request_id", null);

  const nextPriority = nextPriorityPreservingParent(priorityRows);

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
 * メンバー追加リクエストを送信し、承認待ちのまま user_oshi に仮登録する。
 *
 * 親は既存 master グループ（groupId）または仮登録中の推し（oshiRequestId）。
 */
export async function requestCharacterAndAddToProfile(input: {
  groupId?: string;
  oshiRequestId?: string;
  name: string;
  note?: string;
}): Promise<RequestAndAddResult> {
  const name = input.name.trim();
  if (!name || name.length > 100) {
    return { error: "メンバー名は 1〜100 文字で入力してください" };
  }
  if (!input.groupId && !input.oshiRequestId) {
    return { error: "追加先の推しが見つかりません" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const target = {
    groupId: input.groupId,
    oshiRequestId: input.oshiRequestId,
  };

  let parentQuery = supabase
    .from("user_oshi")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  parentQuery = target.groupId
    ? parentQuery.eq("group_id", target.groupId)
    : parentQuery.eq("oshi_request_id", target.oshiRequestId!);
  const { data: parent } = await parentQuery.maybeSingle();
  if (!parent) {
    return {
      error:
        "追加先の推しが推し設定にありません。先に推しを追加してください",
    };
  }

  const { data: request, error: requestError } = await supabase
    .from("character_requests")
    .insert({
      user_id: user.id,
      group_id: target.groupId ?? null,
      oshi_request_id: target.oshiRequestId ?? null,
      requested_name: name,
      note: input.note?.trim() || null,
    })
    .select("id, requested_name")
    .single();

  if (requestError) return { error: requestError.message };

  let deleteBoxQuery = supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id)
    .is("character_id", null)
    .is("character_request_id", null);
  deleteBoxQuery = target.groupId
    ? deleteBoxQuery.eq("group_id", target.groupId)
    : deleteBoxQuery.eq("oshi_request_id", target.oshiRequestId!);
  const { error: deleteBoxError } = await deleteBoxQuery;
  if (deleteBoxError) {
    await supabase
      .from("character_requests")
      .delete()
      .eq("id", request.id)
      .eq("user_id", user.id);
    return { error: deleteBoxError.message };
  }

  const priorityRows = await getParentPriorityRows(supabase, user.id, target);
  const nextPriority = nextPriorityPreservingParent(priorityRows);
  const { error: addError } = await supabase.from("user_oshi").insert({
    user_id: user.id,
    group_id: target.groupId ?? null,
    oshi_request_id: target.oshiRequestId ?? null,
    character_id: null,
    character_request_id: request.id,
    kind: "specific",
    priority: nextPriority,
  });

  if (addError) {
    await supabase
      .from("character_requests")
      .delete()
      .eq("id", request.id)
      .eq("user_id", user.id);
    let remainingQuery = supabase
      .from("user_oshi")
      .select("id")
      .eq("user_id", user.id);
    remainingQuery = target.groupId
      ? remainingQuery.eq("group_id", target.groupId)
      : remainingQuery.eq("oshi_request_id", target.oshiRequestId!);
    const { data: remaining } = await remainingQuery;
    if (!remaining || remaining.length === 0) {
      await supabase.from("user_oshi").insert({
        user_id: user.id,
        group_id: target.groupId ?? null,
        oshi_request_id: target.oshiRequestId ?? null,
        character_id: null,
        character_request_id: null,
        kind: "box",
        priority: 1,
      });
    }
    return { error: addError.message };
  }

  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  revalidatePath("/onboarding/members");
  return { requestId: request.id, name: request.requested_name };
}

/**
 * 推しメンバーを削除（user_oshi 該当行を 1 件 delete）
 *
 * 削除後、同グループに行が 1 つもなくなったら、kind='box' のエントリを 1 つ復活させる
 * （= グループ自体は推しのまま、メンバー指定なし状態）
 */
export async function removeCharacterFromOshi(
  input: OshiMemberTarget,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if ((!input.groupId && !input.oshiRequestId) || (!input.characterId && !input.characterRequestId)) {
    return { error: "削除するメンバーの指定が不正です" };
  }

  const target = {
    groupId: input.groupId,
    oshiRequestId: input.oshiRequestId,
  };

  let targetRowQuery = supabase
    .from("user_oshi")
    .select("priority")
    .eq("user_id", user.id)
    .limit(1);
  targetRowQuery = target.groupId
    ? targetRowQuery.eq("group_id", target.groupId)
    : targetRowQuery.eq("oshi_request_id", target.oshiRequestId!);
  targetRowQuery = input.characterId
    ? targetRowQuery.eq("character_id", input.characterId)
    : targetRowQuery.eq("character_request_id", input.characterRequestId!);
  const { data: targetRow } = await targetRowQuery.maybeSingle();

  let deleteQuery = supabase
    .from("user_oshi")
    .delete()
    .eq("user_id", user.id);
  deleteQuery = target.groupId
    ? deleteQuery.eq("group_id", target.groupId)
    : deleteQuery.eq("oshi_request_id", target.oshiRequestId!);
  deleteQuery = input.characterId
    ? deleteQuery.eq("character_id", input.characterId)
    : deleteQuery.eq("character_request_id", input.characterRequestId!);

  const { error } = await deleteQuery;
  if (error) return { error: error.message };

  // 同グループに残っている行を確認
  let remainingQuery = supabase
    .from("user_oshi")
    .select("id")
    .eq("user_id", user.id);
  remainingQuery = target.groupId
    ? remainingQuery.eq("group_id", target.groupId)
    : remainingQuery.eq("oshi_request_id", target.oshiRequestId!);

  const { data: remaining } = await remainingQuery;

  if (!remaining || remaining.length === 0) {
    // 箱推し復活
    await supabase.from("user_oshi").insert({
      user_id: user.id,
      group_id: target.groupId ?? null,
      oshi_request_id: target.oshiRequestId ?? null,
      character_id: null,
      character_request_id: null,
      kind: "box",
      priority: (targetRow?.priority as number | undefined) ?? 1,
    });
  }

  revalidatePath("/profile/oshi");
  revalidatePath("/profile");
  return undefined;
}
