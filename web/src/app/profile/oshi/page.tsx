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

type GenreRow = {
  id: string;
  name: string;
};

type MasterGroupRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  kind: string;
  display_order: number;
  genre:
    | { id: string; name: string; kind: string }
    | { id: string; name: string; kind: string }[]
    | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type Props = {
  searchParams: Promise<{ request?: string }>;
};

export default async function ProfileOshiPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 自分の推し + 関連 master + 追加リクエスト用 genre を並列取得
  const [
    { data: oshi },
    { data: characters },
    { data: genres },
    { data: masterGroups },
  ] = await Promise.all([
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
    supabase
      .from("genres_master")
      .select("id, name")
      .order("display_order", { ascending: true }),
    supabase
      .from("groups_master")
      .select(
        "id, name, aliases, kind, display_order, genre:genres_master(id, name, kind)",
      )
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
  const charactersByGroup = new Map<
    string,
    { id: string; name: string }[]
  >();
  for (const c of characters ?? []) {
    if (!c.group_id) continue;
    const list = charactersByGroup.get(c.group_id) ?? [];
    list.push({ id: c.id, name: c.name });
    charactersByGroup.set(c.group_id, list);
  }

  const masterOptions = ((masterGroups as MasterGroupRow[] | null) ?? [])
    .map((g) => {
      const genre = pickOne(g.genre);
      if (!genre) return null;
      return {
        id: g.id,
        name: g.name,
        aliases: g.aliases ?? [],
        kind: g.kind as "group" | "work" | "solo",
        displayOrder: g.display_order,
        genreId: genre.id,
        genreName: genre.name,
        genreKind: genre.kind as "idol" | "anime" | "game" | "other",
        characters: charactersByGroup.get(g.id) ?? [],
      };
    })
    .filter((g): g is NonNullable<typeof g> => !!g);

  return (
    <main className="animate-route-slide-in-right flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="推し設定" backHref="/profile" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-12 pt-5">
        <OshiEditView
          oshiGroups={oshiGroups}
          initialRequestModal={params.request === "oshi"}
          genreOptions={((genres as GenreRow[] | null) ?? []).map((g) => ({
            id: g.id,
            name: g.name,
          }))}
          masterOptions={masterOptions}
        />
      </div>
    </main>
  );
}
