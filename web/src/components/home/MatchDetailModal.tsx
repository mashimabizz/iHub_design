"use client";

/**
 * 個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * iter100: レイアウトを /listings ページの Diagram スタイルに統一
 *   - 左：譲（listing.haves をサムネ縦並び）
 *   - 中央：SVG 実線 fan（譲アンカーから各 option へ）
 *   - 右：選択肢カード縦並び
 *
 * iter101: 複数選択 + フッター「打診に進む」ボタン
 *   - 「✓ 成立」緑タグ撤去（matched は border 色で表現）
 *   - 「ALL MATCHED / N 成立」ヘッダーバッジ撤去
 *   - 選択肢タップ → 紫の太枠で選択中表示
 *   - 1 件以上選択 → 画面下にフッター「打診に進む（N 件）」表示
 *   - 複数選択 → /propose/[partnerId]?listing=L&options=1,2,3
 *     （page.tsx は iter67.8 で multi-option prefill 実装済）
 *   - 選択は **同一 listing 内のみ**。別 listing をタップすると選択リセット
 */

import { useEffect, useState } from "react";
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

/** 選択中の listing + option position 群（iter101） */
type Selection = { listingId: string; positions: number[] } | null;

export function MatchDetailModal({
  partnerHandle,
  partnerId,
  myListings,
  partnerListings,
  onClose,
}: {
  partnerHandle: string;
  /** option タップで /propose/[partnerId] に遷移するため必要 */
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

  // iter101: 選択中の listing + option positions
  const [selection, setSelection] = useState<Selection>(null);

  /**
   * option タップ：同一 listing なら toggle、別 listing なら listing 切り替え
   */
  function toggleOption(listingId: string, position: number) {
    setSelection((prev) => {
      if (!prev || prev.listingId !== listingId) {
        // 別 listing or 未選択 → この listing に切り替え
        return { listingId, positions: [position] };
      }
      // 同一 listing 内 toggle
      if (prev.positions.includes(position)) {
        const next = prev.positions.filter((p) => p !== position);
        return next.length === 0 ? null : { ...prev, positions: next };
      }
      return { ...prev, positions: [...prev.positions, position] };
    });
  }

  function isSelected(listingId: string, position: number): boolean {
    return (
      !!selection &&
      selection.listingId === listingId &&
      selection.positions.includes(position)
    );
  }

  const proposeHref =
    selection && selection.positions.length > 0
      ? `/propose/${partnerId}?listing=${selection.listingId}&options=${[...selection.positions].sort((a, b) => a - b).join(",")}`
      : null;

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
          <b>選択肢</b>をタップで選び、下の「打診に進む」で打診画面へ進みます（複数選択可）。
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
                isSelected={(p) => isSelected(l.listingId, p)}
                onToggle={(p) => toggleOption(l.listingId, p)}
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
                isSelected={(p) => isSelected(l.listingId, p)}
                onToggle={(p) => toggleOption(l.listingId, p)}
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

      {/* iter101: フッター（1 件以上選択時のみ表示） */}
      {selection && selection.positions.length > 0 && proposeHref && (
        <div className="border-t border-[#3a324a14] bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-[18px] pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-2.5 text-[11px] font-bold text-[#3a324a8c]"
            >
              リセット
            </button>
            <Link
              href={proposeHref}
              onClick={onClose}
              className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-3 text-center text-[13.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.98]"
            >
              打診に進む（{selection.positions.length} 件）→
            </Link>
          </div>
        </div>
      )}
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
  isSelected,
  onToggle,
}: {
  listing: MatchCardListingInfo;
  index: number;
  isSelected: (position: number) => boolean;
  onToggle: (position: number) => void;
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
      {/* ヘッダー（iter101: 「成立」バッジは撤去・選択肢数だけ表示） */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          #{index + 1}
        </span>
        <div className="flex-1" />
        <span className="text-[9.5px] text-[#3a324a8c]">
          {listing.options.length} 選択肢
        </span>
      </div>

      {/* 関係図 */}
      <div className="px-2 py-2.5">
        <Diagram listing={listing} isSelected={isSelected} onToggle={onToggle} />
      </div>
    </section>
  );
}

/* ─── 関係図 — 左に譲 / 中央 SVG 実線 / 右に選択肢縦並び ─── */

function Diagram({
  listing,
  isSelected,
  onToggle,
}: {
  listing: MatchCardListingInfo;
  isSelected: (position: number) => boolean;
  onToggle: (position: number) => void;
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
        {/* SVG 実線（matched は濃く・非 matched は薄く・選択中は太く） */}
        <svg
          width={totalW}
          height={containerH}
          className="pointer-events-none absolute left-0 top-0"
        >
          {sortedOptions.map((opt, i) => {
            const sel = isSelected(opt.position);
            return (
              <line
                key={opt.id}
                x1={HAVE_W}
                y1={haveAnchorY}
                x2={HAVE_W + SVG_W}
                y2={optionYs[i]}
                stroke="#a695d8"
                strokeWidth={sel ? 2.6 : 1.8}
                strokeLinecap="round"
                opacity={sel ? 1 : opt.matched ? 0.85 : 0.3}
              />
            );
          })}
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

        {/* 右カラム：選択肢縦並び（タップで toggle） */}
        {sortedOptions.map((opt, i) => {
          const sel = isSelected(opt.position);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggle(opt.position)}
              aria-pressed={sel}
              aria-label={`選択肢 #${opt.position} ${sel ? "選択解除" : "選択"}`}
              className="absolute block transition-all active:scale-[0.98]"
              style={{
                left: HAVE_W + SVG_W,
                top: i * (OPT_H + OPT_GAP),
                width: RIGHT_W,
                height: OPT_H,
              }}
            >
              <OptionRow option={opt} selected={sel} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 選択肢 1 行（タップ可・選択中は紫太枠） ─── */

function OptionRow({
  option,
  selected,
}: {
  option: MatchCardOption;
  selected: boolean;
}) {
  // 選択中：紫太枠 + 紫薄塗り
  // 非選択 + matched：紫薄枠 + 白背景
  // 非選択 + 非 matched：グレー枠 + dim
  const containerCls = selected
    ? "border-[2px] border-[#a695d8] bg-[#a695d80f] shadow-[0_2px_10px_rgba(166,149,216,0.25)]"
    : option.matched
      ? "border border-[#a695d855] bg-white"
      : "border border-[#3a324a14] bg-white opacity-70";

  return (
    <div
      className={`flex h-full w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left ${containerCls}`}
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
        </div>
        <div className="mt-0.5 truncate text-[10px] font-bold text-[#3a324a]">
          {option.isCashOffer
            ? `¥${option.cashAmount?.toLocaleString() ?? "—"}`
            : option.wishes
                .map((w) => `${w.item.label} ×${w.qty}`)
                .join(" / ")}
        </div>
      </div>
      {/* 選択中インジケーター */}
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
          selected
            ? "bg-[#a695d8] text-white"
            : "border border-[#3a324a14] text-transparent"
        }`}
      >
        ✓
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
