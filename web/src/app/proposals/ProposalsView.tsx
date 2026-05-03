"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ProposalRow = {
  id: string;
  direction: "sent" | "received";
  partnerId: string;
  partnerHandle: string;
  partnerDisplayName: string;
  matchType: "perfect" | "forward" | "backward";
  messageExcerpt: string;
  status:
    | "sent"
    | "negotiating"
    | "agreement_one_side"
    | "agreed"
    | "rejected"
    | "expired"
    | "cancelled";
  cashOffer: boolean;
  cashAmount: number | null;
  meetupStartAt: string | null;
  meetupEndAt: string | null;
  meetupPlaceName: string | null;
  expiresAt: string | null;
  createdAt: string;
  lastActionAt: string | null;
};

const STATUS_LABEL: Record<ProposalRow["status"], string> = {
  sent: "未応答",
  negotiating: "ネゴ中",
  agreement_one_side: "一方合意",
  agreed: "合意済",
  rejected: "拒否",
  expired: "期限切れ",
  cancelled: "取消",
};

const STATUS_COLOR: Record<ProposalRow["status"], string> = {
  sent: "bg-[#a8d4e6] text-white",
  negotiating: "bg-[#f3c5d4] text-[#3a324a]",
  agreement_one_side: "bg-[#a695d8] text-white",
  agreed: "bg-emerald-500 text-white",
  rejected: "bg-[#3a324a14] text-[#3a324a8c]",
  expired: "bg-[#3a324a14] text-[#3a324a8c]",
  cancelled: "bg-[#3a324a14] text-[#3a324a8c]",
};

export function ProposalsView({ proposals }: { proposals: ProposalRow[] }) {
  const [tab, setTab] = useState<"received" | "sent">("received");

  const filtered = useMemo(
    () => proposals.filter((p) => p.direction === tab),
    [proposals, tab],
  );

  const counts = useMemo(
    () => ({
      received: proposals.filter((p) => p.direction === "received").length,
      sent: proposals.filter((p) => p.direction === "sent").length,
    }),
    [proposals],
  );

  return (
    <div>
      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-[10px] bg-[#3a324a08] p-[3px]">
        {(
          [
            { id: "received", label: "受信" },
            { id: "sent", label: "送信" },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 text-[12.5px] ${
                active
                  ? "bg-white font-extrabold text-[#a695d8] shadow-[0_1px_3px_rgba(58,50,74,0.1)]"
                  : "font-bold text-[#3a324a8c]"
              }`}
            >
              {t.label}
              <span
                className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${
                  active
                    ? "bg-[#a695d8] text-white"
                    : "bg-[#3a324a08] text-[#3a324a8c]"
                }`}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
          {tab === "received"
            ? "まだ受信した打診はありません"
            : "まだ送信した打診はありません"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProposalCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({ p }: { p: ProposalRow }) {
  const meetupSummary =
    p.meetupStartAt && p.meetupEndAt
      ? formatRange(p.meetupStartAt, p.meetupEndAt)
      : "—";

  const isUnread = p.direction === "received" && p.status === "sent";
  const expiresInDays = p.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(p.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <Link
      href={`/proposals/${p.id}`}
      className={`block overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] transition-all active:scale-[0.99] ${
        isUnread
          ? "border-[#a695d8] shadow-[0_4px_14px_rgba(166,149,216,0.16)]"
          : "border-[#3a324a14]"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-[#3a324a08] px-3.5 py-2">
        <span
          className={`rounded-full px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.3px] ${STATUS_COLOR[p.status]}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
        {isUnread && (
          <span className="rounded-full bg-[#a695d8] px-1.5 py-[1px] text-[9px] font-extrabold text-white">
            NEW
          </span>
        )}
        {p.cashOffer && (
          <span className="text-[10px] font-bold text-[#7a9a8a]">💴 定価</span>
        )}
        <div className="flex-1" />
        {expiresInDays !== null && p.status === "sent" && (
          <span
            className={`text-[9.5px] tabular-nums ${
              expiresInDays <= 1
                ? "font-bold text-[#d9826b]"
                : "text-[#3a324a8c]"
            }`}
          >
            残 {expiresInDays}日
          </span>
        )}
      </div>

      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
          {p.partnerDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#3a324a]">
            @{p.partnerHandle}
          </div>
          <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">
            {p.direction === "received" ? "← 受信" : "→ 送信"} ・{" "}
            <span className="tabular-nums">{meetupSummary}</span>
          </div>
          {p.messageExcerpt && (
            <div className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-[#3a324a]">
              {p.messageExcerpt}
              {p.messageExcerpt.length >= 60 && "…"}
            </div>
          )}
          {p.meetupPlaceName && (
            <div className="mt-1 truncate text-[10.5px] text-[#3a324a8c]">
              📍 {p.meetupPlaceName}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  const dateFmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]})`;
  const timeFmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay
    ? `${dateFmt(s)} ${timeFmt(s)}〜${timeFmt(e)}`
    : `${dateFmt(s)} ${timeFmt(s)} 〜 ${dateFmt(e)}`;
}
