import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptureView } from "./CaptureView";

export const metadata = {
  title: "取引証跡を撮影 — iHub",
};

type Row = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  evidence_photo_url: string | null;
  sender_have_qtys: number[] | null;
  receiver_have_qtys: number[] | null;
  meetup_place_name: string | null;
};

export default async function CapturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("proposals")
    .select(
      "id, sender_id, receiver_id, status, evidence_photo_url, sender_have_qtys, receiver_have_qtys, meetup_place_name",
    )
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();
  const p = row as Row;
  if (p.sender_id !== user.id && p.receiver_id !== user.id) notFound();

  // 撮影前後で遷移先を切替
  if (p.evidence_photo_url) redirect(`/transactions/${id}/approve`);
  if (p.status !== "agreed") redirect(`/transactions/${id}`);

  const isMeSender = p.sender_id === user.id;
  const myQtys = isMeSender ? p.sender_have_qtys : p.receiver_have_qtys;
  const theirQtys = isMeSender ? p.receiver_have_qtys : p.sender_have_qtys;
  const myCount = (myQtys ?? []).reduce((s, q) => s + (q || 0), 0);
  const theirCount = (theirQtys ?? []).reduce((s, q) => s + (q || 0), 0);

  return (
    <CaptureView
      proposalId={p.id}
      myCount={myCount}
      theirCount={theirCount}
      placeName={p.meetup_place_name ?? "—"}
    />
  );
}
