"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInventoryStatus } from "./actions";
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

const SUB_IDS: SubTab[] = ["active", "keep", "traded"];

export function InventoryView({
  items,
}: {
  items: InventoryItemFull[];
}) {
  const router = useRouter();
  const [sub, setSub] = useState<SubTab>("active");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // iter98: フィルタを実データ駆動に。
  //   activeMember: null = すべて、それ以外 = memberName 完全一致
  //   activeType  : null = すべて、それ以外 = goodsType 完全一致
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  /** items から実在する memberName / goodsType だけを推し / 種別フィルタ候補に */
  const memberOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(it.memberName);
    return Array.from(s).sort();
  }, [items]);
  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(it.goodsType);
    return Array.from(s).sort();
  }, [items]);

  /** フィルタ適用後の items（status 別の集計はこの後で行う） */
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (activeMember && it.memberName !== activeMember) return false;
      if (activeType && it.goodsType !== activeType) return false;
      return true;
    });
  }, [items, activeMember, activeType]);

  // counts と itemsBySub はフィルタ後で計算
  const counts = useMemo(
    () => ({
      active: filteredItems.filter((i) => i.status === "active").length,
      keep: filteredItems.filter((i) => i.status === "keep").length,
      traded: filteredItems.filter((i) => i.status === "traded").length,
    }),
    [filteredItems],
  );
  const itemsBySub = useMemo(
    () => ({
      active: filteredItems.filter((i) => i.status === "active"),
      keep: filteredItems.filter((i) => i.status === "keep"),
      traded: filteredItems.filter((i) => i.status === "traded"),
    }),
    [filteredItems],
  );
  // carrying 関連は持参グッズ管理機能の廃止に伴い削除（iter65.6）

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

  // carrying / going_out の制御は持参グッズ機能の廃止により削除（iter65.6）

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[140px]">
      {/* ヘッダー */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-3 pt-12">
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
          </div>
        </div>

        {/* 持参グッズの設定はホーム > 現地交換モードへ移行（iter65.6） */}
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

      {/* フィルタチップ（推し / 種別） — iter98: 実データで動作 */}
      <div className="mx-auto w-full max-w-md px-4 pt-1.5">
        <FilterRow
          label="推し"
          options={memberOptions}
          active={activeMember}
          onChange={setActiveMember}
        />
        <FilterRow
          label="種別"
          options={typeOptions}
          active={activeType}
          onChange={setActiveType}
        />
      </div>

      {/* スワイプコンテナ（横スクロール + scroll snap） */}
      <div
        ref={scrollRef}
        className="mx-auto flex w-full max-w-md flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {SUB_IDS.map((subId) => (
          <SubPanel
            key={subId}
            subId={subId}
            items={itemsBySub[subId]}
            router={router}
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
}: {
  subId: SubTab;
  items: InventoryItemFull[];
  router: ReturnType<typeof useRouter>;
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

/**
 * iter98: 実データで動作する FilterRow。
 *
 * - options：items から動的に抽出した値（例：memberName / goodsType の Set）
 * - active：null = 「すべて」、それ以外 = 選択中の値
 * - 親が onChange で active を更新する
 * - options が空（在庫が無い）なら何も表示しない（ノイズ削減）
 */
export function FilterRow({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  active: string | null;
  onChange: (next: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-1.5 flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <span className="w-7 flex-shrink-0 pr-1 text-[9.5px] font-bold tracking-wider text-gray-500">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
          active === null
            ? "bg-[#a695d8] text-white"
            : "border-[0.5px] border-[#3a324a14] bg-white text-gray-900"
        }`}
      >
        すべて
      </button>
      {options.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          className={`flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
            active === f
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
          <Link
            href={`/inventory/${item.id}`}
            className="rounded-lg bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-1.5 text-center text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)]"
          >
            編集する
          </Link>
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
