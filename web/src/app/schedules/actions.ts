"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

export async function createSchedule(input: {
  title: string;
  startAt: string; // ISO datetime-local
  endAt: string;
  allDay?: boolean;
  note?: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 100) {
    return { error: "タイトルは 1〜100 文字で入力してください" };
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "日時の形式が不正です" };
  }
  if (end <= start) {
    return { error: "終了時刻は開始時刻より後にしてください" };
  }
  if (input.note && input.note.length > 500) {
    return { error: "メモは 500 文字以内で入力してください" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("schedules").insert({
    user_id: user.id,
    title,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: input.allDay ?? false,
    note: input.note?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/schedules");
  return undefined;
}

export async function updateSchedule(input: {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  note?: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 100) {
    return { error: "タイトルは 1〜100 文字で入力してください" };
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

  const { error } = await supabase
    .from("schedules")
    .update({
      title,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: input.allDay ?? false,
      note: input.note?.trim() || null,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/schedules");
  revalidatePath(`/schedules/${input.id}`);
  return undefined;
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/schedules");
  return undefined;
}
