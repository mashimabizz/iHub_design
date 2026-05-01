"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleCarryingAll,
  updateInventoryStatus,
} from "./actions";
import { AddCard, ItemCard, type ItemCardData } from "./ItemCard";

export type InventoryItemFull = ItemCardData & {
  status: "active" | "keep" | "traded" | "reserved" | "archived";
  groupName: string | null;
};

type SubTab = "active" | "keep" | "traded";

const SUB_TABS: { id: SubTab; label: string; sub: string; color: string }[] = [
  {
    id: "active",
    label: "譲る候補",
    sub: "マッチ対象",
    color: "#a695d8",
  },
  {
    id: "keep",
    label: "自分用キープ",
    sub: "マッチ対象外",
    color: "#f3c5d4",
  },
  {
    id: "traded",
    label: "過去に譲った",
    sub: "履歴",
    color: "#9aa3b0",
  },
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

export function InventoryView({
  items,
  carrying: initialCarrying,
}: {
  items: InventoryItemFull[];
  carrying: boolean;
}) {
  const router = useRouter();
  const [sub, setSub] = useState<SubTab>("active");
  const [carrying, setCarrying] = useState(initialCarrying);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      active: items.filter((i) => i.status === "active").length,
      keep: items.filter((i) => i.status === "keep").length,
      traded: items.filter((i) => i.status === "traded").length,
    }),
    [items],
  );
  const filtered = items.filter((i) => i.status === sub);
  const carryCount = items.filter(
    (i) => i.status === "active" && i.carrying,
  ).length;

  function handleToggleCarrying() {
    const next = !carrying;
    setCarrying(next);
    startTransition(async () => {
      await toggleCarryingAll(next);
      router.refresh();
    });
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[120px]">
      {/* ヘッダー */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-2 pt-12">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
            マイ在庫
          </h1>
          <div className="flex gap-1.5">
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
          </div>
        </div>

        {/* 携帯モードトグル */}
        <div
          className={`mx-auto mt-2.5 flex max-w-md items-center gap-2.5 rounded-2xl border px-3 py-2.5 ${
            carrying
              ? "border-[#a695d855] bg-[linear-gradient(120deg,#a695d826,#f3c5d426)]"
              : "border-[#3a324a0f] bg-[#3a324a06]"
          }`}
        >
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border-[0.5px] ${
              carrying
                ? "border-transparent bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] shadow-[0_4px_10px_rgba(166,149,216,0.4)]"
                : "border-[#3a324a14] bg-white"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke={carrying ? "#fff" : "#6b6478"}
              strokeWidth="1.5"
            >
              <rect x="3" y="5" width="12" height="10" rx="2" />
              <path d="M6 5V3.5C6 2.5 7 2 9 2s3 .5 3 1.5V5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`text-[13.5px] font-bold ${
                carrying ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {carrying ? "【携帯中】今日持参中" : "【自宅】保管中"}
            </div>
            <div className="mt-0.5 text-[10.5px] tabular-nums text-gray-500">
              {carrying
                ? `${carryCount} 点を会場で交換可能`
                : "タップで携帯モードに切替"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleCarrying}
            disabled={pending}
            className="relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-50"
            style={{
              background: carrying ? "#a695d8" : "#3a324a14",
            }}
            aria-label="携帯モードを切替"
          >
            <div
              className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-all"
              style={{ left: carrying ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      {/* サブタブ（active/keep/traded） */}
      <div className="mx-auto w-full max-w-md px-4 pt-3">
        <div className="flex gap-1">
          {SUB_TABS.map((s) => {
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSub(s.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all ${
                  active
                    ? "border-[1.5px] border-solid bg-white"
                    : "border-[0.5px] border-solid border-[#3a324a14] bg-[#3a324a08]"
                }`}
                style={{
                  borderColor: active ? s.color : undefined,
                }}
              >
                <div
                  className={`text-[12px] ${
                    active ? "font-extrabold text-gray-900" : "font-semibold text-gray-500"
                  }`}
                >
                  {s.label}
                  <span
                    className="ml-1 text-[10px] font-bold tabular-nums"
                    style={{ color: active ? s.color : "#6b6478" }}
                  >
                    {counts[s.id]}
                  </span>
                </div>
                <div className="text-[9px] text-gray-500">{s.sub}</div>
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

      {/* サブビュー説明バナー */}
      {sub === "keep" && (
        <div className="mx-auto mx-4 mt-1 mb-2 w-[calc(100%-32px)] max-w-[calc(28rem-32px)] flex items-start gap-2 rounded-xl border-[0.5px] border-[#f3c5d455] bg-[#f3c5d41a] px-3 py-2.5 text-[11.5px] leading-snug text-gray-900">
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
      {sub === "traded" && (
        <div className="mx-auto mx-4 mt-1 mb-2 w-[calc(100%-32px)] max-w-[calc(28rem-32px)] flex items-start gap-2 rounded-xl bg-[#3a324a08] px-3 py-2.5 text-[11.5px] leading-snug text-gray-500">
          <span className="flex-shrink-0">📦</span>
          <div>
            過去に譲ったアイテムの履歴。コレクションには「取得経験あり」として残ります
          </div>
        </div>
      )}

      {/* グリッド */}
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pt-2">
        <div className="grid grid-cols-3 gap-2.5">
          {sub === "active" && <AddCard href="/inventory/new" />}
          {filtered.length === 0 && sub !== "active" && (
            <div className="col-span-3 rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
              {sub === "keep"
                ? "自分用キープのアイテムはまだありません"
                : "譲ったアイテムはまだありません"}
            </div>
          )}
          {filtered.map((item) => (
            <ItemCardWrapper
              key={item.id}
              item={item}
              currentSub={sub}
              router={router}
            />
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-[88px] left-0 right-0 z-20 border-t border-[#a695d822] bg-white/92 px-[18px] pb-3 pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            className="flex h-12 items-center gap-1.5 rounded-2xl border border-[#3a324a14] bg-white px-4 text-[13px] font-semibold text-gray-900"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              stroke="#3a324a"
              strokeWidth="1.4"
            >
              <path d="M2 5l4-3 4 3v6H2zM5 11V8h2v3" />
            </svg>
            セット
          </button>
          <Link
            href="/inventory/new"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] text-[14.5px] font-bold tracking-wider text-white shadow-[0_6px_16px_rgba(166,149,216,0.4)] transition-all duration-150 active:scale-[0.97]"
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
            譲るものを追加
          </Link>
        </div>
      </div>
    </main>
  );
}

function IconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
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
}: {
  item: InventoryItemFull;
  currentSub: SubTab;
  router: ReturnType<typeof useRouter>;
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
        <ItemCard item={item} />
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
