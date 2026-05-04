"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

export type LocalModeSettings = {
  enabled: boolean;
  awId: string | null;
  radiusM: number;
  selectedCarryingIds: string[];
  selectedWishIds: string[];
  lastLat: number | null;
  lastLng: number | null;
};

/**
 * 現地モードに切り替え + 位置情報を更新。
 * ON にした瞬間に GPS で last_lat/lng を上書き、その他の選択は維持。
 */
export async function enableLocalMode(input: {
  lat?: number;
  lng?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 既存設定を取得（無ければ作る）
  const { data: existing } = await supabase
    .from("user_local_mode_settings")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const lat =
    typeof input.lat === "number" && !isNaN(input.lat) ? input.lat : null;
  const lng =
    typeof input.lng === "number" && !isNaN(input.lng) ? input.lng : null;

  if (!existing) {
    const { error } = await supabase
      .from("user_local_mode_settings")
      .insert({
        user_id: user.id,
        enabled: true,
        last_lat: lat,
        last_lng: lng,
      });
    if (error) return { error: error.message };
  } else {
    const updateFields: Record<string, unknown> = { enabled: true };
    if (lat !== null) updateFields.last_lat = lat;
    if (lng !== null) updateFields.last_lng = lng;
    const { error } = await supabase
      .from("user_local_mode_settings")
      .update(updateFields)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  return undefined;
}

/**
 * 現地モードシート内で AW を作成 or 更新し、現地モード設定に紐付ける。
 * iter65.8: AW 編集画面に飛ばずシート内で完結する目的。
 *
 * - venue, center_lat/lng, radius_m, start_at, end_at を受け取る
 * - 既存の `user_local_mode_settings.aw_id` が存在し有効なら **更新**、
 *   なければ新規 AW を **作成** して aw_id を紐付け
 */
export async function applyLocalModeAW(input: {
  venue: string;
  centerLat?: number;
  centerLng?: number;
  radiusM: number;
  startAt: string; // ISO
  endAt: string;
}): Promise<ActionResult> {
  const venue = input.venue.trim();
  if (!venue || venue.length > 100) {
    return { error: "場所名を入力してください（1〜100 文字）" };
  }
  if (input.radiusM < 50 || input.radiusM > 5000) {
    return { error: "半径は 50m〜5000m で指定してください" };
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "日時の形式が不正です" };
  }
  if (end <= start) {
    return { error: "終了時刻は開始時刻より後にしてください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 現在の設定を取得
  const { data: settings } = await supabase
    .from("user_local_mode_settings")
    .select("aw_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const awFields = {
    venue,
    event_name: null,
    eventless: true,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    radius_m: input.radiusM,
    center_lat: input.centerLat ?? null,
    center_lng: input.centerLng ?? null,
    status: "enabled" as const,
  };

  let awId: string | null = settings?.aw_id ?? null;

  if (awId) {
    // 既存 AW を更新
    const { error: updateErr } = await supabase
      .from("activity_windows")
      .update(awFields)
      .eq("id", awId)
      .eq("user_id", user.id);
    if (updateErr) {
      // 既存 AW が見つからない / 更新失敗 → 新規作成にフォールバック
      awId = null;
    }
  }

  if (!awId) {
    const { data: created, error: insertErr } = await supabase
      .from("activity_windows")
      .insert({ ...awFields, user_id: user.id })
      .select("id")
      .single();
    if (insertErr || !created) {
      return { error: insertErr?.message ?? "AW の作成に失敗しました" };
    }
    awId = created.id;
  }

  // iter86: 整合性 — 現地モードの AW は単一なので、それ以外の自分の
  // status='enabled' な AW を 'disabled' にしてゴースト AW を防ぐ
  await supabase
    .from("activity_windows")
    .update({ status: "disabled" })
    .eq("user_id", user.id)
    .eq("status", "enabled")
    .neq("id", awId);

  // settings に aw_id とラジウス・最終位置を反映
  const settingsFields: Record<string, unknown> = {
    user_id: user.id,
    enabled: true,
    aw_id: awId,
    radius_m: input.radiusM,
  };
  if (typeof input.centerLat === "number") settingsFields.last_lat = input.centerLat;
  if (typeof input.centerLng === "number") settingsFields.last_lng = input.centerLng;

  const { error: upsertErr } = await supabase
    .from("user_local_mode_settings")
    .upsert(settingsFields, { onConflict: "user_id" });

  if (upsertErr) return { error: upsertErr.message };

  revalidatePath("/");
  return undefined;
}

/**
 * 全国モードに戻す（enabled=false）
 *
 * iter136: AW は disabled にしない（設定は保持）
 *   現地⇄全国 のトグルを非破壊にして、再 ON 時に AW 設定を再入力不要にする。
 *   他者から「現地モード OFF のユーザーの AW」が見えないようにするのは、
 *   page.tsx 側で user_local_mode_settings.enabled を JOIN して
 *   フィルタすることで担保する（iter136）。
 */
export async function disableLocalMode(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_local_mode_settings")
    .upsert(
      { user_id: user.id, enabled: false },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };

  // iter136: AW status は触らない（設定保持）

  revalidatePath("/");
  return undefined;
}

/**
 * 現地モードの選択（AW、半径、持参グッズ、wish）を更新
 */
export async function updateLocalModeSelections(input: {
  awId?: string | null;
  radiusM?: number;
  selectedCarryingIds?: string[];
  selectedWishIds?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (
    input.radiusM !== undefined &&
    (input.radiusM < 50 || input.radiusM > 5000)
  ) {
    return { error: "半径は 50m〜5000m の範囲で指定してください" };
  }

  const updateFields: Record<string, unknown> = {};
  if (input.awId !== undefined) updateFields.aw_id = input.awId;
  if (input.radiusM !== undefined) updateFields.radius_m = input.radiusM;
  if (input.selectedCarryingIds !== undefined)
    updateFields.selected_carrying_ids = input.selectedCarryingIds;
  if (input.selectedWishIds !== undefined)
    updateFields.selected_wish_ids = input.selectedWishIds;

  const { error } = await supabase
    .from("user_local_mode_settings")
    .upsert(
      { user_id: user.id, ...updateFields },
      { onConflict: "user_id" },
    );

  if (error) return { error: error.message };
  revalidatePath("/");
  return undefined;
}

/**
 * 持参グッズと wish 選択を一括リセット
 */
export async function resetLocalModeSelections(): Promise<ActionResult> {
  return updateLocalModeSelections({
    selectedCarryingIds: [],
    selectedWishIds: [],
  });
}
