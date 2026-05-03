import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { ListingNewForm } from "./ListingNewForm";

export const metadata = {
  title: "個別募集を追加 — iHub",
};

export default async function ListingNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 自分の active な譲 + active な wish を並列 fetch
  const [{ data: inventoryRows }, { data: wishRows }] = await Promise.all([
    supabase
      .from("goods_inventory")
      .select(
        "id, title, photo_urls, hue, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .eq("user_id", user.id)
      .eq("kind", "for_trade")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("goods_inventory")
      .select(
        "id, title, exchange_type, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .eq("user_id", user.id)
      .eq("kind", "wanted")
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
  ]);

  // メンバー名 → hue ハッシュ
  const nameToHue = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  };

  const pickName = (
    v: { name: string } | { name: string }[] | null,
  ): string | null => {
    if (!v) return null;
    return Array.isArray(v) ? v[0]?.name ?? null : v.name;
  };

  const inventoryItems = (inventoryRows ?? []).map((r) => {
    const charName = pickName(r.character);
    const grpName = pickName(r.group);
    const memberName = charName ?? grpName ?? r.title;
    return {
      id: r.id,
      title: r.title,
      photoUrl:
        (r.photo_urls && (r.photo_urls as string[])[0]) ?? null,
      groupName: grpName,
      characterName: charName,
      goodsTypeName: pickName(r.goods_type),
      hue:
        ((r as { hue?: number }).hue as number | undefined) ??
        nameToHue(memberName),
    };
  });

  const wishItems = (wishRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    exchangeType: (r as { exchange_type?: string }).exchange_type as
      | "same_kind"
      | "cross_kind"
      | "any"
      | undefined,
    groupName: pickName(r.group),
    characterName: pickName(r.character),
    goodsTypeName: pickName(r.goods_type),
  }));

  // 何もないと作成不能 → 案内表示
  if (inventoryItems.length === 0 || wishItems.length === 0) {
    return (
      <main className="flex flex-1 flex-col bg-[#fbf9fc]">
        <HeaderBack title="個別募集を追加" backHref="/listings" />
        <div className="mx-auto w-full max-w-md flex-1 px-5 pt-8">
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white p-6 text-center">
            <div className="text-[14px] font-bold text-gray-900">
              個別募集を作るには、譲と wish の両方が必要です
            </div>
            <div className="mt-2 space-y-1 text-[12px] text-gray-500">
              {inventoryItems.length === 0 && (
                <div>
                  譲るグッズがありません ·{" "}
                  <Link
                    href="/inventory/new"
                    className="font-bold text-[#a695d8]"
                  >
                    登録 →
                  </Link>
                </div>
              )}
              {wishItems.length === 0 && (
                <div>
                  wish がありません ·{" "}
                  <Link href="/wishes/new" className="font-bold text-[#a695d8]">
                    登録 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="個別募集を追加" backHref="/listings" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-5">
        <p className="mb-4 text-[12px] leading-relaxed text-gray-500">
          譲るグッズと求める wish をそれぞれ複数選び、AND/OR と数量を組み合わせて
          ピンポイントの交換条件を作ります。
        </p>
        <ListingNewForm
          inventoryItems={inventoryItems}
          wishItems={wishItems}
        />
      </div>
    </main>
  );
}
