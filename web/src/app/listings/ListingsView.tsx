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
  exchangeType: "same_kind" | "cross_kind" | "any";
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

export type ListingItem = {
  id: string;
  haves: ListingHaveItem[];
  haveLogic: "and" | "or";
  wishes: ListingWishItem[];
  wishLogic: "and" | "or";
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
            {/* status 帯 */}
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
            <Side
              kind="have"
              items={it.haves}
              logic={it.haveLogic}
              colorAccent="#a8d4e6"
              labelText="譲"
            />

            <div className="mx-3.5 my-1 flex items-center justify-center text-[14px] font-bold text-[#3a324a8c]">
              ↔
            </div>

            {/* 求群 */}
            <Side
              kind="wish"
              items={it.wishes}
              logic={it.wishLogic}
              colorAccent="#f3c5d4"
              labelText="求"
            />

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

function Side({
  kind,
  items,
  logic,
  colorAccent,
  labelText,
}: {
  kind: "have" | "wish";
  items: ListingHaveItem[] | ListingWishItem[];
  logic: "and" | "or";
  colorAccent: string;
  labelText: string;
}) {
  const isMulti = items.length > 1;
  const logicLabel = logic === "and" ? "全部 AND" : "いずれか OR";

  return (
    <div className="px-3.5 pt-2">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: colorAccent }}
        >
          {labelText} ({items.length})
        </span>
        {isMulti && (
          <span
            className={`rounded-full px-1.5 py-[1px] text-[9.5px] font-extrabold ${
              logic === "and"
                ? "bg-[#a695d8] text-white"
                : "border border-[#a695d855] bg-white text-[#a695d8]"
            }`}
          >
            {logicLabel}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <ItemChip key={it.id} item={it} kind={kind} />
        ))}
      </div>
    </div>
  );
}

function ItemChip({
  item,
  kind,
}: {
  item: ListingHaveItem | ListingWishItem;
  kind: "have" | "wish";
}) {
  const name = item.characterName ?? item.groupName ?? item.title;
  const exchangeType =
    kind === "wish"
      ? (item as ListingWishItem).exchangeType
      : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        kind === "have"
          ? "border border-[#a8d4e655] bg-[#a8d4e60f] text-[#3a324a]"
          : "border border-[#f3c5d455] bg-[#f3c5d40f] text-[#3a324a]"
      }`}
    >
      {name}
      {item.goodsTypeName && (
        <span className="text-[9.5px] font-semibold text-[#3a324a8c]">
          · {item.goodsTypeName}
        </span>
      )}
      <span className="ml-0.5 rounded-sm bg-[#3a324a14] px-1 text-[9.5px] font-extrabold tabular-nums text-[#3a324a]">
        ×{item.qty}
      </span>
      {exchangeType && exchangeType !== "any" && (
        <span className="ml-0.5 text-[9px] font-bold text-[#a695d8]">
          {EXCHANGE_LABEL[exchangeType]}
        </span>
      )}
    </span>
  );
}
