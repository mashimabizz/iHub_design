import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WishView, type WishItem } from "./WishView";
import { BottomNav } from "@/components/home/BottomNav";

export const metadata = {
  title: "ウィッシュ — iHub",
};

type WishRow = {
  id: string;
  title: string;
  description: string | null;
  priority: "top" | "second" | "flexible" | null;
  flex_level: "exact" | "character_any" | "series_any" | null;
  quantity: number;
  created_at: string;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function WishesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("goods_inventory")
    .select(
      "id, title, description, priority, flex_level, quantity, created_at, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
    )
    .eq("user_id", user.id)
    .eq("kind", "wanted")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const items: WishItem[] = ((rows as WishRow[]) ?? []).map((r) => {
    const grp = pickOne(r.group);
    const ch = pickOne(r.character);
    const gt = pickOne(r.goods_type);
    return {
      id: r.id,
      title: r.title,
      note: r.description,
      groupName: grp?.name ?? null,
      characterName: ch?.name ?? null,
      goodsTypeName: gt?.name ?? "?",
      priority: r.priority,
      flexLevel: r.flex_level,
      quantity: r.quantity,
      createdAt: r.created_at,
    };
  });

  return (
    <>
      <WishView items={items} />
      <BottomNav />
    </>
  );
}
