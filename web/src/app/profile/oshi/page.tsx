import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { OshiEditView } from "./OshiEditView";

export const metadata = {
  title: "推し設定 — iHub",
};

type OshiRow = {
  id: string;
  group_id: string | null;
  character_id: string | null;
  oshi_request_id: string | null;
  character_request_id: string | null;
  kind: "box" | "specific" | "multi";
  priority: number;
  group: { id: string; name: string } | { id: string; name: string }[] | null;
  character:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ProfileOshiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 自分の推し + 関連キャラ master を並列取得
  const [{ data: oshi }, { data: characters }] = await Promise.all([
    supabase
      .from("user_oshi")
      .select(
        "id, group_id, character_id, oshi_request_id, character_request_id, kind, priority, group:groups_master(id, name), character:characters_master(id, name)",
      )
      .eq("user_id", user.id)
      .order("priority", { ascending: true }),
    supabase
      .from("characters_master")
      .select("id, name, group_id")
      .order("display_order", { ascending: true }),
  ]);

  // グループごとにまとめる
  type Group = {
    groupId: string;
    groupName: string;
    members: { id: string; name: string }[];
    availableCharacters: { id: string; name: string }[];
  };

  const groupMap = new Map<string, Group>();
  for (const row of (oshi as OshiRow[]) ?? []) {
    if (!row.group_id) continue;
    const grp = pickOne(row.group);
    if (!grp) continue;
    if (!groupMap.has(row.group_id)) {
      groupMap.set(row.group_id, {
        groupId: row.group_id,
        groupName: grp.name,
        members: [],
        availableCharacters: [],
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

  // availableCharacters: 各グループの全キャラから、すでに登録済みのキャラを除外
  for (const group of groupMap.values()) {
    const memberIds = new Set(group.members.map((m) => m.id));
    group.availableCharacters = (characters ?? [])
      .filter(
        (c) => c.group_id === group.groupId && !memberIds.has(c.id),
      )
      .map((c) => ({ id: c.id, name: c.name }));
  }

  const oshiGroups = Array.from(groupMap.values());

  return (
    <main className="animate-route-slide-in-right flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="推し設定" backHref="/profile" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-12 pt-5">
        <OshiEditView oshiGroups={oshiGroups} />
      </div>
    </main>
  );
}
