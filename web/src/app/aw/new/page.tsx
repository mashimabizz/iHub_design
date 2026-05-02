import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AWAddEntry } from "./AWAddEntry";

export const metadata = {
  title: "AW を追加 — iHub",
};

type Props = {
  searchParams: Promise<{ return?: string }>;
};

/**
 * AW 追加 — 入口（チューザー）
 *
 * - 「📍 場所から作る」→ /aw/new/location（return クエリ伝搬）
 * - 「🎤 イベントから埋める」→ /aw/new/event（return クエリ伝搬）
 * - return=local-mode のとき、サブ画面で AW 保存後に /?openLocalMode=1 に戻る
 */
export default async function AWNewPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AWAddEntry returnTo={params.return} />;
}
