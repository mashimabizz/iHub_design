import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/home/BottomNav";
import { ProfileView } from "./ProfileView";

export const metadata = {
  title: "プロフ — iHub",
};

type OshiRow = {
  group_id: string | null;
  character_id: string | null;
  oshi_request_id: string | null;
  character_request_id: string | null;
  kind: "box" | "specific" | "multi";
  priority: number;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 並列：プロフ + 推し + AW件数 + 取引件数 + 公開募集数
  // iter86: AW は現地モード切替時のみ設定する単一値（複数登録は廃止）。
  // awCount は ProfileView に互換用フィールドとして渡し続けるが UI 上は非表示。
  const [
    { data: profile },
    { data: oshi },
    { count: awCount },
    { count: tradeCount },
    { count: listingsCount },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "handle, display_name, gender, primary_area, email_verified_at, account_status, avatar_url",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_oshi")
      .select(
        "group_id, character_id, oshi_request_id, character_request_id, kind, priority, group:groups_master(name), character:characters_master(name)",
      )
      .eq("user_id", user.id)
      .order("priority", { ascending: true }),
    supabase
      .from("activity_windows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "enabled"),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq("status", "completed"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  // 推しグループでまとめる
  const groupMap = new Map<
    string,
    { groupId: string; groupName: string; members: { id: string; name: string }[] }
  >();
  for (const row of (oshi as OshiRow[]) ?? []) {
    if (!row.group_id) continue;
    const grp = pickOne(row.group);
    if (!grp) continue;
    if (!groupMap.has(row.group_id)) {
      groupMap.set(row.group_id, {
        groupId: row.group_id,
        groupName: grp.name,
        members: [],
      });
    }
    if (row.character_id) {
      const ch = pickOne(row.character);
      if (ch) {
        groupMap.get(row.group_id)!.members.push({
          id: row.character_id,
          name: ch.name,
        });
      }
    }
  }

  const oshiSummary = Array.from(groupMap.values());

  return (
    <>
      <ProfileView
        profile={{
          handle: profile?.handle ?? "",
          displayName: profile?.display_name ?? "",
          gender: profile?.gender ?? null,
          primaryArea: profile?.primary_area ?? null,
          emailVerifiedAt: profile?.email_verified_at ?? null,
          avatarUrl: (profile?.avatar_url as string | null) ?? null,
        }}
        oshiGroups={oshiSummary}
        awCount={awCount ?? 0}
        tradeCount={tradeCount ?? 0}
        listingsCount={listingsCount ?? 0}
      />
      <BottomNav />
    </>
  );
}
