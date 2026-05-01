import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventoryListView, type InventoryItem } from "./InventoryListView";
import { BottomNav } from "@/components/home/BottomNav";

export const metadata = {
  title: "在庫 — iHub",
};

type InventoryRow = {
  id: string;
  kind: "for_trade" | "wanted";
  title: string;
  description: string | null;
  condition: string | null;
  quantity: number;
  status: string;
  created_at: string;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("goods_inventory")
    .select(
      "id, kind, title, description, condition, quantity, status, created_at, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
    )
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const items: InventoryItem[] = ((rows as InventoryRow[]) ?? []).map((r) => {
    const grp = pickOne(r.group);
    const ch = pickOne(r.character);
    const gt = pickOne(r.goods_type);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      description: r.description,
      condition: r.condition,
      quantity: r.quantity,
      groupName: grp?.name ?? null,
      characterName: ch?.name ?? null,
      goodsTypeName: gt?.name ?? "?",
      status: r.status,
      created_at: r.created_at,
    };
  });

  return (
    <>
      <InventoryListView items={items} />
      <BottomNav />
    </>
  );
}
