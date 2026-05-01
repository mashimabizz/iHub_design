/**
 * マッチカード（簡易版・モックデータ用）
 * 後続 iter で実データ + アクション（打診・スキップ）を実装。
 */

export type MockMatchCard = {
  id: string;
  userName: string;
  userHandle: string;
  oshiName: string; // "LUMENA"
  memberName: string; // "スア"
  givesLabel: string; // "スア トレカ・缶バッジ" など
  wantsLabel: string; // "ヒナ アクスタ" など
  matchType: "complete" | "they_want_you" | "you_want_them";
  distance: string; // "横浜アリーナ 周辺・15m"
};

export function MatchCard({ card }: { card: MockMatchCard }) {
  const matchLabel =
    card.matchType === "complete"
      ? "完全マッチ"
      : card.matchType === "they_want_you"
        ? "相手があなたの譲を希望"
        : "あなたが相手の譲を希望";

  const matchColor =
    card.matchType === "complete"
      ? "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white"
      : "bg-[#a695d822] text-[#a695d8]";

  return (
    <div className="rounded-2xl border border-[#3a324a14] bg-white p-4 shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        {/* アバター */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-base font-bold text-[#a695d8]">
          {card.userName[0]}
        </div>

        {/* 名前 + 距離 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {card.userName}
            </span>
            <span className="text-[11px] text-gray-500">
              @{card.userHandle}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500">
            {card.distance}
          </div>
        </div>

        {/* マッチタイプバッジ */}
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${matchColor}`}
        >
          {matchLabel}
        </span>
      </div>

      {/* 譲・受 */}
      <div className="mt-3 space-y-1.5 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#a8d4e622] px-1.5 py-0.5 text-[10px] font-bold text-[#5a9bbe]">
            譲
          </span>
          <span className="flex-1 text-gray-700">{card.givesLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-[#f3c5d422] px-1.5 py-0.5 text-[10px] font-bold text-[#c47a8e]">
            受
          </span>
          <span className="flex-1 text-gray-700">{card.wantsLabel}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-[#3a324a14] bg-white px-3 py-2 text-xs font-bold text-gray-700 transition-all duration-150 active:scale-[0.97]"
        >
          スキップ
        </button>
        <button
          type="button"
          className="flex-[2] rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(166,149,216,0.33)] transition-all duration-150 active:scale-[0.97]"
        >
          打診する
        </button>
      </div>
    </div>
  );
}
