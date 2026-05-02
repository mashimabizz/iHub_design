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
 * 広域モードに戻す（enabled=false）
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
