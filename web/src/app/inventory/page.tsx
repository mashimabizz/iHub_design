import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventoryView, type InventoryItemFull } from "./InventoryView";
import { BottomNav } from "@/components/home/BottomNav";

export const metadata = {
  title: "マイ在庫 — iHub",
};

type InventoryRow = {
  id: string;
  kind: "for_trade" | "wanted";
  title: string;
  series: string | null;
  quantity: number;
  status: "active" | "keep" | "traded" | "reserved" | "archived";
  carrying: boolean;
  hue: number | null;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// メンバー名 → hue（0〜360）の単純ハッシュ
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 譲（for_trade）のみ取得・archived は除く（モックアップ B-Inventory は譲タブ）
  const { data: rows } = await supabase
    .from("goods_inventory")
    .select(
      "id, kind, title, series, quantity, status, carrying, hue, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
    )
    .eq("user_id", user.id)
    .eq("kind", "for_trade")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const items: InventoryItemFull[] = ((rows as InventoryRow[]) ?? []).map(
    (r) => {
      const grp = pickOne(r.group);
      const ch = pickOne(r.character);
      const gt = pickOne(r.goods_type);
      const memberName = ch?.name ?? grp?.name ?? "?";
      return {
        id: r.id,
        memberName,
        groupName: grp?.name ?? null,
        goodsType: gt?.name ?? "?",
        series: r.series,
        qty: r.quantity,
        hue: r.hue ?? nameToHue(memberName),
        carrying: r.carrying,
        status: r.status,
      };
    },
  );

  // 携帯モード：active な for_trade で 1 つでも carrying=true なら on
  const carrying = items.some(
    (i) => i.status === "active" && i.carrying,
  );

  return (
    <>
      <InventoryView items={items} carrying={carrying} />
      <BottomNav />
    </>
  );
}
