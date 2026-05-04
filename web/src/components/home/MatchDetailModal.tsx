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
const OPT_GAP = 10;
const SVG_W = 48;
const RIGHT_W = 240;
/* iter104: option カードの構成要素ごとの高さ（可変高さ計算用） */
const OPT_HEADER_H = 32;
const OPT_WISH_ROW_LABEL_H = 16;
const OPT_WISH_ROW_THUMBS_H = 38;
const OPT_WISH_ROW_GAP = 4;
const OPT_PADDING_Y = 14;
const OPT_CASH_H = 60; // cash offer は wish が無いので別の固定高
const OPT_NO_CANDIDATES_H = 28; // 候補なしの代わりに表示する 1 行

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

/* ─── 1 listing 分のカード（ヘッダー + 信頼度 + Diagram） ─── */

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

      {/* iter103: 信頼度チェックリスト */}
      <ConfidenceChecklist listing={listing} />

      {/* 関係図 */}
      <div className="px-2 py-2.5">
        <Diagram listing={listing} isSelected={isSelected} onToggle={onToggle} />
      </div>
    </section>
  );
}

/* ─── iter103: 信頼度チェックリスト ───
 *
 * 候補に対する確認項目を表示。「写真で確認・推しで判断」という前提を明示する。
 *
 * 現状の項目（Phase A）：
 * - ✅ グループ・キャラ・種別 一致（matching 条件そのものなので常に true）
 * - 📷 写真：listing.haves と option.wishes 全アイテムの photoUrl カバレッジ
 * - 🏷 シリーズタグ：未登録（タグ機能リリースで対応予定 — Phase C）
 * - 🤝 この相手との過去取引：件数取得は別 query 要なので Phase B 以降
 */
function ConfidenceChecklist({ listing }: { listing: MatchCardListingInfo }) {
  // 写真カバレッジ：listing.haves + 全 option.wishes
  const allItems = [
    ...listing.haves.map((h) => h.item),
    ...listing.options.flatMap((o) => o.wishes.map((w) => w.item)),
  ];
  const total = allItems.length;
  const withPhoto = allItems.filter((it) => !!it.photoUrl).length;
  const photoLevel: "full" | "partial" | "none" =
    total === 0
      ? "none"
      : withPhoto === total
        ? "full"
        : withPhoto === 0
          ? "none"
          : "partial";

  return (
    <div className="border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
      <div className="mb-1 text-[9.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        🔍 候補の確認ポイント
      </div>
      <div className="flex flex-wrap gap-1">
        <CheckChip status="ok" label="グループ・キャラ・種別 一致" />
        <CheckChip
          status={photoLevel === "full" ? "ok" : photoLevel === "partial" ? "warn" : "missing"}
          label={
            photoLevel === "full"
              ? "写真 全あり"
              : photoLevel === "partial"
                ? `写真 ${withPhoto}/${total}`
                : "写真なし — 要確認"
          }
        />
        <CheckChip status="missing" label="シリーズタグ 未登録" />
      </div>
      <div className="mt-1 text-[9.5px] leading-relaxed text-[#3a324a8c]">
        ※ 同種/異種の判断やシリーズ確認は<b>写真と本人</b>で。完全マッチではなく可能性の高い候補です。
      </div>
    </div>
  );
}

function CheckChip({
  status,
  label,
}: {
  status: "ok" | "warn" | "missing";
  label: string;
}) {
  const cls =
    status === "ok"
      ? "bg-[#a695d814] border-[#a695d855] text-[#a695d8]"
      : status === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-[#3a324a06] border-[#3a324a14] text-[#3a324a8c]";
  const icon =
    status === "ok" ? "✓" : status === "warn" ? "△" : "○";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[9.5px] font-bold ${cls}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

/* ─── 関係図 — 左に譲 / 中央 SVG 実線 / 右に選択肢縦並び（可変高さ） ─── */

/** option カードの動的高さを計算（候補の表示行数による） */
function calcOptionHeight(opt: MatchCardOption): number {
  if (opt.isCashOffer) return OPT_CASH_H;
  // wish が 0 件のケース（理論上ないが安全策）
  const wishes = opt.wishes.length === 0 ? 1 : opt.wishes.length;
  // 1 wish あたり：ラベル行 + 候補サムネ行（候補なしなら短い 1 行）
  const wishesH = opt.wishes.reduce((sum, w) => {
    return (
      sum +
      OPT_WISH_ROW_LABEL_H +
      (w.candidates.length > 0
        ? OPT_WISH_ROW_THUMBS_H
        : OPT_NO_CANDIDATES_H) +
      OPT_WISH_ROW_GAP
    );
  }, 0);
  // wishes が 0 のとき空ガード
  const safeWishesH = opt.wishes.length === 0 ? wishes * 28 : wishesH;
  return OPT_HEADER_H + safeWishesH + OPT_PADDING_Y;
}

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
  // iter104: 各 option の高さを動的計算
  const optionHeights = sortedOptions.map(calcOptionHeight);
  const containerH =
    optionHeights.reduce((s, h) => s + h, 0) +
    Math.max(0, sortedOptions.length - 1) * OPT_GAP;
  // 各 option の Y 中心座標（SVG 線の終点）
  const optionTops: number[] = [];
  let acc = 0;
  for (let i = 0; i < sortedOptions.length; i++) {
    optionTops.push(acc);
    acc += optionHeights[i] + OPT_GAP;
  }
  const optionCenters = optionTops.map((top, i) => top + optionHeights[i] / 2);
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
                y2={optionCenters[i]}
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

        {/* 右カラム：選択肢縦並び（タップで toggle・可変高さ） */}
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
                top: optionTops[i],
                width: RIGHT_W,
                height: optionHeights[i],
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

/* ─── 選択肢カード（iter104: wish ごとに候補サムネを表示） ─── */

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
      : "border border-[#3a324a14] bg-white opacity-80";

  return (
    <div
      className={`flex h-full w-full flex-col rounded-[10px] px-2.5 py-1.5 text-left ${containerCls}`}
    >
      {/* ヘッダー行：position / kind chip / logic chip / 選択中 ✓ */}
      <div className="flex items-center gap-1 text-[9.5px]">
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
        <div className="flex-1" />
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
            selected
              ? "bg-[#a695d8] text-white"
              : "border border-[#3a324a14] text-transparent"
          }`}
        >
          ✓
        </span>
      </div>

      {/* 本体：cash か wishes */}
      {option.isCashOffer ? (
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-extrabold text-[#7a9a8a]">
          <span className="text-[14px]">💴</span>
          <span>¥{option.cashAmount?.toLocaleString() ?? "—"}</span>
          <span className="text-[9px] font-bold text-[#3a324a8c]">
            （マッチング対象外）
          </span>
        </div>
      ) : (
        <div className="mt-1 flex flex-col gap-1">
          {option.wishes.map((w) => (
            <WishWithCandidates key={w.item.id} wish={w} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * iter104: 1 wish + その候補サムネ群
 *
 * - 上：wish のラベル（× qty）と候補件数バッジ
 * - 下：候補サムネ（写真 or イニシャル、最大 5 件まで横並び。それ以上は +N）
 *   候補が 0 件の場合は「該当なし」を表示
 */
function WishWithCandidates({
  wish,
}: {
  wish: { item: MiniItem; qty: number; candidates: { item: MiniItem; qty: number }[] };
}) {
  const visibleMax = 5;
  const visible = wish.candidates.slice(0, visibleMax);
  const overflow = wish.candidates.length - visible.length;
  const hasCands = wish.candidates.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 text-[10px]">
        <span className="font-bold text-[#3a324a]">
          {wish.item.label}
        </span>
        <span className="font-bold tabular-nums text-[#3a324a8c]">
          ×{wish.qty}
        </span>
        <div className="flex-1" />
        <span
          className={`rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold ${
            hasCands
              ? "bg-[#a695d8] text-white"
              : "bg-[#3a324a08] text-[#3a324a8c]"
          }`}
        >
          {hasCands ? `候補 ${wish.candidates.length}` : "候補なし"}
        </span>
      </div>
      {hasCands ? (
        <div className="mt-1 flex items-center gap-1">
          {visible.map((c) => (
            <CandidateThumb key={c.item.id} item={c.item} />
          ))}
          {overflow > 0 && (
            <span className="text-[9px] font-bold text-[#3a324a8c]">
              +{overflow}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-0.5 text-[9.5px] italic text-[#3a324a4d]">
          相手の譲に該当する候補がありません
        </div>
      )}
    </div>
  );
}

/** iter104: 候補専用のサムネ（matched=true 前提・小さめ） */
function CandidateThumb({ item }: { item: MiniItem }) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  const W = 30;
  const H = 30;

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded border border-[#a8d4e6] shadow-[0_1px_3px_rgba(58,50,74,0.15)]"
      style={{
        width: W,
        height: H,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={item.label}
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
          className="text-[12px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] ?? "?"}
        </span>
      )}
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
