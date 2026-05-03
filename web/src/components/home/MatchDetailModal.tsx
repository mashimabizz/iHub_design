"use client";

/**
 * iter67.7：個別募集（listings）経由マッチの **関係図モーダル**（コンパクト版）。
 *
 * レイアウト方針：
 * - 左カラム：listing.haves を **1 度だけ** 固定表示（共通の譲）
 * - 右カラム：選択肢を縦に並べて表示（成立優先 → 未成立は opacity 0.6）
 * - SVG 線：左カラム中心 → 各選択肢に向けて延びる
 *   - 実線（solid）= AND
 *   - 点線（dashed）= OR or 未成立
 * - 各選択肢の右に **小さな「打診→」ボタン**（タップで /propose/[partnerId]?listing=...&option=...）
 * - 定価交換選択肢にも打診ボタン（金銭授受モードで打診送信）
 */

import { useEffect } from "react";
import Link from "next/link";
import type {
  MatchCardListingInfo,
  MatchCardOption,
  MiniItem,
} from "./MatchCard";

const HAVE_W = 64;
const HAVE_H = 84;
const OPT_H = 64; // 各選択肢の縦サイズ
const OPT_GAP = 8;
const SVG_W = 56; // 左→右の SVG 幅

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

export function MatchDetailModal({
  partnerHandle,
  partnerId,
  matchType,
  myListings,
  partnerListings,
  onClose,
}: {
  partnerHandle: string;
  partnerId: string;
  matchType: "complete" | "they_want_you" | "you_want_them";
  myListings: MatchCardListingInfo[];
  partnerListings: MatchCardListingInfo[];
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

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] py-3">
        <div className="mb-2.5 rounded-[10px] bg-[#a695d810] px-3 py-2 text-[10.5px] leading-relaxed text-[#3a324a]">
          <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            🔗 関係図
          </span>
          <b>実線</b>＝AND / <b>点線</b>＝OR or 未成立。各選択肢の「打診→」で個別募集の条件で打診できます。
        </div>

        {myListings.length > 0 && (
          <SectionGroup
            title="あなたの個別募集"
            countLabel={`${myListings.reduce((s, l) => s + l.options.length, 0)} 選択肢`}
            accentColor="#a695d8"
          >
            {myListings.map((l, idx) => (
              <ListingDiagram
                key={l.listingId}
                listing={l}
                index={idx}
                partnerId={partnerId}
                matchType={matchType}
              />
            ))}
          </SectionGroup>
        )}

        {partnerListings.length > 0 && (
          <SectionGroup
            title={`@${partnerHandle} の個別募集`}
            countLabel={`${partnerListings.reduce((s, l) => s + l.options.length, 0)} 選択肢`}
            accentColor="#f3c5d4"
          >
            {partnerListings.map((l, idx) => (
              <ListingDiagram
                key={l.listingId}
                listing={l}
                index={idx}
                partnerId={partnerId}
                matchType={matchType}
              />
            ))}
          </SectionGroup>
        )}

        {myListings.length === 0 && partnerListings.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-[#3a324a14] bg-white p-4 text-center text-[12px] text-[#3a324a8c]">
            個別募集経由のマッチはありません
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section group ─────────────────────────── */

function SectionGroup({
  title,
  countLabel,
  accentColor,
  children,
}: {
  title: string;
  countLabel: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accentColor }}
        />
        <span
          className="text-[11px] font-extrabold tracking-[0.3px]"
          style={{ color: accentColor }}
        >
          {title}
        </span>
        <span className="text-[10px] text-[#3a324a8c]">· {countLabel}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/* ─── 1 listing 分の関係図（コンパクト版） ─── */

function ListingDiagram({
  listing,
  index,
  partnerId,
  matchType,
}: {
  listing: MatchCardListingInfo;
  index: number;
  partnerId: string;
  matchType: "complete" | "they_want_you" | "you_want_them";
}) {
  // 成立優先で並び替え
  const sortedOptions = [...listing.options].sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return a.position - b.position;
  });

  const containerH =
    sortedOptions.length * OPT_H + Math.max(0, sortedOptions.length - 1) * OPT_GAP;
  const optionYs = sortedOptions.map(
    (_, i) => i * (OPT_H + OPT_GAP) + OPT_H / 2,
  );
  const haveAnchorY = containerH / 2;

  // matched have id 集合
  const matchedHaveIds = new Set(
    listing.haves.filter((h) => h.matched).map((h) => h.item.id),
  );
  const visibleHaves = listing.haves.filter((h) =>
    matchedHaveIds.has(h.item.id),
  );

  return (
    <div className="overflow-hidden rounded-[12px] border-[0.5px] border-[#3a324a14] bg-white">
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-2.5 py-1.5">
        <span className="text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          #{index + 1}
        </span>
        {listing.haves.length > 1 && (
          <span
            className={`rounded-full px-1.5 py-[1px] text-[9px] font-extrabold ${
              listing.haveLogic === "and"
                ? "bg-[#a695d8] text-white"
                : "border border-[#a695d855] bg-white text-[#a695d8]"
            }`}
          >
            譲 {listing.haveLogic === "and" ? "全部 AND" : "いずれか OR"}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[9.5px] text-[#3a324a8c]">
          {sortedOptions.filter((o) => o.matched).length} 件成立 /{" "}
          {sortedOptions.length} 選択肢
        </span>
      </div>

      <div className="px-2 py-2">
        <div
          className="relative mx-auto"
          style={{
            width: HAVE_W + SVG_W + 240,
            height: containerH,
          }}
        >
          {/* SVG 線 */}
          <svg
            width={HAVE_W + SVG_W + 240}
            height={containerH}
            className="pointer-events-none absolute left-0 top-0"
          >
            {sortedOptions.map((opt, i) => {
              const y2 = optionYs[i];
              // 線スタイル：成立 + AND → 実線 / 成立 + OR → 点線 / 未成立 → 薄い点線 / cash → 短い点線
              const isAnd = opt.logic === "and";
              const dashed = !opt.matched || !isAnd;
              const opacity = opt.matched ? 0.85 : 0.3;
              return (
                <line
                  key={opt.id}
                  x1={HAVE_W}
                  y1={haveAnchorY}
                  x2={HAVE_W + SVG_W}
                  y2={y2}
                  stroke="#a695d8"
                  strokeWidth={!dashed ? 2 : 1.5}
                  strokeDasharray={dashed ? "5 4" : undefined}
                  strokeLinecap="round"
                  opacity={opacity}
                />
              );
            })}
          </svg>

          {/* 左カラム：listing.haves（共通） */}
          <div
            className="absolute left-0 flex flex-col items-center justify-center gap-1"
            style={{
              top: haveAnchorY - HAVE_H / 2,
              width: HAVE_W,
              height: HAVE_H,
            }}
          >
            {visibleHaves.length > 0 ? (
              <>
                <div className="flex flex-col gap-0.5">
                  {visibleHaves.slice(0, 2).map((h) => (
                    <ItemThumb
                      key={h.item.id}
                      item={h.item}
                      qty={h.qty}
                      kind="have"
                    />
                  ))}
                </div>
                {visibleHaves.length > 2 && (
                  <span className="text-[8.5px] font-bold text-[#3a324a8c]">
                    +{visibleHaves.length - 2}
                  </span>
                )}
                {listing.haves.length > 1 && (
                  <span
                    className={`mt-0.5 rounded-full px-1 py-[1px] text-[8.5px] font-extrabold ${
                      listing.haveLogic === "and"
                        ? "bg-[#a695d8] text-white"
                        : "border border-[#a695d855] bg-white text-[#a695d8]"
                    }`}
                  >
                    {listing.haveLogic === "and" ? "AND" : "OR"}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[9px] text-[#3a324a8c]">譲 — 0</span>
            )}
          </div>

          {/* 右カラム：選択肢縦並び */}
          {sortedOptions.map((opt, i) => (
            <div
              key={opt.id}
              className={`absolute flex items-center ${
                opt.matched ? "" : "opacity-60"
              }`}
              style={{
                left: HAVE_W + SVG_W,
                top: i * (OPT_H + OPT_GAP),
                width: 240,
                height: OPT_H,
              }}
            >
              <OptionRow
                option={opt}
                listingId={listing.listingId}
                partnerId={partnerId}
                matchType={matchType}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 各選択肢 1 行（横長） ─── */

function OptionRow({
  option,
  listingId,
  partnerId,
  matchType,
}: {
  option: MatchCardOption;
  listingId: string;
  partnerId: string;
  matchType: "complete" | "they_want_you" | "you_want_them";
}) {
  return (
    <div
      className={`flex h-full w-full items-center gap-2 rounded-[10px] border bg-white px-2 py-1.5 ${
        option.matched
          ? "border-[#a695d8]"
          : "border-[#3a324a14] bg-[#fbf9fc]"
      }`}
    >
      {/* 求アイテム表示 or cash 表示 */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {option.isCashOffer ? (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-[#7a9a8a55] bg-[#7a9a8a14] text-[16px]">
            💴
          </div>
        ) : (
          <div className="flex flex-shrink-0 gap-0.5">
            {option.wishes.slice(0, 2).map((w) => (
              <ItemThumb
                key={w.item.id}
                item={w.item}
                qty={w.qty}
                kind="wish"
              />
            ))}
            {option.wishes.length > 2 && (
              <span className="self-center text-[8.5px] text-[#3a324a8c]">
                +{option.wishes.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 text-[9.5px]">
            <span className="rounded-full bg-[#3a324a08] px-1 py-[1px] font-extrabold text-[#3a324a8c]">
              #{option.position}
            </span>
            {!option.isCashOffer && (
              <span className="rounded-full border border-[#a695d855] bg-white px-1 py-[1px] font-bold text-[#a695d8]">
                {EXCHANGE_LABEL[option.exchangeType]}
              </span>
            )}
            {!option.isCashOffer && option.wishes.length > 1 && (
              <span
                className={`rounded-full px-1 py-[1px] font-extrabold ${
                  option.logic === "and"
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#a695d855] bg-white text-[#a695d8]"
                }`}
              >
                {option.logic === "and" ? "AND" : "OR"}
              </span>
            )}
            {option.matched && (
              <span className="rounded-full bg-emerald-500 px-1.5 py-[1px] text-[8.5px] font-extrabold text-white">
                ✅
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[10px] font-bold text-[#3a324a]">
            {option.isCashOffer
              ? `¥${option.cashAmount?.toLocaleString() ?? "—"}`
              : option.wishes
                  .map((w) => `${w.item.label} ×${w.qty}`)
                  .join(" / ")}
          </div>
        </div>
      </div>

      {/* スタイリッシュな打診ボタン */}
      <Link
        href={`/propose/${partnerId}?matchType=${matchType}&listing=${listingId}&option=${option.position}`}
        className="flex-shrink-0 rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-2 py-1 text-[10px] font-extrabold text-white shadow-[0_2px_5px_rgba(166,149,216,0.4)] active:scale-[0.95]"
      >
        打診→
      </Link>
    </div>
  );
}

/* ─── 小さなアイテムサムネ（ListingMatchCard から流用、ミニ版） ─── */

function ItemThumb({
  item,
  qty,
  kind,
}: {
  item: MiniItem;
  qty: number;
  kind: "have" | "wish";
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  const W = 36;
  const H = 36;

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-[0_1px_3px_rgba(58,50,74,0.15)] ${
        kind === "have"
          ? "border-[#a8d4e6]"
          : "border-[#f3c5d4]"
      }`}
      style={{
        width: W,
        height: H,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${item.label} ×${qty}`}
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
        <span
          className="text-[14px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] || "?"}
        </span>
      )}
      <span className="absolute right-0 top-0 rounded-bl-md bg-black/55 px-0.5 text-[7.5px] font-extrabold leading-tight text-white">
        ×{qty}
      </span>
    </div>
  );
}
