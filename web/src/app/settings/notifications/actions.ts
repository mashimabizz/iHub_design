"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | undefined;

export async function updateNotificationSettings(input: {
  emailEnabled: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_notification_settings")
    .upsert(
      {
        user_id: user.id,
        email_enabled: input.emailEnabled,
      },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return undefined;
}
