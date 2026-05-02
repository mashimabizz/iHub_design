import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocationLedForm } from "./LocationLedForm";

export const metadata = {
  title: "AW を作成（場所から）— iHub",
};

/**
 * AW 編集 — 場所から作る (Location-led)
 *
 * モックアップ aw-edit.jsx AWEditLocationLed (693-998) 準拠。
 */
export default async function AWNewLocationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <LocationLedForm />;
}
