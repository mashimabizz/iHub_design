"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteListing, updateListing } from "./actions";

export type ListingHaveItem = {
  id: string;
  title: string;
  qty: number;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

export type ListingWishItem = {
  id: string;
  title: string;
  qty: number;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

export type ListingOption = {
  id: string;
  position: number;
  logic: "and" | "or";
  exchangeType: "same_kind" | "cross_kind" | "any";
  isCashOffer: boolean;
  cashAmount: number | null;
  groupName: string | null;
  goodsTypeName: string | null;
  wishes: ListingWishItem[];
};

export type ListingItem = {
  id: string;
  haves: ListingHaveItem[];
  haveLogic: "and" | "or";
  haveGroupName: string | null;
  haveGoodsTypeName: string | null;
  options: ListingOption[];
  status: "active" | "paused" | "matched" | "closed";
  note: string | null;
};

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
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
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => handleDelete(it.id)}
                className="text-[10px] text-red-500"
              >
                削除
              </button>
            </div>

            {/* 譲群 */}
            <div className="px-3.5 pt-2">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a8d4e6]">
                  譲 ({it.haves.length})
                </span>
                {it.haveGroupName && it.haveGoodsTypeName && (
                  <span className="text-[10px] font-bold text-[#3a324a8c]">
                    {it.haveGroupName} × {it.haveGoodsTypeName}
                  </span>
                )}
                {it.haves.length > 1 && (
                  <span
                    className={`rounded-full px-1.5 py-[1px] text-[9.5px] font-extrabold ${
                      it.haveLogic === "and"
                        ? "bg-[#a695d8] text-white"
                        : "border border-[#a695d855] bg-white text-[#a695d8]"
                    }`}
                  >
                    {it.haveLogic === "and" ? "全部 AND" : "いずれか OR"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {it.haves.map((h) => (
                  <ItemChip key={h.id} item={h} accent="have" />
                ))}
              </div>
            </div>

            <div className="my-2 flex items-center justify-center text-[14px] font-bold text-[#3a324a8c]">
              ↔
            </div>

            {/* 求側選択肢 */}
            <div className="px-3.5">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#f3c5d4]">
                求 — 選択肢 {it.options.length}
              </div>
              <div className="space-y-2">
                {it.options.map((opt) => (
                  <OptionRow key={opt.id} option={opt} />
                ))}
              </div>
            </div>

            {it.note && (
              <div className="mx-3.5 my-2 rounded-lg bg-[#3a324a06] px-2.5 py-1.5 text-[11px] text-[#3a324a]">
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

function OptionRow({ option }: { option: ListingOption }) {
  return (
    <div className="rounded-xl border border-[#f3c5d433] bg-[#f3c5d40a] px-2.5 py-2">
      <div className="mb-1 flex flex-wrap items-baseline gap-1.5 text-[10.5px]">
        <span className="rounded-full bg-[#f3c5d4] px-1.5 py-[1px] text-[9.5px] font-extrabold text-[#3a324a]">
          #{option.position}
        </span>
        {option.isCashOffer ? (
          <span className="font-bold text-[#3a324a]">💴 定価交換</span>
        ) : (
          <>
            <span className="font-bold text-[#3a324a]">
              {option.groupName ?? "?"} × {option.goodsTypeName ?? "?"}
            </span>
            <span className="rounded-full border border-[#a695d855] bg-white px-1.5 py-[1px] text-[9px] font-extrabold text-[#a695d8]">
              {EXCHANGE_LABEL[option.exchangeType]}
            </span>
            {option.wishes.length > 1 && (
              <span
                className={`rounded-full px-1.5 py-[1px] text-[9px] font-extrabold ${
                  option.logic === "and"
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#a695d855] bg-white text-[#a695d8]"
                }`}
              >
                {option.logic === "and" ? "全部 AND" : "いずれか OR"}
              </span>
            )}
          </>
        )}
      </div>

      {option.isCashOffer ? (
        <div className="text-[12px] font-extrabold tabular-nums text-[#3a324a]">
          ¥{option.cashAmount?.toLocaleString() ?? "—"}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {option.wishes.map((w) => (
            <ItemChip key={w.id} item={w} accent="wish" small />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemChip({
  item,
  accent,
  small,
}: {
  item: ListingHaveItem | ListingWishItem;
  accent: "have" | "wish";
  small?: boolean;
}) {
  const name = item.characterName ?? item.groupName ?? item.title;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${small ? "px-2 py-[3px] text-[10.5px]" : "px-2.5 py-1 text-[11px]"} font-bold ${
        accent === "have"
          ? "border border-[#a8d4e655] bg-[#a8d4e60f] text-[#3a324a]"
          : "border border-[#f3c5d455] bg-white text-[#3a324a]"
      }`}
    >
      {name}
      <span className="ml-0.5 rounded-sm bg-[#3a324a14] px-1 text-[9px] font-extrabold tabular-nums text-[#3a324a]">
        ×{item.qty}
      </span>
    </span>
  );
}
