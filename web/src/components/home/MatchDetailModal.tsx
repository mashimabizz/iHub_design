"use client";

/**
 * iter67.8：個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * 主な変更点（iter67.7 から）：
 * - **複数選択肢トグル**：各選択肢タップで有効化／解除。1 つ以上有効化すると
 *   フッター固定の「打診に進む（n 件選択中）」ボタンが出現
 * - **在庫オーバーチェック**：選択中の組合せで自分が出すべき総量が在庫を超えると
 *   そのトグルを抑制 + アラート表示
 * - **線は全部実線**（実線/点線の意味区別なし）
 * - **緑チェック削除**：成立／未成立は枠色 + opacity でのみ表現
 *
 * レイアウト：
 *   左カラム：listing.haves（共通、1 度だけ）
 *   右カラム：選択肢縦並び（成立優先 → 未成立は薄く）
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MatchCardListingInfo,
  MatchCardOption,
  MiniItem,
} from "./MatchCard";

const HAVE_W = 64;
const HAVE_H = 84;
const OPT_H = 64;
const OPT_GAP = 8;
const SVG_W = 56;
const RIGHT_W = 240;

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
  myInventoryQty,
  onClose,
}: {
  partnerHandle: string;
  partnerId: string;
  matchType: "complete" | "they_want_you" | "you_want_them";
  myListings: MatchCardListingInfo[];
  partnerListings: MatchCardListingInfo[];
  myInventoryQty: Record<string, number>;
  onClose: () => void;
}) {
  const router = useRouter();

  /**
   * 選択された option id の集合。listing 単位で個別に管理：
   *   selected[listingId] = Set<optionId>
   * 異なる listing にまたがる選択は禁止（同 listing 内のみ複数選べる）
   * → 単純化：1 listing しか選択できない state にする
   */
  const [selected, setSelected] = useState<{
    listingId: string;
    optionIds: Set<string>;
  } | null>(null);

  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const allListings = useMemo(
    () => [
      ...myListings.map((l) => ({ kind: "mine" as const, listing: l })),
      ...partnerListings.map((l) => ({
        kind: "partner" as const,
        listing: l,
      })),
    ],
    [myListings, partnerListings],
  );

  /**
   * ある listing で option を toggle するとき、追加した結果の総量を計算して
   * 自分の在庫を超えるかチェック。
   *
   * @returns OK = null / NG = 警告メッセージ
   */
  function checkAndToggle(
    listing: MatchCardListingInfo,
    optionId: string,
  ): string | null {
    // 別 listing が選択中なら state をリセット
    let next: Set<string>;
    if (selected && selected.listingId !== listing.listingId) {
      next = new Set([optionId]);
    } else {
      next = new Set(selected?.optionIds ?? []);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }
    }

    if (next.size === 0) {
      setSelected(null);
      return null;
    }

    // 必要量を計算
    const required: Record<string, number> = {};
    const N = next.size;
    // listing 全体の per-option commitment × N
    for (const c of listing.perOptionMyCommitment) {
      required[c.itemId] = (required[c.itemId] ?? 0) + c.qty * N;
    }
    // 各 option の追加 commitment
    for (const opt of listing.options) {
      if (!next.has(opt.id)) continue;
      for (const c of opt.myAdditionalCommitments) {
        required[c.itemId] = (required[c.itemId] ?? 0) + c.qty;
      }
    }

    // 在庫オーバー検出
    const overflows: { itemId: string; need: number; have: number }[] = [];
    for (const itemId of Object.keys(required)) {
      const need = required[itemId];
      const have = myInventoryQty[itemId] ?? 0;
      if (need > have) {
        overflows.push({ itemId, need, have });
      }
    }
    if (overflows.length > 0) {
      const first = overflows[0];
      // アイテム名は modal 内では知らないので、汎用メッセージ
      return `自分の在庫が足りません（必要 ×${first.need} / 在庫 ×${first.have}）。選択肢を減らすか、別の組合せを試してください。`;
    }

    setSelected({ listingId: listing.listingId, optionIds: next });
    return null;
  }

  function handleToggle(listing: MatchCardListingInfo, optionId: string) {
    const err = checkAndToggle(listing, optionId);
    if (err) {
      setAlertMsg(err);
      // 3 秒後に alert 自動消去
      setTimeout(() => setAlertMsg(null), 4000);
    } else {
      setAlertMsg(null);
    }
  }

  function handleProceed() {
    if (!selected || selected.optionIds.size === 0) return;
    const allOpts = [
      ...myListings.flatMap((l) => l.options),
      ...partnerListings.flatMap((l) => l.options),
    ];
    const positions = Array.from(selected.optionIds)
      .map((id) => allOpts.find((o) => o.id === id)?.position)
      .filter((p): p is number => p !== undefined)
      .sort((a, b) => a - b);
    const url = `/propose/${partnerId}?matchType=${matchType}&listing=${selected.listingId}&options=${positions.join(",")}`;
    router.push(url);
  }

  const selectedCount = selected?.optionIds.size ?? 0;

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

      <div
        className={`mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] py-3 ${
          selectedCount > 0 ? "pb-[100px]" : ""
        }`}
      >
        <div className="mb-2.5 rounded-[10px] bg-[#a695d810] px-3 py-2 text-[10.5px] leading-relaxed text-[#3a324a]">
          <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            🔗 関係図
          </span>
          選択肢を <b>タップで有効化</b>
          できます。複数選んで組合せ打診も可能（同じ募集内のみ）。
          自分の在庫が足りなくなる組合せはアラートで防止します。
        </div>

        {alertMsg && (
          <div className="mb-2.5 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            ⚠️ {alertMsg}
          </div>
        )}

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
                selectedOptionIds={
                  selected?.listingId === l.listingId
                    ? selected.optionIds
                    : new Set()
                }
                onToggle={(optId) => handleToggle(l, optId)}
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
                selectedOptionIds={
                  selected?.listingId === l.listingId
                    ? selected.optionIds
                    : new Set()
                }
                onToggle={(optId) => handleToggle(l, optId)}
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

      {/* フッター固定の「打診に進む」 CTA */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-[#3a324a14] bg-white/95 px-[18px] pb-7 pt-3 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-md">
            <button
              type="button"
              onClick={handleProceed}
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.97]"
            >
              この {selectedCount} 件の選択肢で打診に進む →
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-1 block w-full text-center text-[10.5px] text-[#3a324a8c]"
            >
              選択をクリア
            </button>
          </div>
        </div>
      )}
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

/* ─── 1 listing 分の関係図 ─── */

function ListingDiagram({
  listing,
  index,
  selectedOptionIds,
  onToggle,
}: {
  listing: MatchCardListingInfo;
  index: number;
  selectedOptionIds: Set<string>;
  onToggle: (optionId: string) => void;
}) {
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
            width: HAVE_W + SVG_W + RIGHT_W,
            height: containerH,
          }}
        >
          {/* SVG 線（全部実線、iter67.8） */}
          <svg
            width={HAVE_W + SVG_W + RIGHT_W}
            height={containerH}
            className="pointer-events-none absolute left-0 top-0"
          >
            {sortedOptions.map((opt, i) => {
              const y2 = optionYs[i];
              const isSelected = selectedOptionIds.has(opt.id);
              return (
                <line
                  key={opt.id}
                  x1={HAVE_W}
                  y1={haveAnchorY}
                  x2={HAVE_W + SVG_W}
                  y2={y2}
                  stroke={isSelected ? "#a695d8" : "#a695d8"}
                  strokeWidth={isSelected ? 2.4 : 1.8}
                  strokeLinecap="round"
                  opacity={
                    isSelected ? 0.95 : opt.matched ? 0.7 : 0.35
                  }
                />
              );
            })}
          </svg>

          {/* 左カラム：listing.haves */}
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
                width: RIGHT_W,
                height: OPT_H,
              }}
            >
              <OptionRow
                option={opt}
                isSelected={selectedOptionIds.has(opt.id)}
                onToggle={() => onToggle(opt.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 各選択肢 1 行（タップで toggle） ─── */

function OptionRow({
  option,
  isSelected,
  onToggle,
}: {
  option: MatchCardOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-full w-full items-center gap-2 rounded-[10px] border bg-white px-2 py-1.5 text-left transition-all active:scale-[0.98] ${
        isSelected
          ? "border-[2px] border-[#a695d8] bg-[#a695d80f] shadow-[0_4px_10px_rgba(166,149,216,0.25)]"
          : option.matched
            ? "border-[#a695d855]"
            : "border-[#3a324a14] bg-[#fbf9fc]"
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

      {/* 選択済みインジケータ（緑チェック → 紫レ点に変更） */}
      {isSelected && (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#a695d8] text-white shadow-[0_2px_5px_rgba(166,149,216,0.45)]">
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path
              d="M2 5.5L4.5 8L9 3"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

/* ─── 小さなアイテムサムネ ─── */

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
        kind === "have" ? "border-[#a8d4e6]" : "border-[#f3c5d4]"
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
