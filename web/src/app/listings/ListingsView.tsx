"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteListing, updateListing } from "./actions";

export type ListingItem = {
  id: string;
  inventory: {
    title: string;
    photoUrl: string | null;
    groupName: string | null;
    characterName: string | null;
    goodsTypeName: string | null;
  } | null;
  wish: {
    title: string;
    groupName: string | null;
    characterName: string | null;
    goodsTypeName: string | null;
  } | null;
  exchangeType: "same_kind" | "cross_kind" | "any";
  ratioGive: number;
  ratioReceive: number;
  priority: number;
  status: "active" | "paused" | "matched" | "closed";
  note: string | null;
};

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種のみ",
  cross_kind: "異種のみ",
  any: "どちらでも",
};

export function ListingsView({ items }: { items: ListingItem[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("この個別募集を削除しますか？")) return;
    const r = await deleteListing(id);
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  async function togglePause(id: string, currentStatus: ListingItem["status"]) {
    const next = currentStatus === "active" ? "paused" : "active";
    const r = await updateListing({ id, status: next });
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
        まだ個別募集がありません
        <br />
        <Link
          href="/listings/new"
          className="mt-2 inline-block font-bold text-[#a695d8]"
        >
          + 個別募集を追加
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const isActive = it.status === "active";
        const isPaused = it.status === "paused";
        const inv = it.inventory;
        const wish = it.wish;
        return (
          <div
            key={it.id}
            className={`overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] ${
              isActive
                ? "border-[#a695d855]"
                : "border-[#3a324a14] opacity-70"
            }`}
          >
            <div className="flex items-center gap-2.5 px-3.5 pt-3">
              <span
                className={`rounded-full px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.5px] ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : isPaused
                      ? "bg-[#3a324a14] text-[#3a324a8c]"
                      : "bg-[#a8d4e620] text-[#5a9bbe]"
                }`}
              >
                {isActive
                  ? "ACTIVE"
                  : isPaused
                    ? "一時停止"
                    : it.status.toUpperCase()}
              </span>
              <span className="rounded bg-[#a695d80f] px-2 py-0.5 text-[10px] font-bold text-[#a695d8]">
                優先度 {it.priority}
              </span>
              <span className="rounded-full border border-[#a695d855] bg-[#a695d80a] px-2 py-0.5 text-[10px] font-bold text-[#a695d8]">
                {EXCHANGE_LABEL[it.exchangeType]}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => handleDelete(it.id)}
                className="text-[10px] text-red-500"
              >
                削除
              </button>
            </div>

            {/* 譲 */}
            <div className="mt-2.5 flex gap-3 px-3.5">
              {inv?.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inv.photoUrl}
                  alt=""
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a8d4e6]">
                  譲
                </div>
                <div className="mt-0.5 truncate text-[13px] font-bold text-gray-900">
                  {inv
                    ? inv.characterName ?? inv.groupName ?? inv.title
                    : "（在庫なし）"}
                </div>
                <div className="text-[11px] text-gray-500">
                  {inv?.goodsTypeName ?? ""}
                </div>
              </div>
            </div>

            {/* 比率 */}
            <div className="mx-3.5 mt-2 flex items-center justify-center gap-1 rounded-lg bg-[#a695d80a] py-1.5">
              <span className="text-[14px] font-extrabold tabular-nums text-[#a695d8]">
                {it.ratioGive}
              </span>
              <span className="text-[10px] font-bold text-[#3a324a8c]">譲</span>
              <span className="mx-2 text-[14px] font-bold text-[#3a324a8c]">
                ↔
              </span>
              <span className="text-[14px] font-extrabold tabular-nums text-[#a695d8]">
                {it.ratioReceive}
              </span>
              <span className="text-[10px] font-bold text-[#3a324a8c]">受</span>
            </div>

            {/* wish */}
            <div className="mt-2 flex gap-3 px-3.5 pb-2.5">
              <div className="h-16 w-16 flex-shrink-0 rounded-lg border border-dashed border-[#f3c5d4] bg-[#f3c5d40f]" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#f3c5d4]">
                  受（求）
                </div>
                <div className="mt-0.5 truncate text-[13px] font-bold text-gray-900">
                  {wish
                    ? wish.characterName ?? wish.groupName ?? wish.title
                    : "（wish なし）"}
                </div>
                <div className="text-[11px] text-gray-500">
                  {wish?.goodsTypeName ?? ""}
                </div>
              </div>
            </div>

            {it.note && (
              <div className="mx-3.5 mb-2 rounded-lg bg-[#3a324a06] px-2.5 py-1.5 text-[11px] text-[#3a324a]">
                {it.note}
              </div>
            )}

            <div className="flex gap-1.5 border-t border-[#3a324a08] px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => togglePause(it.id, it.status)}
                disabled={it.status === "matched" || it.status === "closed"}
                className="flex-1 rounded-[10px] bg-[#3a324a08] py-2 text-[11px] font-bold text-[#3a324a] disabled:opacity-50"
              >
                {isPaused ? "再開" : "一時停止"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
