"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitEvaluation } from "../../actions";

export type WishProgress = {
  focusName: string; // ex: "スア"
  groupName: string | null;
  typeName: string | null;
  total: number;
  acquired: number;
};

export type RateData = {
  proposalId: string;
  partnerHandle: string;
  partnerDisplayName: string;
  alreadyRated: boolean;
  myStars: number | null;
  myComment: string | null;
  wishProgress: WishProgress | null;
};

export function RateView({ data }: { data: RateData }) {
  const router = useRouter();
  const [stars, setStars] = useState<number>(data.myStars ?? 5);
  const [comment, setComment] = useState<string>(data.myComment ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const r = await submitEvaluation({
        proposalId: data.proposalId,
        stars,
        comment: comment.trim() || undefined,
      });
      if (r?.error) setError(r.error);
      else if (r?.redirectTo) router.push(r.redirectTo);
    });
  }

  function handleXShare() {
    const text = `@${data.partnerHandle} さんと交換しました ✨\n#iHub`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-[#fbf9fc]">
      {/* celebrate header */}
      <div
        className="px-[18px] pt-12 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(166,149,216,0.13), transparent)",
        }}
      >
        <div
          className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)]"
          style={{ boxShadow: "0 8px 20px rgba(166,149,216,0.31)" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path
              d="M6 14l5 5 11-12"
              stroke="#fff"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mt-3 text-[20px] font-bold tracking-[0.4px] text-[#3a324a]">
          取引完了！
        </div>
        <div className="mt-1 text-[12px] text-[#3a324a8c]">
          @{data.partnerHandle} との交換が記録されました
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[18px] pb-[120px] pt-3">
        <div className="mx-auto max-w-md space-y-3.5">
          {/* Rating */}
          <div className="rounded-[16px] border border-[#3a324a14] bg-white px-4 py-4">
            <div className="mb-3 text-center text-[13px] font-bold text-[#3a324a]">
              取引相手を評価
            </div>
            <div className="mb-3 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  disabled={data.alreadyRated}
                  className="h-9 w-9 disabled:opacity-80"
                  aria-label={`${n} 星`}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <path
                      d="M16 3l4 8.4 9.2 1.4-6.6 6.4 1.6 9-8.2-4.4-8.2 4.4 1.6-9L2.8 12.8 12 11.4z"
                      fill={n <= stars ? "#a695d8" : "#3a324a14"}
                    />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              placeholder="コメント（任意）— 親切でした、合流もスムーズでした、など"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={data.alreadyRated}
              maxLength={1000}
              rows={3}
              className="block w-full resize-none rounded-[12px] border-[0.5px] border-[#3a324a14] bg-[#fbf9fc] p-3 text-[12.5px] leading-relaxed text-[#3a324a] focus:border-[#a695d8] focus:outline-none disabled:opacity-70"
            />
            {data.alreadyRated && (
              <div className="mt-2 text-center text-[11px] font-bold text-emerald-600">
                ✓ 評価送信済み
              </div>
            )}
          </div>

          {/* Collection update */}
          {data.wishProgress && (
            <CollectionCard wp={data.wishProgress} />
          )}

          {/* X share */}
          <div className="flex items-center gap-3 rounded-[16px] border border-[#3a324a14] bg-white px-3.5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-black text-[15px] font-extrabold text-white">
              X
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[#3a324a]">
                Xで報告ポストを作成
              </div>
              <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">
                交換完了の御礼テキスト＋画像を自動生成
              </div>
            </div>
            <button
              type="button"
              onClick={handleXShare}
              className="rounded-[10px] bg-[#3a324a08] px-3 py-1.5 text-[11.5px] font-bold text-[#3a324a]"
            >
              作成
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute inset-x-0 bottom-0 border-t border-[#a695d822] bg-white/92 px-[18px] pb-7 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {data.alreadyRated ? (
            <Link
              href="/transactions"
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-3 text-center text-[15px] font-bold tracking-[0.4px] text-white shadow-[0_6px_16px_rgba(166,149,216,0.31)]"
            >
              取引一覧に戻る
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-3 text-center text-[15px] font-bold tracking-[0.4px] text-white shadow-[0_6px_16px_rgba(166,149,216,0.31)] disabled:opacity-50"
            >
              評価を送信
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function CollectionCard({ wp }: { wp: WishProgress }) {
  const ratio = wp.total > 0 ? Math.min(1, wp.acquired / wp.total) : 0;
  const remaining = Math.max(0, wp.total - wp.acquired);
  return (
    <div
      className="rounded-[16px] border border-[#f3c5d455] px-3.5 py-3.5"
      style={{
        background:
          "linear-gradient(120deg, rgba(243,197,212,0.18), rgba(168,212,230,0.18))",
      }}
    >
      <div className="mb-2 text-[11px] font-bold tracking-[0.5px] text-[#a695d8]">
        ◆ あなたのコレクション更新（wish 基準）
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-shrink-0 -space-x-1">
          {[0, 1, 2].map((i) => {
            const hue = (280 + i * 10) % 360;
            return (
              <div
                key={i}
                className="flex h-9 w-7 items-center justify-center rounded-[3px] border-2 border-white text-[12px] font-extrabold text-white/95"
                style={{
                  background: `repeating-linear-gradient(135deg, hsl(${hue}, 35%, 78%) 0 5px, hsl(${hue}, 35%, 70%) 5px 10px)`,
                  zIndex: 3 - i,
                }}
              >
                {wp.focusName[0]}
              </div>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[#3a324a]">
            {wp.focusName} の wish 進捗
          </div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            {wp.acquired} / {wp.total} 取得
            {remaining > 0 ? (
              <>
                {" — あと "}
                <b className="text-[#a695d8]">{remaining}枚</b>
                {" で "}
                <b className="text-[#a695d8]">{wp.focusName} コンプ</b>
              </>
            ) : (
              <>
                {" — "}
                <b className="text-[#a695d8]">コンプリート達成 🎉</b>
              </>
            )}
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-[#3a324a14]">
            <div
              className="h-full rounded-[2px] bg-[linear-gradient(90deg,#a695d8,#a8d4e6)]"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
