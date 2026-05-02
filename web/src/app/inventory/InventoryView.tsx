"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleCarryingAll,
  toggleGoingOut,
  toggleItemCarrying,
  updateInventoryStatus,
} from "./actions";
import { AddCard, ItemCard, type ItemCardData } from "./ItemCard";
import { BottomNav } from "@/components/home/BottomNav";

export type InventoryItemFull = ItemCardData & {
  status: "active" | "keep" | "traded" | "reserved" | "archived";
  groupName: string | null;
};

type SubTab = "active" | "keep" | "traded";

const SUB_TABS: { id: SubTab; label: string; color: string }[] = [
  { id: "active", label: "譲る候補", color: "#a695d8" },
  { id: "keep", label: "自分用キープ", color: "#f3c5d4" },
  { id: "traded", label: "過去に譲った", color: "#9aa3b0" },
];

const PUSHI_FILTERS = ["すべて", "LUMENA", "スア", "ヒナ", "+ 他"];
const TYPE_FILTERS = [
  "すべて",
  "トレカ",
  "生写真",
  "缶バッジ",
  "アクスタ",
  "スロガン",
];

const SUB_IDS: SubTab[] = ["active", "keep", "traded"];

export function InventoryView({
  items,
  isGoingOut: initialIsGoingOut,
}: {
  items: InventoryItemFull[];
  isGoingOut: boolean;
}) {
  const router = useRouter();
  const [sub, setSub] = useState<SubTab>("active");
  const [isGoingOut, setIsGoingOut] = useState(initialIsGoingOut);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => ({
      active: items.filter((i) => i.status === "active").length,
      keep: items.filter((i) => i.status === "keep").length,
      traded: items.filter((i) => i.status === "traded").length,
    }),
    [items],
  );
  const itemsBySub = useMemo(
    () => ({
      active: items.filter((i) => i.status === "active"),
      keep: items.filter((i) => i.status === "keep"),
      traded: items.filter((i) => i.status === "traded"),
    }),
    [items],
  );
  const carryCount = items.filter(
    (i) => i.status === "active" && i.carrying,
  ).length;

  // スワイプ位置からタブを更新（debounce 付き）
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let frame: number | null = null;
    function onScroll() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container) return;
        const idx = Math.round(container.scrollLeft / container.clientWidth);
        const next = SUB_IDS[idx];
        if (next && next !== sub) setSub(next);
      });
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sub]);

  // タブクリック時にスムーズスクロール
  function selectSub(target: SubTab) {
    setSub(target);
    const container = scrollRef.current;
    if (!container) return;
    const idx = SUB_IDS.indexOf(target);
    container.scrollTo({
      left: idx * container.clientWidth,
      behavior: "smooth",
    });
  }

  function handleToggleGoingOut() {
    const next = !isGoingOut;
    setIsGoingOut(next);
    startTransition(async () => {
      await toggleGoingOut(next);
      router.refresh();
    });
  }

  function handleCarryingToggleItem(id: string, next: boolean) {
    startTransition(async () => {
      await toggleItemCarrying(id, next);
      router.refresh();
    });
  }

  function handleAllCarrying(next: boolean) {
    setShowMoreMenu(false);
    startTransition(async () => {
      await toggleCarryingAll(next);
      router.refresh();
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[140px]">
      {/* ヘッダー */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-2 pt-12">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
            マイ在庫
          </h1>
          <div className="relative flex gap-1.5">
            <IconButton ariaLabel="フィルタ">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#3a324a"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 4h10M3.5 7h7M5 10h4" />
              </svg>
            </IconButton>
            <IconButton ariaLabel="検索">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#3a324a"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="6" cy="6" r="4" fill="none" />
                <path d="M9.5 9.5L12 12" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel="その他"
              onClick={() => setShowMoreMenu((v) => !v)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="#3a324a"
              >
                <circle cx="3" cy="7" r="1.4" />
                <circle cx="7" cy="7" r="1.4" />
                <circle cx="11" cy="7" r="1.4" />
              </svg>
            </IconButton>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-[#3a324a14] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => handleAllCarrying(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] hover:bg-[#a695d810]"
                >
                  🎒 譲る候補を全部持参
                </button>
                <button
                  type="button"
                  onClick={() => handleAllCarrying(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] hover:bg-[#a695d810]"
                >
                  🏠 全部置いていく
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 外出モードバナー */}
        <button
          type="button"
          onClick={handleToggleGoingOut}
          disabled={pending}
          className={`mx-auto mt-2.5 flex w-full max-w-md items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-50 ${
            isGoingOut
              ? "border-[#a695d855] bg-[linear-gradient(120deg,#a695d826,#f3c5d426)]"
              : "border-[#3a324a14] bg-[#3a324a06]"
          }`}
        >
          {/* アイコン */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] text-xl transition-all ${
              isGoingOut
                ? "bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] shadow-[0_4px_10px_rgba(166,149,216,0.4)]"
                : "bg-white border border-[#3a324a14]"
            }`}
          >
            {isGoingOut ? "📍" : "🏠"}
          </div>

          {/* テキスト */}
          <div className="min-w-0 flex-1">
            <div
              className={`text-[14px] font-extrabold ${
                isGoingOut ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {isGoingOut ? "会場で交換可能" : "自宅"}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
              {isGoingOut ? (
                <>
                  持参中の{" "}
                  <b className="text-[#a695d8] tabular-nums">{carryCount}</b>{" "}
                  点が交換対象です
                </>
              ) : (
                <>交換は受け付けていません（タップで切替）</>
              )}
            </div>
          </div>

          {/* スイッチ視覚 */}
          <div
            className="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors"
            style={{
              background: isGoingOut ? "#a695d8" : "#3a324a14",
            }}
          >
            <div
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-all"
              style={{ left: isGoingOut ? "22px" : "2px" }}
            />
          </div>
        </button>
      </div>

      {/* サブタブ（active/keep/traded）- タップ + スワイプ対応 */}
      <div className="mx-auto w-full max-w-md px-4 pt-2.5">
        <div className="flex gap-1">
          {SUB_TABS.map((s) => {
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSub(s.id)}
                className={`relative flex flex-1 items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                  active
                    ? "border-[1.5px] border-solid bg-white"
                    : "border-[0.5px] border-solid border-[#3a324a14] bg-[#3a324a08]"
                }`}
                style={{
                  borderColor: active ? s.color : undefined,
                }}
              >
                <span
                  className={`text-[12px] ${
                    active
                      ? "font-extrabold text-gray-900"
                      : "font-semibold text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: active ? s.color : "#6b6478" }}
                >
                  {counts[s.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* フィルタチップ（推し / 種別） */}
      <div className="mx-auto w-full max-w-md px-4 pt-1.5">
        <FilterRow label="推し" items={PUSHI_FILTERS} />
        <FilterRow label="種別" items={TYPE_FILTERS} />
      </div>

      {/* スワイプコンテナ（横スクロール + scroll snap） */}
      <div
        ref={scrollRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {SUB_IDS.map((subId) => (
          <SubPanel
            key={subId}
            subId={subId}
            items={itemsBySub[subId]}
            router={router}
            onCarryingToggle={handleCarryingToggleItem}
          />
        ))}
      </div>

    </main>
  );
}

/**
 * 在庫専用フッター（CTA + BottomNav を一体化したブロック）
 * inventory/page.tsx で <BottomNav /> の代わりに使う。
 * CTA と BottomNav が背景連続でぴったりくっつく。
 */
export function InventoryFooter() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#a695d822] bg-white/95 backdrop-blur-xl">
      {/* CTA バー */}
      <div className="mx-auto max-w-md px-[18px] pb-2 pt-3">
        <Link
          href="/inventory/new"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] text-[14.5px] font-bold tracking-wider text-white shadow-[0_6px_16px_rgba(166,149,216,0.4)] transition-all duration-150 active:scale-[0.97]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M7 1v12M1 7h12" />
          </svg>
          グッズを登録
        </Link>
      </div>

      {/* BottomNav（背景は共有・border のみで区切る） */}
      <div className="border-t border-gray-200/50">
        <div className="mx-auto flex max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
          <BottomNav inline />
        </div>
      </div>
    </div>
  );
}

function SubPanel({
  subId,
  items,
  router,
  onCarryingToggle,
}: {
  subId: SubTab;
  items: InventoryItemFull[];
  router: ReturnType<typeof useRouter>;
  onCarryingToggle: (id: string, next: boolean) => void;
}) {
  return (
    <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pb-4 pt-2">
      {/* 説明バナー（keep / traded のみ） */}
      {subId === "keep" && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-[0.5px] border-[#f3c5d455] bg-[#f3c5d41a] px-3 py-2.5 text-[11.5px] leading-snug text-gray-900">
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#f3c5d4] text-[10px]">
            🔒
          </span>
          <div>
            <b>自分用キープ</b>
            <span className="text-gray-500">
              {" "}
              — マッチング・打診の対象外。コレクションには反映されます
            </span>
          </div>
        </div>
      )}
      {subId === "traded" && (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-[#3a324a08] px-3 py-2.5 text-[11.5px] leading-snug text-gray-500">
          <span className="flex-shrink-0">📦</span>
          <div>
            過去に譲ったアイテムの履歴。コレクションには「取得経験あり」として残ります
          </div>
        </div>
      )}

      {/* グリッド */}
      <div className="grid grid-cols-3 gap-2.5">
        {subId === "active" && <AddCard href="/inventory/new" />}
        {items.length === 0 && subId !== "active" && (
          <div className="col-span-3 rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
            {subId === "keep"
              ? "自分用キープのアイテムはまだありません"
              : "譲ったアイテムはまだありません"}
          </div>
        )}
        {items.map((item) => (
          <ItemCardWrapper
            key={item.id}
            item={item}
            currentSub={subId}
            router={router}
            onCarryingToggle={onCarryingToggle}
          />
        ))}
      </div>
    </div>
  );
}

function IconButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#3a324a14] bg-white"
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  const [active, setActive] = useState(0);
  return (
    <div className="mb-1.5 flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <span className="w-7 flex-shrink-0 pr-1 text-[9.5px] font-bold tracking-wider text-gray-500">
        {label}
      </span>
      {items.map((f, i) => (
        <button
          key={f}
          type="button"
          onClick={() => setActive(i)}
          className={`flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
            active === i
              ? "bg-[#a695d8] text-white"
              : "border-[0.5px] border-[#3a324a14] bg-white text-gray-900"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function ItemCardWrapper({
  item,
  currentSub,
  router,
  onCarryingToggle,
}: {
  item: InventoryItemFull;
  currentSub: SubTab;
  router: ReturnType<typeof useRouter>;
  onCarryingToggle: (id: string, next: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  async function changeStatus(
    status: "active" | "keep" | "traded" | "archived",
  ) {
    setShowMenu(false);
    const result = await updateInventoryStatus(item.id, status);
    if (result?.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="block w-full"
      >
        <ItemCard item={item} onCarryingToggle={onCarryingToggle} />
      </button>
      {showMenu && (
        <div className="absolute inset-0 z-10 flex flex-col items-stretch justify-center gap-1.5 rounded-xl bg-black/70 p-2">
          {currentSub !== "active" && (
            <button
              type="button"
              onClick={() => changeStatus("active")}
              className="rounded-lg bg-white py-1.5 text-[10px] font-bold text-gray-900"
            >
              譲る候補に
            </button>
          )}
          {currentSub !== "keep" && (
            <button
              type="button"
              onClick={() => changeStatus("keep")}
              className="rounded-lg bg-white py-1.5 text-[10px] font-bold text-gray-900"
            >
              キープに
            </button>
          )}
          {currentSub !== "traded" && (
            <button
              type="button"
              onClick={() => changeStatus("traded")}
              className="rounded-lg bg-white py-1.5 text-[10px] font-bold text-gray-900"
            >
              譲渡履歴へ
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMenu(false)}
            className="rounded-lg bg-black/30 py-1.5 text-[10px] font-bold text-white"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
