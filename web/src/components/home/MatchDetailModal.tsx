"use client";

/**
 * iter67.3-G：個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * - 全画面モーダル（モバイル想定）
 * - 譲側（左）と求側（右）を縦並びで表示
 * - SVG 線で関係を可視化：
 *   - **実線（solid）** = AND（必ずセットで取引）
 *   - **点線（dashed）** = OR（候補のうちいずれか）
 * - 数量バッジ（×N）をアイテム右上に表示
 *
 * Layout:
 *   - アイテムカードは固定サイズ（width 76, height 96）
 *   - 各 listing 1 つにつき 1 区画。複数 listing は縦に並べる
 */

import { useEffect } from "react";
import type { MatchCardListingInfo, MiniItem } from "./MatchCard";

const ITEM_W = 76;
const ITEM_H = 96;
const ROW_GAP = 18; // アイテム同士の縦余白
const COL_GAP_X = 110; // 左右の col 間距離

export function MatchDetailModal({
  partnerHandle,
  listings,
  onClose,
}: {
  partnerHandle: string;
  listings: MatchCardListingInfo[];
  onClose: () => void;
}) {
  // body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fbf9fc]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[#3a324a14] bg-white/95 px-[18px] pt-12 pb-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-[18px] font-bold text-[#3a324a8c]"
        >
          ✕
        </button>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-[#3a324a]">
            関係図（個別募集）
          </div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            @{partnerHandle} とのマッチ詳細
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] py-4">
        <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
          <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            🔗 関係図
          </span>
          <b>実線</b>＝AND（セット）/ <b>点線</b>＝OR（いずれか）。数量は各アイテム右上に表示しています。
        </div>

        {listings.map((l, idx) => (
          <ListingDiagram
            key={l.listingId}
            listing={l}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 1 listing 分の関係図 ─────────────────────────── */

function ListingDiagram({
  listing,
  index,
}: {
  listing: MatchCardListingInfo;
  index: number;
}) {
  const { haves, wishes, haveLogic, wishLogic } = listing;

  // 表示するアイテム = matched に絞る（全件は煩雑なため）
  // OR の場合「他にも候補あった」を別途注記
  const visibleHaves = haves.filter((h) => h.matched);
  const visibleWishes = wishes.filter((w) => w.matched);

  // 候補（unmatched）数
  const haveOtherCount = haves.length - visibleHaves.length;
  const wishOtherCount = wishes.length - visibleWishes.length;

  const leftCount = visibleHaves.length || 1;
  const rightCount = visibleWishes.length || 1;
  const rows = Math.max(leftCount, rightCount);
  const containerH = rows * ITEM_H + (rows - 1) * ROW_GAP;
  const containerW = ITEM_W * 2 + COL_GAP_X;

  // 各アイテムの中心 y 座標（SVG 用）
  const haveYs = visibleHaves.map(
    (_, i) => i * (ITEM_H + ROW_GAP) + ITEM_H / 2,
  );
  const wishYs = visibleWishes.map(
    (_, i) => i * (ITEM_H + ROW_GAP) + ITEM_H / 2,
  );

  const leftRightPairs: Array<{
    leftIdx: number;
    rightIdx: number;
    style: "solid" | "dashed";
  }> = [];
  for (let li = 0; li < visibleHaves.length; li++) {
    for (let ri = 0; ri < visibleWishes.length; ri++) {
      // 線スタイル: どちらか OR なら点線、両方 AND なら実線
      const isOr = haveLogic === "or" || wishLogic === "or";
      leftRightPairs.push({
        leftIdx: li,
        rightIdx: ri,
        style: isOr ? "dashed" : "solid",
      });
    }
  }

  return (
    <section
      className={`mb-4 overflow-hidden rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white ${
        index === 0 ? "" : ""
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          個別募集 #{index + 1}
        </span>
        <div className="flex-1" />
        <LogicChip side="have" logic={haveLogic} />
        <span className="text-[10px] font-bold text-[#3a324a8c]">↔</span>
        <LogicChip side="wish" logic={wishLogic} />
      </div>

      {/* 上部のラベル行 */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#a8d4e6]">
          あなたの譲（{visibleHaves.length}）
        </span>
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#f3c5d4]">
          相手の譲（{visibleWishes.length}）
        </span>
      </div>

      {/* 関係図本体（SVG オーバーレイ） */}
      <div className="px-3 pb-3">
        <div
          className="relative mx-auto"
          style={{ width: containerW, height: containerH }}
        >
          {/* SVG: 接続線（背面） */}
          <svg
            width={containerW}
            height={containerH}
            className="pointer-events-none absolute left-0 top-0"
          >
            {leftRightPairs.map((p, i) => {
              const x1 = ITEM_W; // 左カードの右端
              const x2 = ITEM_W + COL_GAP_X; // 右カードの左端
              const y1 = haveYs[p.leftIdx];
              const y2 = wishYs[p.rightIdx];
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#a695d8"
                  strokeWidth={p.style === "solid" ? 2.2 : 1.6}
                  strokeDasharray={p.style === "dashed" ? "5 4" : undefined}
                  strokeLinecap="round"
                  opacity={0.85}
                />
              );
            })}
          </svg>

          {/* 左カラム：have items */}
          {visibleHaves.map((h, i) => (
            <div
              key={h.item.id}
              className="absolute left-0"
              style={{
                top: i * (ITEM_H + ROW_GAP),
                width: ITEM_W,
                height: ITEM_H,
              }}
            >
              <ItemCard item={h.item} qty={h.qty} accent="have" matched />
            </div>
          ))}

          {/* 右カラム：wish items */}
          {visibleWishes.map((w, i) => (
            <div
              key={w.item.id}
              className="absolute"
              style={{
                left: ITEM_W + COL_GAP_X,
                top: i * (ITEM_H + ROW_GAP),
                width: ITEM_W,
                height: ITEM_H,
              }}
            >
              <ItemCard item={w.item} qty={w.qty} accent="wish" matched />
            </div>
          ))}
        </div>

        {/* 候補（unmatched）の注記 */}
        {(haveOtherCount > 0 || wishOtherCount > 0) && (
          <div className="mt-3 rounded-[8px] border border-dashed border-[#3a324a14] bg-[#fbf9fc] px-3 py-2 text-[10.5px] leading-relaxed text-[#3a324a8c]">
            {haveOtherCount > 0 && (
              <div>
                ※ 他に {haveOtherCount} 件の譲候補あり（OR の代替）
              </div>
            )}
            {wishOtherCount > 0 && (
              <div>
                ※ 他に {wishOtherCount} 件の wish 候補あり（OR の代替）
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 1 アイテムカード（写真 or イニシャル + 数量バッジ） ─── */

function ItemCard({
  item,
  qty,
  accent,
  matched,
}: {
  item: MiniItem;
  qty: number;
  accent: "have" | "wish";
  matched: boolean;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 5px, hsl(${item.hue}, 28%, 78%) 5px 10px)`;
  const initialShadow = `0 1px 3px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-md border shadow-[0_2px_6px_rgba(58,50,74,0.12)] ${
        matched
          ? accent === "have"
            ? "border-[#a8d4e6]"
            : "border-[#f3c5d4]"
          : "border-[#3a324a14] opacity-60"
      }`}
      style={{
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] || "?"}
        </div>
      )}
      {/* 数量バッジ */}
      <div className="absolute right-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white backdrop-blur-sm">
        ×{qty}
      </div>
      {/* ラベル下部 */}
      <div
        className="absolute inset-x-0 bottom-0 px-1 pb-1 pt-2"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.96))",
        }}
      >
        <div className="truncate text-[10px] font-bold text-[#3a324a]">
          {item.label}
        </div>
        {item.goodsTypeName && (
          <div className="truncate text-[8.5px] text-[#3a324a8c]">
            {item.goodsTypeName}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 「全部 AND」 / 「いずれか OR」chip ─── */

function LogicChip({
  side,
  logic,
}: {
  side: "have" | "wish";
  logic: "and" | "or";
}) {
  void side; // 現状 side は色分けに使わない（共通スタイル）。将来用に保留。
  return (
    <span
      className={`rounded-full px-1.5 py-[1px] text-[9.5px] font-extrabold ${
        logic === "and"
          ? "bg-[#a695d8] text-white"
          : "border border-[#a695d855] bg-white text-[#a695d8]"
      }`}
    >
      {logic === "and" ? "全部 AND" : "いずれか OR"}
    </span>
  );
}
