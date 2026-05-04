"use client";

/**
 * 個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * iter100: レイアウトを /listings ページの Diagram スタイルに統一
 *   - 左：譲（listing.haves をサムネ縦並び）
 *   - 中央：SVG 実線 fan（譲アンカーから各 option へ）
 *   - 右：選択肢カード縦並び
 *   - 各選択肢カードは <Link> で /propose/[partnerId]?listing=L&option=N へ遷移
 *     → ProposePage の prefill (iter67.7) でその option の内容が初期セットされる
 *
 *   - 線は **実線のみ**（AND/OR の区別をしない）
 *   - 点線（OR）廃止 — UI の単純化、ユーザー指示
 *   - section header (mine / partner) は iter94.1 の自分視点ラベルを継承
 *   - matched=false の option はタップ可だが半透明で dim
 */

import { useEffect } from "react";
import Link from "next/link";
import type {
  MatchCardListingInfo,
  MatchCardOption,
  MiniItem,
} from "./MatchCard";

/* レイアウト数値（/listings の Diagram と統一） */
const HAVE_W = 64;
const HAVE_H = 84;
const OPT_H = 64;
const OPT_GAP = 8;
const SVG_W = 56;
const RIGHT_W = 220;

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

export function MatchDetailModal({
  partnerHandle,
  partnerId,
  myListings,
  partnerListings,
  onClose,
}: {
  partnerHandle: string;
  /** iter100: option タップで /propose/[partnerId] に遷移するため必要 */
  partnerId: string;
  /** 私の listing が成立したもの */
  myListings: MatchCardListingInfo[];
  /** 相手の listing が成立したもの */
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

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] py-4">
        <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
          <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            🔗 関係図
          </span>
          <b>選択肢</b>をタップすると、その内容で<b>打診画面</b>が開きます。
        </div>

        {/* 私の個別募集（自分視点：譲＝あなたが出す / 求＝あなたが受け取る） */}
        {myListings.length > 0 && (
          <SectionGroup
            title="あなたの個別募集"
            subtitle="あなたが出している条件で、相手の在庫がヒット"
            accentColor="#a695d8"
          >
            {myListings.map((l, idx) => (
              <ListingCard
                key={l.listingId}
                listing={l}
                index={idx}
                partnerId={partnerId}
                onSelect={onClose}
              />
            ))}
          </SectionGroup>
        )}

        {/* 相手の個別募集（自分視点：譲＝あなたが受け取る / 求＝あなたが出す） */}
        {partnerListings.length > 0 && (
          <SectionGroup
            title={`@${partnerHandle} の個別募集`}
            subtitle="相手が出している条件で、あなたの在庫がヒット"
            accentColor="#f3c5d4"
          >
            {partnerListings.map((l, idx) => (
              <ListingCard
                key={l.listingId}
                listing={l}
                index={idx}
                partnerId={partnerId}
                onSelect={onClose}
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

/* ─── Section group wrapper ─── */

function SectionGroup({
  title,
  subtitle,
  accentColor,
  children,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div
        className="mb-2 rounded-[10px] px-3 py-2"
        style={{ background: `${accentColor}14` }}
      >
        <div
          className="text-[11px] font-extrabold tracking-[0.4px]"
          style={{ color: accentColor }}
        >
          {title}
        </div>
        <div className="mt-0.5 text-[10px] text-[#3a324a8c]">{subtitle}</div>
      </div>
      {children}
    </section>
  );
}

/* ─── 1 listing 分のカード（ヘッダー + Diagram） ─── */

function ListingCard({
  listing,
  index,
  partnerId,
  onSelect,
}: {
  listing: MatchCardListingInfo;
  index: number;
  partnerId: string;
  onSelect: () => void;
}) {
  const matchedOptions = listing.options.filter((o) => o.matched).length;

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          #{index + 1}
        </span>
        {matchedOptions > 0 && (
          <span className="rounded-full bg-emerald-500 px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.4px] text-white">
            {matchedOptions === listing.options.length
              ? "ALL MATCHED"
              : `${matchedOptions} 成立`}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[9.5px] text-[#3a324a8c]">
          {listing.options.length} 選択肢
        </span>
      </div>

      {/* 関係図 */}
      <div className="px-2 py-2.5">
        <Diagram listing={listing} partnerId={partnerId} onSelect={onSelect} />
      </div>
    </section>
  );
}

/* ─── 関係図 — 左に譲 / 中央 SVG 実線 / 右に選択肢縦並び ─── */

function Diagram({
  listing,
  partnerId,
  onSelect,
}: {
  listing: MatchCardListingInfo;
  partnerId: string;
  onSelect: () => void;
}) {
  const sortedOptions = [...listing.options].sort(
    (a, b) => a.position - b.position,
  );
  const containerH =
    sortedOptions.length * OPT_H +
    Math.max(0, sortedOptions.length - 1) * OPT_GAP;
  const optionYs = sortedOptions.map(
    (_, i) => i * (OPT_H + OPT_GAP) + OPT_H / 2,
  );
  const haveAnchorY = containerH / 2;
  const totalW = HAVE_W + SVG_W + RIGHT_W;

  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{ width: totalW, height: containerH }}
      >
        {/* SVG 実線（matched は濃く・非 matched は薄く） */}
        <svg
          width={totalW}
          height={containerH}
          className="pointer-events-none absolute left-0 top-0"
        >
          {sortedOptions.map((opt, i) => (
            <line
              key={opt.id}
              x1={HAVE_W}
              y1={haveAnchorY}
              x2={HAVE_W + SVG_W}
              y2={optionYs[i]}
              stroke="#a695d8"
              strokeWidth={1.8}
              strokeLinecap="round"
              opacity={opt.matched ? 0.85 : 0.3}
            />
          ))}
        </svg>

        {/* 左カラム：譲群 */}
        <div
          className="absolute left-0 flex flex-col items-center justify-center gap-1"
          style={{
            top: haveAnchorY - HAVE_H / 2,
            width: HAVE_W,
            height: HAVE_H,
          }}
        >
          {listing.haves.length > 0 ? (
            <>
              <div className="flex flex-col gap-0.5">
                {listing.haves.slice(0, 2).map((h) => (
                  <ItemThumb
                    key={h.item.id}
                    item={h.item}
                    qty={h.qty}
                    kind="have"
                    matched={h.matched}
                  />
                ))}
              </div>
              {listing.haves.length > 2 && (
                <span className="text-[8.5px] font-bold text-[#3a324a8c]">
                  +{listing.haves.length - 2}
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

        {/* 右カラム：選択肢縦並び（各カードがタップ可な Link） */}
        {sortedOptions.map((opt, i) => (
          <Link
            key={opt.id}
            href={`/propose/${partnerId}?listing=${listing.listingId}&option=${opt.position}`}
            onClick={onSelect}
            className="absolute block transition-all active:scale-[0.98]"
            style={{
              left: HAVE_W + SVG_W,
              top: i * (OPT_H + OPT_GAP),
              width: RIGHT_W,
              height: OPT_H,
            }}
          >
            <OptionRow option={opt} />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── 選択肢 1 行（タップ可・matched で色変化） ─── */

function OptionRow({ option }: { option: MatchCardOption }) {
  return (
    <div
      className={`flex h-full w-full items-center gap-2 rounded-[10px] border bg-white px-2 py-1.5 ${
        option.matched
          ? "border-[#a695d8] shadow-[0_2px_6px_rgba(166,149,216,0.15)]"
          : "border-[#3a324a14] opacity-70"
      }`}
    >
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
              matched={option.matched}
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
            <span className="rounded-full bg-emerald-500 px-1 py-[1px] font-extrabold text-white">
              ✓ 成立
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
      <span className="flex-shrink-0 text-[14px] font-bold text-[#a695d8]">
        ›
      </span>
    </div>
  );
}

/* ─── アイテムサムネ（matched なら通常色、否なら半透明） ─── */

function ItemThumb({
  item,
  qty,
  kind,
  matched,
}: {
  item: MiniItem;
  qty: number;
  kind: "have" | "wish";
  matched: boolean;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  const W = 36;
  const H = 36;
  const borderColor =
    kind === "have"
      ? matched
        ? "border-[#a8d4e6]"
        : "border-[#3a324a14]"
      : matched
        ? "border-[#f3c5d4]"
        : "border-[#3a324a14]";

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-[0_1px_3px_rgba(58,50,74,0.15)] ${borderColor} ${
        matched ? "" : "opacity-60"
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
          {item.label[0] ?? "?"}
        </span>
      )}
      {qty > 1 && (
        <span className="absolute -right-0.5 -top-0.5 rounded-bl-[3px] bg-black/70 px-[2px] text-[7.5px] font-extrabold leading-tight text-white">
          ×{qty}
        </span>
      )}
    </div>
  );
}
