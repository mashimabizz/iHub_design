/**
 * マッチカード（モックアップ home-v2.jsx::CompleteCardV2 + OneWayList 準拠）
 *
 * - ヘッダー: アバター + @handle + 距離 + マッチタイプ pill
 * - Trade preview: 左=相手の譲（私が受け取る）/ 中央=矢印 / 右=私の譲（相手が受け取る）
 * - 各アイテムは aspect-3/4 のミニカード（写真 or イニシャル）
 * - CTA: 打診する / スキップ
 */

export type MiniItem = {
  id: string;
  label: string; // メンバー名 or グループ名
  goodsTypeName: string | null;
  photoUrl: string | null;
  hue: number; // 0〜360
};

export type MatchCardData = {
  id: string;
  userName: string;
  userHandle: string;
  myGives: MiniItem[]; // 私の譲（=相手が欲しい・私が出す）
  theirGives: MiniItem[]; // 相手の譲（=私が受け取る）
  matchType: "complete" | "they_want_you" | "you_want_them";
  distance: string; // 「広域」 or 都道府県
  exchangeType?: "same_kind" | "cross_kind" | "any";
};

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種のみ",
  cross_kind: "異種のみ",
  any: "どちらでも",
};

export function MatchCard({ card }: { card: MatchCardData }) {
  const isComplete = card.matchType === "complete";
  const matchLabel = isComplete
    ? "COMPLETE"
    : card.matchType === "they_want_you"
      ? "あなたを求めてる"
      : "あなたの欲しいを持つ";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#a695d830] bg-white p-3.5 shadow-[0_8px_24px_rgba(166,149,216,0.10)]">
      {/* soft top tint (complete のみ) */}
      {isComplete && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              "linear-gradient(180deg, rgba(166,149,216,0.06), transparent)",
          }}
        />
      )}

      {/* マッチタイプ pill (右上) */}
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

      {/* Header */}
      <div className="relative flex items-center gap-2.5 pr-24">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
          {card.userName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-gray-900">
            @{card.userHandle}
          </div>
          <div className="mt-0.5 text-[10.5px] tabular-nums text-gray-500">
            {card.distance}
          </div>
        </div>
      </div>

      {/* Trade preview: 相手の譲 ↔ 私の譲 */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 rounded-2xl bg-[#a8d4e614] p-2.5">
        {/* 相手の譲（左）= 私が受け取る */}
        <SidePanel
          label={`相手の譲（${card.theirGives.length}）`}
          items={card.theirGives}
          align="left"
        />

        {/* 中央: 矢印 */}
        <div className="flex flex-col items-center gap-1">
          <ArrowDot color="#a695d8" dir="right" />
          <ArrowDot color="#a8d4e6" dir="left" />
        </div>

        {/* 私の譲（右）= 相手が受け取る */}
        <SidePanel
          label={`あなたの譲（${card.myGives.length}）`}
          items={card.myGives}
          align="right"
          accent="#f3c5d4cc"
        />
      </div>

      {/* 交換タイプタグ */}
      {card.exchangeType && card.exchangeType !== "any" && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="rounded-full border border-[#a695d855] bg-[#a695d80a] px-2 py-0.5 text-[10px] font-bold text-[#a695d8]">
            {EXCHANGE_LABEL[card.exchangeType]}
          </span>
          <span className="text-[9.5px] text-gray-500">
            ※ 相手の自己申告
          </span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-2.5 text-[13px] font-bold tracking-[0.4px] text-white shadow-[0_4px_12px_rgba(166,149,216,0.4)] transition-all duration-150 active:scale-[0.97]"
        >
          打診する
        </button>
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

/* ─── Sub-components ─────────────────────────────────── */

/**
 * 左 / 右パネル（譲アイテム群）
 */
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

/**
 * 1 アイテム = 写真 or イニシャル の 縦長カード（Trading Card 風）
 */
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
