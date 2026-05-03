import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/home/BottomNav";
import {
  ListingsView,
  type ListingItem,
  type ListingHaveItem,
  type ListingWishItem,
} from "./ListingsView";

export const metadata = {
  title: "個別募集 — iHub",
};

type ListingRow = {
  id: string;
  have_ids: string[] | null;
  have_qtys: number[] | null;
  have_logic: "and" | "or";
  wish_ids: string[] | null;
  wish_qtys: number[] | null;
  wish_logic: "and" | "or";
  status: "active" | "paused" | "matched" | "closed";
  note: string | null;
  created_at: string;
};

type InvRow = {
  id: string;
  title: string;
  photo_urls: string[] | null;
  exchange_type: "same_kind" | "cross_kind" | "any";
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
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

  // 個別募集を fetch（譲・求は別 query で in-clause）
  const { data: rows } = await supabase
    .from("listings")
    .select(
      `id, have_ids, have_qtys, have_logic, wish_ids, wish_qtys, wish_logic, status, note, created_at`,
    )
    .eq("user_id", user.id)
    .neq("status", "closed")
    .order("created_at", { ascending: false });

  const listingRows = (rows as ListingRow[]) ?? [];

  // 全 have_ids / wish_ids を flatten して一括取得
  const allHaveIds = Array.from(
    new Set(listingRows.flatMap((r) => r.have_ids ?? [])),
  );
  const allWishIds = Array.from(
    new Set(listingRows.flatMap((r) => r.wish_ids ?? [])),
  );
  const allInvIds = Array.from(new Set([...allHaveIds, ...allWishIds]));

  let invById = new Map<string, InvRow>();
  if (allInvIds.length > 0) {
    const { data: invRows } = await supabase
      .from("goods_inventory")
      .select(
        "id, title, photo_urls, exchange_type, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)",
      )
      .in("id", allInvIds);
    if (invRows) {
      invById = new Map((invRows as InvRow[]).map((r) => [r.id, r]));
    }
  }

  function toHave(id: string, qty: number): ListingHaveItem | null {
    const r = invById.get(id);
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      qty,
      photoUrl: (r.photo_urls && r.photo_urls[0]) ?? null,
      groupName: pickOne(r.group)?.name ?? null,
      characterName: pickOne(r.character)?.name ?? null,
      goodsTypeName: pickOne(r.goods_type)?.name ?? null,
    };
  }
  function toWish(id: string, qty: number): ListingWishItem | null {
    const r = invById.get(id);
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      qty,
      exchangeType: r.exchange_type,
      groupName: pickOne(r.group)?.name ?? null,
      characterName: pickOne(r.character)?.name ?? null,
      goodsTypeName: pickOne(r.goods_type)?.name ?? null,
    };
  }

  const items: ListingItem[] = listingRows.map((r) => {
    const haveIds = r.have_ids ?? [];
    const haveQtys = r.have_qtys ?? [];
    const wishIds = r.wish_ids ?? [];
    const wishQtys = r.wish_qtys ?? [];
    const haves = haveIds
      .map((id, i) => toHave(id, haveQtys[i] ?? 1))
      .filter((x): x is ListingHaveItem => !!x);
    const wishes = wishIds
      .map((id, i) => toWish(id, wishQtys[i] ?? 1))
      .filter((x): x is ListingWishItem => !!x);
    return {
      id: r.id,
      haves,
      haveLogic: r.have_logic,
      wishes,
      wishLogic: r.wish_logic,
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
