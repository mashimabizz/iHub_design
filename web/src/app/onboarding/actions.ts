"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string } | void;

// ----------------------------------------------------------------------
// saveGender: 性別を保存して /onboarding/oshi へ
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

  redirect("/onboarding/oshi");
}
