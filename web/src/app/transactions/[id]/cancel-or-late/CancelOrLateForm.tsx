"use client";

/**
 * iter80-D7: 取引キャンセル / 遅刻通知（c-dispute.jsx D7CancelOrLate 準拠）
 *
 * - 取引メタ表示
 * - 遅刻時は「どのくらい遅れますか」5 段階セレクター（10分 / 20分 / 30分 / 1時間 / 1時間以上）
 * - 理由ラジオ
 * - 自由記述 textarea
 * - 警告/補足カード（キャンセル時 = warn 色 / 遅刻時 = lavender 色）
 * - sticky CTA：「キャンセルを送信」or「遅刻を通知」
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  notifyLate,
  requestTradeCancel,
} from "@/app/transactions/actions";

type Kind = "cancel" | "late";

const CANCEL_REASONS = [
  "体調不良 / 急用",
  "会場・時間が合わなくなった",
  "他で交換が成立した",
  "相手と連絡がつかなくなった",
  "その他",
];
const LATE_REASONS = [
  "電車遅延 / 交通機関",
  "会場での合流に時間がかかる",
  "前の取引が押している",
  "その他",
];

const LATE_MINUTES: { value: 10 | 20 | 30 | 60 | 90; label: string }[] = [
  { value: 10, label: "10分" },
  { value: 20, label: "20分" },
  { value: 30, label: "30分" },
  { value: 60, label: "1時間" },
  { value: 90, label: "1時間以上" },
];

export function CancelOrLateForm({
  proposalId,
  kind,
  partnerHandle,
  meetupStartAt,
  meetupPlaceName,
}: {
  proposalId: string;
  kind: Kind;
  partnerHandle: string;
  partnerDisplayName: string;
  meetupStartAt: string | null;
  meetupPlaceName: string | null;
}) {
  const router = useRouter();
  const isCancel = kind === "cancel";
  const reasons = isCancel ? CANCEL_REASONS : LATE_REASONS;

  const [reasonIdx, setReasonIdx] = useState(0);
  const [lateIdx, setLateIdx] = useState(1); // default 20 分
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const reasonText = reasons[reasonIdx];
    if (isCancel) {
      if (
        !confirm(
          "取引キャンセルを相手に通知します。相手の同意でキャンセル成立、異議があれば申告フローへ進みます。続けますか？",
        )
      )
        return;
      startTransition(async () => {
        const r = await requestTradeCancel({
          proposalId,
          reason: reasonText,
          note: note.trim() || undefined,
        });
        if (r?.error) setError(r.error);
        else router.push(`/transactions/${proposalId}`);
      });
    } else {
      const minutes = LATE_MINUTES[lateIdx].value;
      startTransition(async () => {
        const r = await notifyLate({
          proposalId,
          lateMinutes: minutes,
          reason: reasonText,
          note: note.trim() || undefined,
        });
        if (r?.error) setError(r.error);
        else router.push(`/transactions/${proposalId}`);
      });
    }
  }

  const meetupSummary =
    meetupStartAt && meetupPlaceName
      ? `${meetupPlaceName} ・ ${formatMeetup(meetupStartAt)}`
      : meetupPlaceName ?? "—";

  return (
    <div className="space-y-3.5 pb-24">
      {/* 取引メタ */}
      <Section label="取引">
        <div className="rounded-2xl border border-[#3a324a14] bg-white px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[12px] font-extrabold text-[#a695d8]">
              {partnerHandle[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[#3a324a]">
                @{partnerHandle}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-[#3a324a8c]">
                {meetupSummary}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 遅刻時：時間選択 */}
      {!isCancel && (
        <Section label="どのくらい遅れますか">
          <div className="rounded-2xl border border-[#3a324a14] bg-white px-3 py-3">
            <div className="flex gap-1.5">
              {LATE_MINUTES.map((m, i) => {
                const selected = lateIdx === i;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setLateIdx(i)}
                    className={`flex-1 rounded-[10px] px-1 py-2 text-[11px] font-extrabold transition-all ${
                      selected
                        ? "bg-[#a695d8] text-white"
                        : "bg-[#fbf9fc] text-[#3a324a]"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* 理由 */}
      <Section label="理由">
        <div className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white">
          {reasons.map((r, i) => {
            const selected = reasonIdx === i;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReasonIdx(i)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left ${
                  selected ? "bg-[#a695d810]" : "bg-transparent"
                } ${i < reasons.length - 1 ? "border-b border-[#3a324a08]" : ""}`}
              >
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                    selected
                      ? "border-[#a695d8] bg-[#a695d8]"
                      : "border-[#3a324a40] bg-transparent"
                  }`}
                >
                  {selected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className={`text-[12.5px] ${
                    selected ? "font-bold" : "font-medium"
                  } text-[#3a324a]`}
                >
                  {r}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* メモ */}
      <Section label="メモ（任意）">
        <div className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              isCancel
                ? "相手への一言を添えると印象が変わります"
                : "会場到着後に再連絡します など"
            }
            className="block w-full resize-none border-0 bg-transparent p-3.5 text-[16px] leading-relaxed text-[#3a324a] placeholder:text-[#3a324a4d] focus:outline-none"
          />
        </div>
      </Section>

      {/* 補足カード */}
      <div
        className={`rounded-[10px] px-3 py-2.5 text-[10.5px] leading-[1.6] text-[#3a324a] ${
          isCancel
            ? "border border-[#d9826b40] bg-[#fff5f0]"
            : "bg-[#a695d810]"
        }`}
      >
        {isCancel ? (
          <>
            <b>📝 キャンセルについて</b>
            <br />
            ・相手の同意があれば双方の評価に影響しません
            <br />
            ・相手が同意しない場合、申告フローに進みます
            <br />
            ・当日 24 時間以内のキャンセルは「直前キャンセル」として履歴に残ります
          </>
        ) : (
          <>
            <b>📝 遅刻について</b>
            <br />
            ・相手にチャット通知が届きます
            <br />
            ・30 分以上の場合、相手は取引キャンセルを選択できます
            <br />
            ・連絡なしの遅刻は履歴に残ります
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[#a695d822] bg-white/96 px-[18px] pb-7 pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className={`block w-full rounded-[14px] px-6 py-[14px] text-center text-[14px] font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] disabled:opacity-50 ${
              isCancel
                ? "bg-[linear-gradient(135deg,#d9826b,#cc6051)]"
                : "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)]"
            }`}
          >
            {pending
              ? "送信中…"
              : isCancel
                ? "キャンセルを送信"
                : "遅刻を通知"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
        {label}
      </div>
      {children}
    </div>
  );
}

function formatMeetup(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
