"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

/**
 * iter92: 既読化（個別 or 全件）
 */
export async function markNotificationRead(input: {
  id?: string;
  all?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();
  if (input.all) {
    await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", user.id)
      .is("read_at", null);
  } else if (input.id) {
    await supabase
      .from("notifications")
      .update({ read_at: nowIso })
      .eq("user_id", user.id)
      .eq("id", input.id);
  }

  revalidatePath("/notifications");
  revalidatePath("/");
  return undefined;
}
