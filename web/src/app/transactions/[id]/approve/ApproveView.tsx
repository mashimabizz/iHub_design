"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveCompletion } from "../../actions";

export type ApproveRow = {
  side: "me" | "them";
  handle: string;
  desc: string;
  letters: string[];
};

export type ApprovePhoto = {
  id: string;
  photoUrl: string;
  position: number;
  takenAt: string;
};

export type ApproveData = {
  proposalId: string;
  photos: ApprovePhoto[];
  photoTakenAt: string | null;
  placeName: string | null;
  rows: ApproveRow[];
  partnerHandle: string;
  myApproved: boolean;
  partnerApproved: boolean;
};

export function ApproveView({ data }: { data: ApproveData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const r = await approveCompletion({ proposalId: data.proposalId });
      if (r?.error) setError(r.error);
      else if (r?.redirectTo) router.push(r.redirectTo);
      else router.refresh();
    });
  }

  // iter79-C: 「相違あり」→ /disputes/new フォームに遷移
  function handleDispute() {
    router.push(`/disputes/new?proposalId=${data.proposalId}`);
  }

  const dt = data.photoTakenAt ? new Date(data.photoTakenAt) : null;
  const photoMeta = dt
    ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
    : "—";

  return (
    <div className="relative flex flex-1 flex-col bg-[#fbf9fc]">
      <div className="flex-1 overflow-y-auto px-4 pb-[120px] pt-4">
        <div className="mx-auto max-w-md space-y-3.5">
          {/* 撮影写真ギャラリー（横スワイプ + peek） */}
          <PhotoCarousel
            photos={data.photos}
            firstMeta={photoMeta}
            placeName={data.placeName}
            proposalId={data.proposalId}
          />

          {/* アイテムリスト */}
          <div className="overflow-hidden rounded-[16px] border border-[#3a324a14] bg-white">
            {data.rows.map((r, i) => (
              <div key={i}>
                <ItemRow row={r} />
                {i < data.rows.length - 1 && (
                  <div className="h-[0.5px] bg-[#3a324a14]" />
                )}
              </div>
            ))}
          </div>

          {/* 両者の確認ステータス */}
          <div className="rounded-[16px] border border-[#3a324a14] bg-white px-3.5 py-3.5">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.5px] text-[#3a324a8c]">
              両者の確認
            </div>
            <ApproveStatusRow
              done={data.partnerApproved}
              label={`@${data.partnerHandle} が承認`}
              sub={data.partnerApproved ? "承認済" : "承認待ち"}
            />
            <div className="h-2.5" />
            <ApproveStatusRow
              done={data.myApproved}
              label="あなたの承認"
              sub={data.myApproved ? "承認済" : "内容を確認してください"}
            />
          </div>

          <div className="rounded-[10px] bg-[#3a324a08] px-3 py-2 text-[11px] leading-relaxed text-[#3a324a8c]">
            内容に問題がある場合は「相違あり」を選び、後でサポートに通報できます。
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
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            onClick={handleDispute}
            disabled={pending || data.myApproved}
            className="rounded-[14px] border border-[#3a324a14] bg-white px-4 py-3 text-[13px] font-semibold text-[#3a324a] disabled:opacity-50"
          >
            相違あり
          </button>
          <button
            type="button"
            onClick={handleApprove}
            // 自分が承認済 + 相手未承認 のときだけ disable（相手待ち中）
            // 両者承認済（旧データ救済）or 自分未承認 のときは押せる
            disabled={
              pending || (data.myApproved && !data.partnerApproved)
            }
            className="flex-1 rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-3 text-[15px] font-bold tracking-[0.4px] text-white shadow-[0_6px_16px_rgba(166,149,216,0.31)] disabled:opacity-50"
          >
            {data.myApproved && !data.partnerApproved
              ? "承認済（相手の承認待ち）"
              : data.myApproved && data.partnerApproved
                ? "完了処理を実行 →"
                : "承認して完了"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApproveStatusRow({
  done,
  label,
  sub,
}: {
  done: boolean;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M3 7l3 3 5-6"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : (
        <div className="h-7 w-7 flex-shrink-0 rounded-full border-[1.5px] border-dashed border-[#a695d888] bg-[#3a324a08]" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[#3a324a]">
          {label}
        </div>
        <div className="text-[10.5px] text-[#3a324a8c]">{sub}</div>
      </div>
    </div>
  );
}

function ItemRow({ row }: { row: ApproveRow }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          row.side === "me" ? "bg-[#f3c5d455]" : "bg-[#a8d4e655]"
        }`}
      >
        {row.side === "me" ? "私" : "相"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-[#3a324a]">
          @{row.handle}
        </div>
        <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">{row.desc}</div>
      </div>
      <div className="flex flex-shrink-0 gap-1">
        {row.letters.slice(0, 4).map((ch, i) => {
          const hue = ((ch.charCodeAt(0) * 17) % 360 + 260) % 360;
          return (
            <div
              key={i}
              className="flex h-[26px] w-[18px] items-center justify-center rounded-[3px] border border-white/50 text-[9px] font-extrabold text-white/95"
              style={{
                background: `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 80%) 0 4px, hsl(${hue}, 28%, 72%) 4px 8px)`,
              }}
            >
              {ch}
            </div>
          );
        })}
        {row.letters.length > 4 && (
          <div className="self-end text-[9px] text-[#3a324a8c]">
            +{row.letters.length - 4}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 横スワイプカルーセル + peek + ドットインジケータ ─── */

function PhotoCarousel({
  photos,
  firstMeta,
  placeName,
  proposalId,
}: {
  photos: ApprovePhoto[];
  firstMeta: string;
  placeName: string | null;
  proposalId: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  /**
   * IntersectionObserver で「画面中央に最も近い写真」を active にする
   */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0;
        let bestIdx = activeIdx;
        for (const e of entries) {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            const idxAttr = (e.target as HTMLElement).dataset.idx;
            if (idxAttr) bestIdx = parseInt(idxAttr, 10);
          }
        }
        setActiveIdx(bestIdx);
      },
      {
        root,
        rootMargin: "0px",
        threshold: [0.5, 0.75, 1],
      },
    );
    const items = root.querySelectorAll("[data-photo-card]");
    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, [photos.length, activeIdx]);

  function jumpTo(idx: number) {
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector(
      `[data-photo-card][data-idx="${idx}"]`,
    ) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          取引証跡（{photos.length}枚）
          {photos.length > 1 && (
            <span className="ml-1 text-[10px] font-medium text-[#3a324a4d]">
              ← スワイプ →
            </span>
          )}
        </div>
        <Link
          href={`/transactions/${proposalId}/capture`}
          className="text-[11px] font-bold text-[#a695d8] underline"
        >
          追加撮影 / 差し替え →
        </Link>
      </div>

      {/* 横スクロール（snap + peek 約 12% 隣の写真が見える） */}
      <div
        ref={scrollRef}
        className="-mx-4 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: 16,
          scrollPaddingRight: 16,
        }}
      >
        <div className="flex gap-3">
          {photos.map((ph, i) => (
            <div
              key={ph.id}
              data-photo-card
              data-idx={i}
              className="relative shrink-0 overflow-hidden rounded-[18px] shadow-[0_4px_12px_rgba(58,50,74,0.10)]"
              style={{
                scrollSnapAlign: "center",
                width: "calc(100% - 36px)", // 18px*2 で隣の写真がちょい見え
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ph.photoUrl}
                alt={`取引証跡 #${ph.position}`}
                className="block h-auto w-full"
              />
              <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between rounded-[10px] bg-black/55 px-3 py-1.5 text-[10.5px] tabular-nums text-white backdrop-blur-md">
                <span>
                  #{ph.position}
                  {i === 0 && firstMeta !== "—" ? ` · ${firstMeta}` : ""}
                </span>
                <span>{placeName ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ドットインジケータ（複数枚のとき） */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {photos.map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`写真 ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx
                  ? "w-5 bg-[#a695d8]"
                  : "w-1.5 bg-[#3a324a14]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
