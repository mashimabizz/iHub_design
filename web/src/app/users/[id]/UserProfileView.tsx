"use client";

/**
 * iter146：他人プロフィール画面の再設計。
 *
 * - hero パネル：上半分のみ（avatar + handle + name + area）。
 *   右側に「★平均 (件数)」を配置。タップで /users/[id]/evaluations へ
 * - 下半分の数字メトリクス行は撤去
 * - 譲るグッズ / 公開中の個別募集 を 2 タブ scroll-snap でスワイプ
 * - 個別募集タブは ListingsView を readOnly モードで再利用
 * - 評価コメント一覧は別画面 /users/[id]/evaluations に移行
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ItemCard, type ItemCardData } from "@/app/inventory/ItemCard";
import { FilterRow } from "@/app/inventory/InventoryView";
import {
  ListingsView,
  type ListingItem,
} from "@/app/listings/ListingsView";

export type PartnerInventoryItem = {
  id: string;
  memberName: string;
  goodsType: string;
  qty: number;
  hue: number;
  photoUrl: string | null;
};

export type UserProfileData = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  primaryArea: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  completedTradeCount: number;
  inventoryItems: PartnerInventoryItem[];
  /** iter146: 公開中の個別募集（ListingsView 形式） */
  listingItems: ListingItem[];
};

type Tab = "inventory" | "listings";
const TAB_IDS: Tab[] = ["inventory", "listings"];

export function UserProfileView({ profile }: { profile: UserProfileData }) {
  const [tab, setTab] = useState<Tab>("inventory");
  const scrollRef = useRef<HTMLDivElement>(null);

  // スワイプ位置 → タブ同期
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
    <div className="flex flex-1 flex-col pb-20">
      {/* hero — iter146: 上半分のみ。右に評価 (タップで評価一覧へ) */}
      <div
        className="overflow-hidden rounded-2xl p-5 text-white shadow-[0_10px_24px_rgba(166,149,216,0.30)]"
        style={{
          background: "linear-gradient(135deg, #a695d8, #a8d4e6)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-white/30"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.handle}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[22px] font-extrabold">
                {profile.displayName[0] || "?"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-extrabold">
              @{profile.handle}
            </div>
            <div className="mt-0.5 text-[12px] font-bold opacity-90">
              {profile.displayName}
            </div>
            <div className="mt-0.5 text-[10.5px] opacity-85">
              {profile.primaryArea ?? "エリア未設定"} ・ 取引{" "}
              {profile.completedTradeCount} 回
            </div>
          </div>
          {/* iter146: 右側の評価サマリ — タップで評価一覧へ */}
          <Link
            href={`/users/${profile.id}/evaluations`}
            aria-label="評価一覧を見る"
            className="flex flex-shrink-0 flex-col items-center justify-center rounded-[12px] bg-white/15 px-2.5 py-1.5 backdrop-blur-sm transition-all active:scale-[0.96] active:bg-white/25"
          >
            <span
              className="text-[15px] font-extrabold leading-none"
              style={{ fontFamily: '"Inter Tight", sans-serif' }}
            >
              {profile.ratingAvg !== null
                ? `★${profile.ratingAvg.toFixed(1)}`
                : "★—"}
            </span>
            <span className="mt-0.5 text-[9.5px] tabular-nums opacity-90">
              {profile.ratingCount} 件
            </span>
            <span className="mt-0.5 text-[8.5px] tracking-wide opacity-80">
              詳細 ›
            </span>
          </Link>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/propose/${profile.id}`}
        className="mt-3 block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-[14px] font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)]"
      >
        💬 このユーザーに打診する →
      </Link>

      {/* タブバー */}
      <div className="mt-4 flex gap-1">
        <TabButton
          active={tab === "inventory"}
          label="譲るグッズ"
          count={profile.inventoryItems.length}
          color="#a695d8"
          onClick={() => selectTab("inventory")}
        />
        <TabButton
          active={tab === "listings"}
          label="公開中の個別募集"
          count={profile.listingItems.length}
          color="#a8d4e6"
          onClick={() => selectTab("listings")}
        />
      </div>

      {/* スワイプコンテナ */}
      <div
        ref={scrollRef}
        className="-mx-5 mt-3 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <InventoryPanel items={profile.inventoryItems} />
        <ListingsPanel items={profile.listingItems} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
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

/* ─── Tab 1: 譲るグッズ ────────────────────────────────── */

function InventoryPanel({ items }: { items: PartnerInventoryItem[] }) {
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (activeMember && it.memberName !== activeMember) return false;
      if (activeType && it.goodsType !== activeType) return false;
      return true;
    });
  }, [items, activeMember, activeType]);

  return (
    <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-5 pb-4">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-6 text-center text-[11px] text-[#3a324a8c]">
          譲る候補のグッズはまだありません
        </div>
      ) : (
        <div>
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
          {filtered.length === 0 ? (
            <div className="mt-1 rounded-2xl border border-dashed border-[#3a324a14] bg-white py-6 text-center text-[11px] text-[#3a324a8c]">
              該当するグッズがありません
            </div>
          ) : (
            // iter147: 各パネルがスタガーで pop-in
            <div className="mt-1 grid grid-cols-3 gap-2.5">
              {filtered.map((it, i) => {
                const card: ItemCardData = {
                  id: it.id,
                  memberName: it.memberName,
                  goodsType: it.goodsType,
                  series: null,
                  qty: it.qty,
                  hue: it.hue,
                  carrying: false,
                  photoUrl: it.photoUrl,
                  isPending: false,
                };
                return (
                  <div
                    key={it.id}
                    className="animate-panel-pop"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <ItemCard item={card} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Tab 2: 公開中の個別募集（ListingsView 流用） ──────── */

function ListingsPanel({ items }: { items: ListingItem[] }) {
  return (
    <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-5 pb-4">
      <ListingsView items={items} readOnly />
    </div>
  );
}
