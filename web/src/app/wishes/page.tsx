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
  exchange_type: "same_kind" | "cross_kind" | "any" | null;
  quantity: number;
  created_at: string;
  group_id: string | null;
  character_id: string | null;
  goods_type_id: string | null;
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
      "id, title, description, priority, flex_level, exchange_type, quantity, created_at, group_id, character_id, goods_type_id, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
    )
    .eq("user_id", user.id)
    .eq("kind", "wanted")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const wishRows = (rows as WishRow[]) ?? [];

  // iter84: 各 wish のマッチ候補数を集計
  // 「同 goods_type + 同 character or 同 group」の他ユーザーの kind=for_trade status=active 在庫
  const matchCountByWishId = new Map<string, number>();
  for (const w of wishRows) {
    if (!w.goods_type_id) {
      matchCountByWishId.set(w.id, 0);
      continue;
    }
    let q = supabase
      .from("goods_inventory")
      .select("id", { count: "exact", head: true })
      .neq("user_id", user.id)
      .eq("kind", "for_trade")
      .eq("status", "active")
      .eq("goods_type_id", w.goods_type_id);
    if (w.character_id) {
      q = q.eq("character_id", w.character_id);
    } else if (w.group_id) {
      q = q.eq("group_id", w.group_id);
    } else {
      matchCountByWishId.set(w.id, 0);
      continue;
    }
    const { count } = await q;
    matchCountByWishId.set(w.id, count ?? 0);
  }

  const items: WishItem[] = wishRows.map((r) => {
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
      exchangeType: r.exchange_type ?? "any",
      quantity: r.quantity,
      createdAt: r.created_at,
      matchCount: matchCountByWishId.get(r.id) ?? 0,
    };
  });

  return (
    <>
      <WishView items={items} />
      <BottomNav />
    </>
  );
}
