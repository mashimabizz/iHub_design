"use client";

/**
 * iter143：WISH 画面を 2 タブ swipe + パネル形式に再設計。
 *
 * - Tab 1「WISH」：マイ在庫と同じ 3 カラム panel グリッド
 *   - 個別募集に紐付けされていない wish には「未紐付け」バッジ + 個別募集作成導線
 *   - 紐付けされている wish には「個別募集 N件」バッジ
 * - Tab 2「個別募集」：既存 ListingsView を再利用
 * - 「マッチ X件 検出中」バナーは廃止（ノイズになっていた）
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWishItem } from "./actions";
import { ListingsView, type ListingItem } from "../listings/ListingsView";

export type WishLink = {
  listingId: string;
  status: "active" | "paused" | "matched" | "closed";
};

export type WishItem = {
  id: string;
  title: string;
  note: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string;
  priority: "top" | "second" | "flexible" | null;
  flexLevel: "exact" | "character_any" | "series_any" | null;
  exchangeType: "same_kind" | "cross_kind" | "any";
  quantity: number;
  /** 0–360（ItemCard と同じ着色基準） */
  hue: number;
  createdAt: string; // ISO
  /** メイン画像 URL */
  photoUrl: string | null;
  /** iter143: 紐付け中の個別募集（active/paused/matched） */
  linkedListings: WishLink[];
};

type Tab = "wish" | "listings";
const TAB_IDS: Tab[] = ["wish", "listings"];

export function WishView({
  wishItems,
  listingItems,
}: {
  wishItems: WishItem[];
  listingItems: ListingItem[];
}) {
  const [tab, setTab] = useState<Tab>("wish");
  const scrollRef = useRef<HTMLDivElement>(null);

  // スワイプ位置 → タブ同期（debounce 付き）
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let frame: number | null = null;
    function onScroll() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container) return;
        const idx = Math.round(container.scrollLeft / container.clientWidth);
        const next = TAB_IDS[idx];
        if (next && next !== tab) setTab(next);
      });
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tab]);

  function selectTab(target: Tab) {
    setTab(target);
    const container = scrollRef.current;
    if (!container) return;
    const idx = TAB_IDS.indexOf(target);
    container.scrollTo({
      left: idx * container.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* ヘッダー（プロフ画面と同じパターン） */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-3 pt-12">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
            ウィッシュ
          </h1>
          {tab === "wish" ? (
            <Link
              href="/wishes/new"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[#a695d8] px-3.5 text-[11px] font-bold text-white transition-all duration-150 active:scale-[0.97]"
            >
              <PlusIcon />
              wish を追加
            </Link>
          ) : (
            <Link
              href="/listings/new"
              className="flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3.5 text-[11px] font-bold text-white shadow-[0_4px_10px_rgba(166,149,216,0.31)] transition-all duration-150 active:scale-[0.97]"
            >
              <PlusIcon />
              募集を追加
            </Link>
          )}
        </div>
      </div>

      {/* タブバー */}
      <div className="mx-auto w-full max-w-md px-4 pt-2.5">
        <div className="flex gap-1">
          <TabButton
            active={tab === "wish"}
            label="WISH"
            count={wishItems.length}
            onClick={() => selectTab("wish")}
            color="#a695d8"
          />
          <TabButton
            active={tab === "listings"}
            label="個別募集"
            count={listingItems.length}
            onClick={() => selectTab("listings")}
            color="#a8d4e6"
          />
        </div>
      </div>

      {/* スワイプコンテナ */}
      <div
        ref={scrollRef}
        className="mx-auto flex w-full max-w-md flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <WishPanel items={wishItems} />
        <ListingsPanel items={listingItems} />
      </div>
    </main>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
  color,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-1 rounded-xl py-2 transition-all ${
        active
          ? "border-[1.5px] border-solid bg-white"
          : "border-[0.5px] border-solid border-[#3a324a14] bg-[#3a324a08]"
      }`}
      style={{ borderColor: active ? color : undefined }}
    >
      <span
        className={`text-[12px] ${
          active
            ? "font-extrabold text-gray-900"
            : "font-semibold text-gray-500"
        }`}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-bold tabular-nums"
        style={{ color: active ? color : "#6b6478" }}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Tab 1: WISH パネル一覧 ───────────────────────────── */

function WishPanel({ items }: { items: WishItem[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("このウィッシュを削除しますか？")) return;
    const result = await deleteWishItem(id);
    if (result?.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pb-4 pt-3">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
          まだ wish がありません
          <br />
          <Link
            href="/wishes/new"
            className="mt-2 inline-block font-bold text-[#a695d8]"
          >
            + 探したいグッズを登録
          </Link>
        </div>
      ) : (
        // iter147: 各パネルがスタガーで pop-in
        <div className="grid grid-cols-3 gap-2.5">
          <div className="animate-panel-pop" style={{ animationDelay: "0ms" }}>
            <AddCard href="/wishes/new" />
          </div>
          {items.map((w, i) => (
            <div
              key={w.id}
              className="animate-panel-pop"
              style={{ animationDelay: `${(i + 1) * 45}ms` }}
            >
              <WishCardWrapper
                item={w}
                onDelete={() => handleDelete(w.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Tab 2: 個別募集（既存 ListingsView を流用） ───────── */

function ListingsPanel({ items }: { items: ListingItem[] }) {
  return (
    <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pb-4 pt-3">
      <ListingsView items={items} />
    </div>
  );
}

/* ─── WISH パネル（マイ在庫の ItemCard と同じ 3:4） ─────── */

function WishCardWrapper({
  item,
  onDelete,
}: {
  item: WishItem;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="block w-full"
      >
        <WishCard item={item} />
      </button>
      {showMenu && (
        <div className="absolute inset-0 z-10 flex flex-col items-stretch justify-center gap-1.5 rounded-xl bg-black/70 p-2">
          <Link
            href={`/wishes/${item.id}/edit`}
            className="rounded-lg bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-1.5 text-center text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)]"
          >
            編集する
          </Link>
          {/* iter143: いつでも個別募集の追加を可能にする
              （既に紐付け済でも、別条件の追加募集を作れるように） */}
          <Link
            href={`/listings/new?wishId=${item.id}`}
            className="rounded-lg bg-white py-1.5 text-center text-[10px] font-bold text-gray-900"
          >
            {item.linkedListings.length === 0
              ? "個別募集を作る"
              : "+ 個別募集を追加"}
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onDelete();
            }}
            className="rounded-lg bg-red-500/90 py-1.5 text-[10px] font-bold text-white"
          >
            削除
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
            className="rounded-lg bg-black/30 py-1.5 text-[10px] font-bold text-white"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}

function WishCard({ item }: { item: WishItem }) {
  const memberLabel = item.characterName ?? item.groupName ?? "?";
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${item.hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${item.hue}, 30%, 30%, 0.4)`;
  const hasPhoto = !!item.photoUrl;
  const linkedCount = item.linkedListings.length;
  const isUnlinked = linkedCount === 0;

  return (
    <div
      className="relative block overflow-hidden rounded-xl border border-[#3a324a14] shadow-[0_2px_6px_rgba(58,50,74,0.08)]"
      style={{
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      {/* 写真（存在時） */}
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={memberLabel}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* 上部：左にメンバー名 / 右に紐付けバッジ */}
      <div className="absolute inset-x-1.5 top-1.5 z-10 flex items-start justify-between gap-1">
        <div
          className={`min-w-0 truncate rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {memberLabel}
        </div>
        {isUnlinked ? (
          <span className="flex-shrink-0 rounded-md bg-[#d9826b] px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_2px_4px_rgba(217,130,107,0.35)]">
            未紐付け
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-md bg-[#a695d8] px-1.5 py-0.5 text-[8.5px] font-extrabold tabular-nums tracking-[0.3px] text-white shadow-[0_2px_4px_rgba(166,149,216,0.35)]">
            募集 {linkedCount}
          </span>
        )}
      </div>

      {/* 中央：イニシャル（写真なしのみ） */}
      {!hasPhoto && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {memberLabel[0]}
        </div>
      )}

      {/* 下部ストリップ：種別 + 数量 */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-1.5 pb-1.5 pt-1"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-bold leading-tight text-gray-900">
            {item.goodsTypeName}
          </div>
          {item.groupName && item.characterName && (
            <div className="mt-0.5 truncate text-[8.5px] leading-tight text-gray-500">
              {item.groupName}
            </div>
          )}
        </div>
        {item.quantity > 1 && (
          <div className="flex-shrink-0 rounded-md bg-[#a695d8] px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-white">
            ×{item.quantity}
          </div>
        )}
      </div>
    </div>
  );
}

function AddCard({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#a695d888] bg-white text-[#a695d8] transition-all duration-150 active:scale-[0.97]"
      style={{ aspectRatio: "3 / 4" }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="#a695d8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M14 4v20M4 14h20" />
      </svg>
      <span className="text-[10px] font-bold tracking-wide">追加</span>
    </a>
  );
}

function PlusIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M5.5 1v9M1 5.5h9" />
    </svg>
  );
}
