"use client";

/**
 * iter69-B：個別募集（listings）の自分一覧。
 *
 * 設計：マッチ詳細モーダル（MatchDetailModal）の ListingDiagram 風レイアウトを
 * 流用 — 左に「譲」群 / 中央に SVG で実線 / 右に「求」選択肢縦並び。
 *
 * - 編集ボタン（→ /listings/[id]/edit）
 * - 一時停止 / 再開 / 削除
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteListing, updateListing } from "./actions";

export type ListingHaveItem = {
  id: string;
  title: string;
  qty: number;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

export type ListingWishItem = {
  id: string;
  title: string;
  qty: number;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

export type ListingOption = {
  id: string;
  position: number;
  logic: "and" | "or";
  exchangeType: "same_kind" | "cross_kind" | "any";
  isCashOffer: boolean;
  cashAmount: number | null;
  groupName: string | null;
  goodsTypeName: string | null;
  wishes: ListingWishItem[];
};

export type ListingItem = {
  id: string;
  haves: ListingHaveItem[];
  haveLogic: "and" | "or";
  haveGroupName: string | null;
  haveGoodsTypeName: string | null;
  options: ListingOption[];
  status: "active" | "paused" | "matched" | "closed";
  note: string | null;
};

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

/* レイアウト数値（MatchDetailModal と揃える） */
const HAVE_W = 64;
const HAVE_H = 84;
const OPT_H = 64;
const OPT_GAP = 8;
const SVG_W = 56;
const RIGHT_W = 220;

export function ListingsView({
  items,
  readOnly = false,
}: {
  items: ListingItem[];
  /**
   * iter146：閲覧専用モード（他人プロフでの公開個別募集表示用）。
   * - 編集 / 一時停止 / 削除 ボタン非表示
   * - 「まだ個別募集がありません」の追加導線も非表示
   */
  readOnly?: boolean;
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (readOnly) return;
    if (!confirm("この個別募集を削除しますか？")) return;
    const r = await deleteListing(id);
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  async function togglePause(id: string, currentStatus: ListingItem["status"]) {
    if (readOnly) return;
    const next = currentStatus === "active" ? "paused" : "active";
    const r = await updateListing({ id, status: next });
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    if (readOnly) {
      return (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
          公開中の個別募集はありません
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
        まだ個別募集がありません
        <br />
        <Link
          href="/listings/new"
          className="mt-2 inline-block font-bold text-[#a695d8]"
        >
          + 個別募集を追加
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <ListingCard
          key={it.id}
          listing={it}
          index={idx}
          onTogglePause={() => togglePause(it.id, it.status)}
          onDelete={() => handleDelete(it.id)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

/* ─── 個別募集カード ─── */

function ListingCard({
  listing,
  index,
  onTogglePause,
  onDelete,
  readOnly,
}: {
  listing: ListingItem;
  index: number;
  onTogglePause: () => void;
  onDelete: () => void;
  /** iter146：閲覧専用（他人プロフ表示時）— アクションボタン群を非表示 */
  readOnly?: boolean;
}) {
  const isActive = listing.status === "active";
  const isPaused = listing.status === "paused";
  const isClosed = listing.status === "closed";
  const isMatched = listing.status === "matched";

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] ${
        isActive
          ? "border-[#a695d855]"
          : "border-[#3a324a14] opacity-70"
      }`}
    >
      {/* ヘッダ */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          #{index + 1}
        </span>
        <span
          className={`rounded-full px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.5px] ${
            isActive
              ? "bg-emerald-500 text-white"
              : isPaused
                ? "bg-[#3a324a14] text-[#3a324a8c]"
                : isMatched
                  ? "bg-[#a8d4e620] text-[#5a9bbe]"
                  : "bg-[#3a324a14] text-[#3a324a8c]"
          }`}
        >
          {isActive
            ? "ACTIVE"
            : isPaused
              ? "一時停止"
              : isMatched
                ? "MATCHED"
                : isClosed
                  ? "完了"
                  : listing.status.toUpperCase()}
        </span>
        {listing.haveGroupName && listing.haveGoodsTypeName && (
          <span className="truncate text-[10px] font-bold text-[#3a324a8c]">
            {listing.haveGroupName} × {listing.haveGoodsTypeName}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[9.5px] text-[#3a324a8c]">
          {listing.options.length} 選択肢
        </span>
      </div>

      {/* 関係図 */}
      <div className="px-2 py-2.5">
        <Diagram listing={listing} />
      </div>

      {listing.note && (
        <div className="mx-3 mb-2 rounded-lg bg-[#3a324a06] px-2.5 py-1.5 text-[11px] text-[#3a324a]">
          {listing.note}
        </div>
      )}

      {/* アクションボタン群（iter146: readOnly では非表示） */}
      {!readOnly && (
      <div className="flex gap-1.5 border-t border-[#3a324a08] px-3 py-2">
        <Link
          href={`/listings/${listing.id}/edit`}
          className="flex-1 rounded-[10px] bg-[#a695d80f] py-2 text-center text-[11px] font-bold text-[#a695d8]"
        >
          ✎ 編集
        </Link>
        <button
          type="button"
          onClick={onTogglePause}
          disabled={isMatched || isClosed}
          className="flex-1 rounded-[10px] bg-[#3a324a08] py-2 text-[11px] font-bold text-[#3a324a] disabled:opacity-50"
        >
          {isPaused ? "再開" : "一時停止"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-[10px] bg-red-50 px-3 py-2 text-[11px] font-bold text-red-500"
        >
          削除
        </button>
      </div>
      )}
    </div>
  );
}

/* ─── 関係図 — 左に譲 / 中央 SVG 線 / 右に選択肢縦並び ─── */

function Diagram({ listing }: { listing: ListingItem }) {
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
        style={{
          width: totalW,
          height: containerH,
        }}
      >
        {/* SVG 線（全部実線） */}
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
              opacity={0.7}
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
                  <ItemThumb key={h.id} item={h} kind="have" />
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

        {/* 右カラム：選択肢縦並び */}
        {sortedOptions.map((opt, i) => (
          <div
            key={opt.id}
            className="absolute"
            style={{
              left: HAVE_W + SVG_W,
              top: i * (OPT_H + OPT_GAP),
              width: RIGHT_W,
              height: OPT_H,
            }}
          >
            <OptionRow option={opt} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 選択肢 1 行 ─── */

function OptionRow({ option }: { option: ListingOption }) {
  return (
    <div className="flex h-full w-full items-center gap-2 rounded-[10px] border border-[#a695d855] bg-white px-2 py-1.5">
      {option.isCashOffer ? (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-[#7a9a8a55] bg-[#7a9a8a14] text-[16px]">
          💴
        </div>
      ) : (
        <div className="flex flex-shrink-0 gap-0.5">
          {option.wishes.slice(0, 2).map((w) => (
            <ItemThumb key={w.id} item={w} kind="wish" />
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
            <span
              className="rounded-full px-1 py-[1px] font-extrabold text-white"
              style={{
                background:
                  option.exchangeType === "same_kind"
                    ? "#5fa884"
                    : option.exchangeType === "cross_kind"
                      ? "#d9826b"
                      : "linear-gradient(135deg, #5fa884, #d9826b)",
              }}
            >
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
                .map((w) => `${w.characterName ?? w.groupName ?? w.title} ×${w.qty}`)
                .join(" / ")}
        </div>
      </div>
    </div>
  );
}

/* ─── アイテムサムネ ─── */

function ItemThumb({
  item,
  kind,
}: {
  item: ListingHaveItem | ListingWishItem;
  kind: "have" | "wish";
}) {
  const name = item.characterName ?? item.groupName ?? item.title;
  const hue = (Math.abs(name.charCodeAt(0) * 17) + 260) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 86%) 0 4px, hsl(${hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${hue}, 30%, 30%, 0.5)`;
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
      title={`${item.title} ×${item.qty}`}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <span
          className="text-[14px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {name[0] || "?"}
        </span>
      )}
      <span className="absolute right-0 top-0 rounded-bl-md bg-black/55 px-0.5 text-[7.5px] font-extrabold leading-tight text-white">
        ×{item.qty}
      </span>
    </div>
  );
}
