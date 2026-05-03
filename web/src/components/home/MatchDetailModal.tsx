"use client";

/**
 * iter67.4：個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * - 全画面モーダル（モバイル想定）
 * - 譲側（左）+ 各「選択肢」（右）を縦に並べて表示
 * - SVG 線で関係を可視化：
 *   - **実線（solid）** = AND（必ずセットで取引）
 *   - **点線（dashed）** = OR（候補のうちいずれか）
 * - 数量バッジ（×N）をアイテム右上に表示
 * - 成立した選択肢には「✅ 成立」バッジ、未成立も含めて全選択肢を表示
 * - 定価交換選択肢（is_cash_offer）は金額表示のみ（マッチ対象外）
 */

import { useEffect } from "react";
import type {
  MatchCardListingInfo,
  MatchCardOption,
  MiniItem,
} from "./MatchCard";

const ITEM_W = 76;
const ITEM_H = 96;
const ROW_GAP = 18;
const COL_GAP_X = 110;

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

export function MatchDetailModal({
  partnerHandle,
  listings,
  onClose,
}: {
  partnerHandle: string;
  listings: MatchCardListingInfo[];
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fbf9fc]">
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
          <b>実線</b>＝AND（セット）/ <b>点線</b>＝OR（いずれか）。求側の選択肢のうち
          相手は <b>いずれか 1 つ</b> を選んで取引します。
        </div>

        {listings.map((l, idx) => (
          <ListingDiagram key={l.listingId} listing={l} index={idx} />
        ))}
      </div>
    </div>
  );
}

function ListingDiagram({
  listing,
  index,
}: {
  listing: MatchCardListingInfo;
  index: number;
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white">
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          個別募集 #{index + 1}
        </span>
        <div className="flex-1" />
        {listing.haves.length > 1 && (
          <span
            className={`rounded-full px-1.5 py-[1px] text-[9.5px] font-extrabold ${
              listing.haveLogic === "and"
                ? "bg-[#a695d8] text-white"
                : "border border-[#a695d855] bg-white text-[#a695d8]"
            }`}
          >
            譲 {listing.haveLogic === "and" ? "全部 AND" : "いずれか OR"}
          </span>
        )}
      </div>

      {/* 譲群（共通） */}
      <div className="px-3 pt-3">
        <div className="mb-1.5 text-[10px] font-bold tracking-[0.4px] text-[#a8d4e6]">
          あなたの譲（{listing.haves.filter((h) => h.matched).length} /{" "}
          {listing.haves.length}）
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {listing.haves.map((h) => (
            <div
              key={h.item.id}
              style={{ width: ITEM_W, height: ITEM_H }}
            >
              <ItemCard
                item={h.item}
                qty={h.qty}
                accent="have"
                matched={h.matched}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="my-2 flex items-center justify-center text-[14px] font-bold text-[#3a324a8c]">
        ↔
      </div>

      {/* 求側選択肢（縦に並ぶ） */}
      <div className="space-y-2 px-3 pb-3">
        <div className="text-[10px] font-bold tracking-[0.4px] text-[#f3c5d4]">
          求 — 選択肢 {listing.options.length}
        </div>
        {listing.options.map((opt) => (
          <OptionDiagram
            key={opt.id}
            option={opt}
            havesCount={listing.haves.length}
          />
        ))}
      </div>
    </section>
  );
}

function OptionDiagram({
  option,
  havesCount,
}: {
  option: MatchCardOption;
  havesCount: number;
}) {
  const itemCount = option.wishes.length || 1;
  const containerH =
    itemCount * ITEM_H + Math.max(0, itemCount - 1) * ROW_GAP;
  const wishYs = option.wishes.map(
    (_, i) => i * (ITEM_H + ROW_GAP) + ITEM_H / 2,
  );
  // 譲側の中心座標（モーダル内では譲は外で表示するので、ここでは「左境界の高さ中央」から伸ばす）
  const haveAnchorY = containerH / 2;
  const isOr = option.logic === "or";

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        option.matched
          ? "border-[#a695d8] bg-[#a695d80a]"
          : "border-[#3a324a14] bg-white opacity-80"
      }`}
    >
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#3a324a08] bg-[#fbf9fc] px-2.5 py-1.5">
        <span className="rounded-full bg-[#f3c5d4] px-1.5 py-[1px] text-[9.5px] font-extrabold text-[#3a324a]">
          #{option.position}
        </span>
        {option.isCashOffer ? (
          <span className="text-[11px] font-bold text-[#3a324a]">
            💴 定価交換 ¥
            <span className="tabular-nums">
              {option.cashAmount?.toLocaleString() ?? "—"}
            </span>
          </span>
        ) : (
          <>
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
        <div className="flex-1" />
        {option.matched ? (
          <span className="rounded-full bg-emerald-500 px-2 py-[2px] text-[9.5px] font-extrabold text-white">
            ✅ 成立
          </span>
        ) : option.isCashOffer ? (
          <span className="rounded-full bg-[#3a324a14] px-2 py-[2px] text-[9.5px] font-bold text-[#3a324a8c]">
            演算対象外
          </span>
        ) : (
          <span className="rounded-full bg-[#3a324a14] px-2 py-[2px] text-[9.5px] font-bold text-[#3a324a8c]">
            未成立
          </span>
        )}
      </div>

      <div className="p-2.5">
        {option.isCashOffer ? (
          <div className="text-[11px] leading-relaxed text-[#3a324a8c]">
            この選択肢は金銭での取引です。マッチング演算には参加せず、UI 表示のみ。
          </div>
        ) : option.wishes.length === 0 ? (
          <div className="text-[10.5px] italic text-[#3a324a4d]">—</div>
        ) : (
          <div
            className="relative mx-auto"
            style={{ width: ITEM_W * 2 + COL_GAP_X, height: containerH }}
          >
            {/* SVG 線 */}
            <svg
              width={ITEM_W * 2 + COL_GAP_X}
              height={containerH}
              className="pointer-events-none absolute left-0 top-0"
            >
              {wishYs.map((y, i) => (
                <line
                  key={i}
                  x1={ITEM_W}
                  y1={haveAnchorY}
                  x2={ITEM_W + COL_GAP_X}
                  y2={y}
                  stroke="#a695d8"
                  strokeWidth={isOr ? 1.6 : 2.2}
                  strokeDasharray={isOr ? "5 4" : undefined}
                  strokeLinecap="round"
                  opacity={option.matched ? 0.85 : 0.35}
                />
              ))}
            </svg>

            {/* 譲側ラベル（左） */}
            <div
              className="absolute left-0 flex items-center justify-center"
              style={{
                top: haveAnchorY - ITEM_H / 2,
                width: ITEM_W,
                height: ITEM_H,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[#a8d4e655] bg-white/50 text-center">
                <span className="px-1 text-[10px] font-bold leading-tight text-[#3a324a8c]">
                  あなたの譲
                  <br />
                  ({havesCount})
                </span>
              </div>
            </div>

            {/* 求側カード（右） */}
            {option.wishes.map((w, i) => (
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
                <ItemCard
                  item={w.item}
                  qty={w.qty}
                  accent="wish"
                  matched={option.matched}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
      <div className="absolute right-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white backdrop-blur-sm">
        ×{qty}
      </div>
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
