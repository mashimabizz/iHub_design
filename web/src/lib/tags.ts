"use client";

/**
 * iter106: タグ操作用の client helper
 *
 * - search_tags / attach_inventory_tag / detach_inventory_tag RPC を呼ぶ
 * - 在庫アイテムに紐づくタグのロード
 *
 * server 側の RPC 詳細は supabase/migrations/20260505100000_add_tags_system.sql
 */

import { createClient } from "@/lib/supabase/client";

export type TagSuggestion = {
  id: string;
  label: string;
  userCount: number;
  /** 0.0〜1.0、search_tags の rank 用（UI には出さない） */
  similarityScore: number;
};

export type AttachedTag = {
  id: string;
  label: string;
};

/**
 * typeahead 検索：q が空なら使用人数順、入力ありなら prefix > similarity > 人数順
 */
export async function searchTags(
  q: string,
  limit = 10,
): Promise<TagSuggestion[]> {
  const sb = createClient();
  const { data, error } = await sb.rpc("search_tags", {
    p_q: q,
    p_limit: limit,
  });
  if (error) {
    console.warn("searchTags failed:", error.message);
    return [];
  }
  type Row = {
    id: string;
    label: string;
    user_count: number;
    similarity_score: number;
  };
  return ((data as Row[]) ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    userCount: r.user_count,
    similarityScore: r.similarity_score,
  }));
}

/**
 * 在庫に既に紐づいているタグ一覧を取得
 */
export async function loadInventoryTags(
  inventoryId: string,
): Promise<AttachedTag[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("goods_inventory_tags")
    .select("tag_id, tag:tags_master(id, label)")
    .eq("inventory_id", inventoryId);
  if (error) {
    console.warn("loadInventoryTags failed:", error.message);
    return [];
  }
  type Row = { tag: { id: string; label: string } | { id: string; label: string }[] | null };
  const out: AttachedTag[] = [];
  for (const r of (data as Row[]) ?? []) {
    const t = Array.isArray(r.tag) ? r.tag[0] : r.tag;
    if (t) out.push({ id: t.id, label: t.label });
  }
  return out;
}

/**
 * タグを在庫に attach（既存なら使い回し、新規なら作成）
 *
 * 戻り値：tag_id（新規作成 or 既存）
 */
export async function attachInventoryTag(
  inventoryId: string,
  rawLabel: string,
): Promise<{ tagId: string } | { error: string }> {
  const sb = createClient();
  const { data, error } = await sb.rpc("attach_inventory_tag", {
    p_inventory_id: inventoryId,
    p_raw_label: rawLabel,
  });
  if (error) {
    return { error: error.message };
  }
  return { tagId: data as string };
}

/**
 * タグを在庫から detach
 */
export async function detachInventoryTag(
  inventoryId: string,
  tagId: string,
): Promise<{ ok: true } | { error: string }> {
  const sb = createClient();
  const { error } = await sb.rpc("detach_inventory_tag", {
    p_inventory_id: inventoryId,
    p_tag_id: tagId,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * フォーム保存後に「現在の選択タグ」と「既存の attached タグ」を比較して
 * 差分を反映する。EditForm 用。
 */
export async function syncInventoryTags(
  inventoryId: string,
  /** 現在の編集状態：保持したいタグ（id=null は新規） */
  currentTags: { id: string | null; label: string }[],
  /** 既存の attached タグ */
  existingTags: AttachedTag[],
): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  // detach: existing にあって current に id 一致がないもの
  const currentIds = new Set(
    currentTags
      .map((t) => t.id)
      .filter((id): id is string => id !== null),
  );
  for (const ex of existingTags) {
    if (!currentIds.has(ex.id)) {
      const r = await detachInventoryTag(inventoryId, ex.id);
      if ("error" in r) errors.push(`detach ${ex.label}: ${r.error}`);
    }
  }

  // attach: current の全タグ（新規 / 既存 id 持ち両方）
  // - 新規（id=null）：RPC 内で作成 + attach
  // - 既存（id あり）：既に attach 済なら no-op、別 inv 由来なら attach
  const existingIds = new Set(existingTags.map((e) => e.id));
  for (const t of currentTags) {
    // 既に attach 済（既存 id が existingIds に含まれる）ならスキップ
    if (t.id && existingIds.has(t.id)) continue;
    const r = await attachInventoryTag(inventoryId, t.label);
    if ("error" in r) errors.push(`attach ${t.label}: ${r.error}`);
  }

  return { errors };
}
