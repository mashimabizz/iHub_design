/**
 * iter67.6 改訂：マッチカードを 2 種類に分離
 *
 * - **ListingMatchCard**：個別募集（listing）経由マッチ。リッチなデザイン、
 *   「📦 個別募集マッチ」バナー、定価交換サブバッジ、詳細モーダル開閉ボタン
 * - **SimpleMatchCard**：wish ベースの通常マッチ。今までの素朴なデザイン
 *
 * MatchCard wrapper が listingBadge の有無で振り分け。
 *
 * 距離表示（現地モード ON 時のみ）：distanceText prop で渡す。
 */

import Link from "next/link";
import { useState } from "react";
import { MatchDetailModal } from "./MatchDetailModal";

export type MiniItem = {
  id: string;
  label: string;
  goodsTypeName: string | null;
  photoUrl: string | null;
  hue: number;
};

/**
 * iter104: 関係図に「相手の譲から候補」を写真で並べるため、
 * 各 wish に candidates: 相手の inventory item 配列を持たせる。
 *
 * - my listing context: candidates = 相手 (partner) の inv で、my wish にヒットしたもの
 * - partner listing context: candidates = 私 (me) の inv で、partner の wish にヒットしたもの
 *   （= 私が出せる候補）
 */
export type MatchCardOption = {
  id: string;
  position: number;
  logic: "and" | "or";
  exchangeType: "same_kind" | "cross_kind" | "any";
  isCashOffer: boolean;
  cashAmount: number | null;
  matched: boolean;
  wishes: {
    item: MiniItem;
    qty: number;
    /** iter104: この wish にヒットした「相手側 inv 候補」 */
    candidates: { item: MiniItem; qty: number }[];
  }[];
  /**
   * iter67.8: この選択肢を有効化したときに **追加で** 自分が出すアイテム + qty
   * - 自分の listing：[]（譲は listing 共通なので listing.perOptionMyCommitment 側で）
   * - 相手の listing：option.matchedTheirInvIds × wishQtys（私の inv に対応）
   */
  myAdditionalCommitments: { itemId: string; qty: number }[];
};

export type MatchCardListingInfo = {
  listingId: string;
  haveLogic: "and" | "or";
  haves: { item: MiniItem; qty: number; matched: boolean }[];
  options: MatchCardOption[];
  /** iter67.8: 自分が listing オーナーか（true=私の listing / false=相手の listing） */
  isMyListing: boolean;
  /**
   * iter67.8: 1 選択肢を選ぶごとに **追加で** 自分が出すアイテム + qty
   * - 自分の listing：listing.haveIds × listing.haveQtys（共通）
   * - 相手の listing：[]（私の譲は option ごとに違う）
   */
  perOptionMyCommitment: { itemId: string; qty: number }[];
};

export type MatchCardData = {
  id: string;
  partnerId: string;
  userName: string;
  userHandle: string;
  myGives: MiniItem[];
  theirGives: MiniItem[];
  matchType: "complete" | "they_want_you" | "you_want_them";
  distance: string;
  exchangeType?: "same_kind" | "cross_kind" | "any";
  listingBadge?: "set" | "any" | null;
  hasCashOffer?: boolean;
  myMatchedListings?: MatchCardListingInfo[];
  partnerMatchedListings?: MatchCardListingInfo[];
  /** iter71-F: 双方向 listing マッチ（自分も相手も個別募集が同時に成立）*/
  bothSidesListingMatch?: boolean;
  /** iter72-B: listing マッチの種類（"both" / "mine_only" / "partner_only" / "none"） */
  listingMatchKind?: "both" | "mine_only" | "partner_only" | "none";
  /** 現地モード ON 時の距離テキスト（例「約 250m」「約 1.2km」） */
  distanceText?: string;
  /**
   * iter67.8：詳細モーダルでの在庫オーバーチェック用。
   * 自分の inv id → 在庫数（quantity）の Map
   */
  myInventoryQty?: Record<string, number>;
};

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種のみ",
  cross_kind: "異種のみ",
  any: "どちらでも",
};

/* ─── dispatcher ─────────────────────────────────────── */

export function MatchCard({ card }: { card: MatchCardData }) {
  const isListingMatch =
    !!(card.myMatchedListings?.length || card.partnerMatchedListings?.length);
  return isListingMatch ? (
    <ListingMatchCard card={card} />
  ) : (
    <SimpleMatchCard card={card} />
  );
}

/* ─── 個別募集マッチカード（リッチ） ────────────────── */

function ListingMatchCard({ card }: { card: MatchCardData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const matchLabel =
    card.matchType === "complete"
      ? "両方向 候補"
      : card.matchType === "they_want_you"
        ? "あなたを求めてる 候補"
        : "あなたの欲しいを持つ 候補";

  const hasMyListing = !!card.myMatchedListings?.length;
  const hasPartnerListing = !!card.partnerMatchedListings?.length;
  const kind: "both" | "mine_only" | "partner_only" | "none" =
    card.listingMatchKind ??
    (hasMyListing && hasPartnerListing
      ? "both"
      : hasMyListing
        ? "mine_only"
        : hasPartnerListing
          ? "partner_only"
          : "none");
  const bothListings = kind === "both";
  const partnerOnly = kind === "partner_only";
  const sourceLabel = bothListings
    ? "双方の個別募集が成立"
    : hasMyListing
      ? "あなたの個別募集が成立"
      : "相手の個別募集が成立";

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border-[1.5px] bg-white ${
          bothListings
            ? "border-[#a695d8] shadow-[0_14px_36px_rgba(166,149,216,0.32)]"
            : partnerOnly
              ? "border-[#a8d4e6] shadow-[0_10px_28px_rgba(168,212,230,0.30)]"
              : "border-[#a695d8] shadow-[0_10px_28px_rgba(166,149,216,0.20)]"
        }`}
        style={{
          background: bothListings
            ? "linear-gradient(180deg, rgba(166,149,216,0.18) 0%, rgba(243,197,212,0.10) 50%, rgba(168,212,230,0.10) 100%)"
            : partnerOnly
              ? "linear-gradient(180deg, rgba(168,212,230,0.18) 0%, transparent 50%, rgba(166,149,216,0.06) 100%)"
              : "linear-gradient(180deg, rgba(166,149,216,0.10) 0%, transparent 50%, rgba(243,197,212,0.06) 100%)",
        }}
      >
        {/* iter72-C: listing マッチ種類別の上部バナー */}
        {bothListings && (
          <div className="flex items-center gap-1.5 bg-[linear-gradient(135deg,#f3c5d4,#a695d8)] px-3 py-1 text-white">
            <span className="text-[11px]">✨</span>
            <span className="text-[9.5px] font-extrabold tracking-[0.7px]">
              相手の個別募集にもマッチ！
            </span>
            <span className="text-[9px] font-bold opacity-90">
              · 双方向で募集条件が一致しています
            </span>
          </div>
        )}
        {partnerOnly && (
          <div className="flex items-center gap-1.5 bg-[linear-gradient(135deg,#a8d4e6,#7aa6c4)] px-3 py-1 text-white">
            <span className="text-[11px]">📦</span>
            <span className="text-[9.5px] font-extrabold tracking-[0.7px]">
              相手の個別募集に応えられます
            </span>
            <span className="text-[9px] font-bold opacity-90">
              · あなたの在庫を駆使して打診できます
            </span>
          </div>
        )}

        {/* 上部リッチバナー */}
        <div className="flex items-center gap-2 bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-1.5 text-white">
          <span className="text-[12px]">📦</span>
          <span className="text-[10.5px] font-extrabold tracking-[0.6px]">
            個別募集マッチ
          </span>
          <span className="text-[9.5px] font-bold opacity-90">
            · {sourceLabel}
          </span>
          <div className="flex-1" />
          <span className="rounded-full bg-white/95 px-2 py-[2px] text-[9px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            {matchLabel}
          </span>
        </div>

        <div className="p-3.5">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
              {card.userName[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-bold text-gray-900">
                @{card.userHandle}
              </div>
              <div className="mt-0.5 text-[10.5px] tabular-nums text-gray-500">
                {card.distanceText ? (
                  <>
                    <span className="font-bold text-[#a695d8]">
                      📍 {card.distanceText}
                    </span>{" "}
                    · {card.distance}
                  </>
                ) : (
                  card.distance
                )}
              </div>
            </div>
          </div>

          {/* Trade preview */}
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-2xl bg-[#a8d4e614] p-2.5">
            <SidePanel
              label={`相手の譲（${card.theirGives.length}）`}
              items={card.theirGives}
              align="left"
            />
            <div className="flex flex-col items-center gap-1">
              <ArrowDot color="#a695d8" dir="right" />
              <ArrowDot color="#a8d4e6" dir="left" />
            </div>
            <SidePanel
              label={`あなたの譲（${card.myGives.length}）`}
              items={card.myGives}
              align="right"
              accent="#f3c5d4cc"
            />
          </div>

          {/* バッジ群 */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {card.listingBadge === "set" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#a695d8] px-2 py-0.5 text-[10px] font-bold text-white">
                📦 セット
              </span>
            )}
            {card.listingBadge === "any" && (
              <span className="rounded-full border border-[#a695d855] bg-[#a695d80a] px-2 py-0.5 text-[10px] font-bold text-[#a695d8]">
                いずれか OK
              </span>
            )}
            {card.hasCashOffer && (
              <span className="rounded-full border border-[#7a9a8a55] bg-[#7a9a8a14] px-2 py-0.5 text-[10px] font-bold text-[#7a9a8a]">
                💴 定価交換も受付
              </span>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-2.5 py-[3px] text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(166,149,216,0.35)] active:scale-[0.97]"
            >
              詳細 →
            </button>
          </div>

          {/* CTA — iter72-C: partner_only は相手の listing 条件をプリフィルした打診へ */}
          <div className="mt-3 flex gap-2">
            <Link
              href={
                partnerOnly && card.partnerMatchedListings?.[0]
                  ? `/propose/${card.partnerId}?matchType=${card.matchType}&listing=${card.partnerMatchedListings[0].listingId}&options=${(card.partnerMatchedListings[0].options ?? [])
                      .filter((o) => o.matched)
                      .map((o) => o.position)
                      .join(",")}`
                  : `/propose/${card.partnerId}?matchType=${card.matchType}`
              }
              className={`flex-1 rounded-xl px-3 py-2.5 text-center text-[13px] font-bold tracking-[0.4px] text-white transition-all duration-150 active:scale-[0.97] ${
                partnerOnly
                  ? "bg-[linear-gradient(135deg,#7aa6c4,#a695d8)] shadow-[0_4px_12px_rgba(122,166,196,0.4)]"
                  : "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] shadow-[0_4px_12px_rgba(166,149,216,0.4)]"
              }`}
            >
              {partnerOnly ? "応えて打診 →" : "打診する"}
            </Link>
            <Link
              href={`/users/${card.partnerId}`}
              className="rounded-xl border border-[#a695d855] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-all active:scale-[0.97]"
            >
              相手プロフ →
            </Link>
          </div>
        </div>
      </div>

      {modalOpen && (
        <MatchDetailModal
          partnerHandle={card.userHandle}
          partnerId={card.partnerId}
          myListings={card.myMatchedListings ?? []}
          partnerListings={card.partnerMatchedListings ?? []}
          myInventoryQty={card.myInventoryQty ?? {}}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

/* ─── 通常マッチカード（シンプル） ──────────────────── */

function SimpleMatchCard({ card }: { card: MatchCardData }) {
  const isComplete = card.matchType === "complete";
  const matchLabel = isComplete
    ? "両方向 候補"
    : card.matchType === "they_want_you"
      ? "あなたを求めてる 候補"
      : "あなたの欲しいを持つ 候補";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#a695d830] bg-white p-3.5 shadow-[0_8px_24px_rgba(166,149,216,0.10)]">
      {isComplete && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(166,149,216,0.06), transparent)",
          }}
        />
      )}

      <div
        className={`absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9.5px] font-bold tracking-[0.6px] ${
          isComplete
            ? "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_3px_8px_rgba(166,149,216,0.4)]"
            : "bg-[#a695d822] text-[#a695d8]"
        }`}
      >
        {isComplete && (
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path
              d="M4.5 1.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2L1.3 3.8 3.5 3.5z"
              fill="#fff"
            />
          </svg>
        )}
        {matchLabel}
      </div>

      <div className="relative flex items-center gap-2.5 pr-24">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
          {card.userName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-gray-900">
            @{card.userHandle}
          </div>
          <div className="mt-0.5 text-[10.5px] tabular-nums text-gray-500">
            {card.distanceText ? (
              <>
                <span className="font-bold text-[#a695d8]">
                  📍 {card.distanceText}
                </span>{" "}
                · {card.distance}
              </>
            ) : (
              card.distance
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-2xl bg-[#a8d4e614] p-2.5">
        <SidePanel
          label={`相手の譲（${card.theirGives.length}）`}
          items={card.theirGives}
          align="left"
        />
        <div className="flex flex-col items-center gap-1">
          <ArrowDot color="#a695d8" dir="right" />
          <ArrowDot color="#a8d4e6" dir="left" />
        </div>
        <SidePanel
          label={`あなたの譲（${card.myGives.length}）`}
          items={card.myGives}
          align="right"
          accent="#f3c5d4cc"
        />
      </div>

      {card.exchangeType && card.exchangeType !== "any" && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{
              background:
                card.exchangeType === "same_kind"
                  ? "#5fa884"
                  : "#d9826b",
            }}
          >
            {EXCHANGE_LABEL[card.exchangeType]}
          </span>
          <span className="text-[9.5px] text-gray-500">
            ※ 相手の自己申告
          </span>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Link
          href={`/propose/${card.partnerId}?matchType=${card.matchType}`}
          className="flex-1 rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-2.5 text-center text-[13px] font-bold tracking-[0.4px] text-white shadow-[0_4px_12px_rgba(166,149,216,0.4)] transition-all duration-150 active:scale-[0.97]"
        >
          打診する
        </Link>
        <button
          type="button"
          className="rounded-xl border border-[#a695d855] bg-white px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 transition-all active:scale-[0.97]"
        >
          相手プロフ →
        </button>
      </div>
    </div>
  );
}

/* ─── shared sub-components ─────────────────────────── */

function SidePanel({
  label,
  items,
  align,
  accent,
}: {
  label: string;
  items: MiniItem[];
  align: "left" | "right";
  accent?: string;
}) {
  return (
    <div>
      <div
        className={`mb-1.5 px-1 text-[9.5px] font-bold tracking-[0.6px] text-gray-500 ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        {label}
      </div>
      {items.length === 0 ? (
        <div
          className={`text-[10px] italic text-gray-400 ${
            align === "right" ? "text-right" : "text-left"
          } px-1`}
        >
          —
        </div>
      ) : (
        <div
          className={`flex flex-wrap gap-1 ${
            align === "right" ? "justify-end" : "justify-start"
          } px-1`}
        >
          {items.slice(0, 4).map((it) => (
            <Tcg key={it.id} item={it} accent={accent} />
          ))}
          {items.length > 4 && (
            <div className="flex h-7 items-end px-0.5 text-[10px] text-gray-500">
              +{items.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tcg({ item, accent }: { item: MiniItem; accent?: string }) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 5px, hsl(${item.hue}, 28%, 78%) 5px 10px)`;
  const initialShadow = `0 1px 3px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className="relative overflow-hidden rounded-md border border-white/40 shadow-[0_1px_3px_rgba(58,50,74,0.15)]"
      style={{
        width: 28,
        height: 38,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${item.label}${item.goodsTypeName ? ` · ${item.goodsTypeName}` : ""}`}
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
          className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] || "?"}
        </div>
      )}
      {accent && !hasPhoto && (
        <div
          className="absolute inset-x-0 bottom-0 h-1"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}

function ArrowDot({
  color,
  dir,
}: {
  color: string;
  dir: "left" | "right";
}) {
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-white"
      style={{
        background: color,
        boxShadow: `0 2px 5px ${color}80`,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        {dir === "right" ? (
          <path
            d="M2 5h6m-2-2l2 2-2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <path
            d="M8 5H2m2-2L2 5l2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
}
