import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/home/BottomNav";
import { ListingsView, type ListingItem } from "./ListingsView";

export const metadata = {
  title: "個別募集 — iHub",
};

type ListingRow = {
  id: string;
  inventory_id: string;
  wish_id: string;
  exchange_type: "same_kind" | "cross_kind" | "any";
  ratio_give: number;
  ratio_receive: number;
  priority: number;
  status: "active" | "paused" | "matched" | "closed";
  note: string | null;
  created_at: string;
  inventory:
    | {
        title: string;
        photo_urls: string[];
        group: { name: string } | { name: string }[] | null;
        character: { name: string } | { name: string }[] | null;
        goods_type: { name: string } | { name: string }[] | null;
      }
    | {
        title: string;
        photo_urls: string[];
        group: { name: string } | { name: string }[] | null;
        character: { name: string } | { name: string }[] | null;
        goods_type: { name: string } | { name: string }[] | null;
      }[]
    | null;
  wish:
    | {
        title: string;
        group: { name: string } | { name: string }[] | null;
        character: { name: string } | { name: string }[] | null;
        goods_type: { name: string } | { name: string }[] | null;
      }
    | {
        title: string;
        group: { name: string } | { name: string }[] | null;
        character: { name: string } | { name: string }[] | null;
        goods_type: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function pickOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function ListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("listings")
    .select(
      `id, inventory_id, wish_id, exchange_type, ratio_give, ratio_receive, priority, status, note, created_at,
       inventory:goods_inventory!listings_inventory_id_fkey(title, photo_urls, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)),
       wish:goods_inventory!listings_wish_id_fkey(title, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name))`,
    )
    .eq("user_id", user.id)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  const items: ListingItem[] = ((rows as ListingRow[]) ?? []).map((r) => {
    const inv = pickOne(r.inventory);
    const wish = pickOne(r.wish);
    return {
      id: r.id,
      inventory: inv
        ? {
            title: inv.title,
            photoUrl: (inv.photo_urls && inv.photo_urls[0]) ?? null,
            groupName: pickOne(inv.group)?.name ?? null,
            characterName: pickOne(inv.character)?.name ?? null,
            goodsTypeName: pickOne(inv.goods_type)?.name ?? null,
          }
        : null,
      wish: wish
        ? {
            title: wish.title,
            groupName: pickOne(wish.group)?.name ?? null,
            characterName: pickOne(wish.character)?.name ?? null,
            goodsTypeName: pickOne(wish.goods_type)?.name ?? null,
          }
        : null,
      exchangeType: r.exchange_type,
      ratioGive: r.ratio_give,
      ratioReceive: r.ratio_receive,
      priority: r.priority,
      status: r.status,
      note: r.note,
    };
  });

  return (
    <>
      <main
        className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]"
        style={{
          fontFamily: '"Noto Sans JP", -apple-system, system-ui',
          color: "#3a324a",
        }}
      >
        <div className="h-[60px]" />
        <div className="border-b border-[#3a324a0f] bg-white px-[18px] pb-[10px] pt-3">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <div>
              <div className="text-[19px] font-extrabold tracking-[0.3px] text-[#3a324a]">
                個別募集
              </div>
              <div className="mt-[1px] text-[11px] text-[#3a324a8c]">
                譲 × wish にピンポイント条件をつけて募集
              </div>
            </div>
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-[5px] rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-[14px] py-2 text-[12px] font-bold text-white shadow-[0_4px_10px_rgba(166,149,216,0.31)] transition-all duration-150 active:scale-[0.97]"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M5.5 1v9M1 5.5h9" />
              </svg>
              募集を追加
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pt-4">
          <ListingsView items={items} />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
