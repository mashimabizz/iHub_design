import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AWAddEntry } from "./AWAddEntry";

export const metadata = {
  title: "AW を追加 — iHub",
};

/**
 * AW 追加 — 入口（チューザー）
 *
 * モックアップ aw-edit.jsx AWAddEntry 準拠。
 * - 暗転バックドロップ + ボトムシート
 * - 「📍 場所から作る」（おすすめ）→ /aw/new/location
 * - 「🎤 イベントから埋める」（ショートカット）→ /aw/new/event
 */
export default async function AWNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AWAddEntry />;
}
