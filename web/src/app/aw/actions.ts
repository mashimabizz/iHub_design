"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

export async function saveAW(input: {
  venue: string;
  eventName?: string;
  eventless: boolean;
  startAt: string; // ISO datetime-local input value
  endAt: string;
  radiusM: number;
  note?: string;
}): Promise<ActionResult> {
  const venue = input.venue.trim();
  if (!venue || venue.length > 100) {
    return { error: "会場名は 1〜100 文字で入力してください" };
  }
  if (input.radiusM < 50 || input.radiusM > 5000) {
    return { error: "半径は 50m〜5000m の範囲で指定してください" };
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

  const { error } = await supabase.from("activity_windows").insert({
    user_id: user.id,
    venue,
    event_name: input.eventless ? null : input.eventName?.trim() || null,
    eventless: input.eventless,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    radius_m: input.radiusM,
    note: input.note?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/aw");
  return undefined;
}

export async function toggleAWStatus(
  id: string,
  status: "enabled" | "disabled" | "archived",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("activity_windows")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/aw");
  return undefined;
}

export async function deleteAW(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("activity_windows")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/aw");
  return undefined;
}
