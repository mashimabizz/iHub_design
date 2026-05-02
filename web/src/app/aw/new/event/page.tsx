import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventLedForm } from "./EventLedForm";

export const metadata = {
  title: "AW を作成（イベントから）— iHub",
};

/**
 * AW 編集 — イベントから埋める (Event-led / shortcut)
 *
 * モックアップ aw-edit.jsx AWEditEventLed (276-571) 準拠。
 */
export default async function AWNewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <EventLedForm />;
}
