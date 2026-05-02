import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AWView, type AWItem } from "./AWView";
import { BottomNav } from "@/components/home/BottomNav";

export const metadata = {
  title: "AW · 合流可能枠 — iHub",
};

type AWRow = {
  id: string;
  venue: string;
  event_name: string | null;
  eventless: boolean;
  start_at: string;
  end_at: string;
  radius_m: number;
  note: string | null;
  status: "enabled" | "disabled" | "archived";
};

export default async function AWPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("activity_windows")
    .select(
      "id, venue, event_name, eventless, start_at, end_at, radius_m, note, status",
    )
    .eq("user_id", user.id)
    .order("start_at", { ascending: false });

  const items: AWItem[] = ((rows as AWRow[]) ?? []).map((r) => ({
    id: r.id,
    venue: r.venue,
    eventName: r.event_name,
    eventless: r.eventless,
    startAt: r.start_at,
    endAt: r.end_at,
    radiusM: r.radius_m,
    note: r.note,
    status: r.status,
  }));

  return (
    <>
      <AWView items={items} />
      <BottomNav />
    </>
  );
}
