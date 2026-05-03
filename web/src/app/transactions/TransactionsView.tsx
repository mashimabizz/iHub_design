"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type TransactionRow = {
  id: string;
  direction: "sent" | "received";
  partnerId: string;
  partnerHandle: string;
  partnerDisplayName: string;
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
  myGiveSummary: string;
  myReceiveSummary: string;
  meetupStartAt: string | null;
  meetupEndAt: string | null;
  meetupPlaceName: string | null;
  expiresAt: string | null;
  createdAt: string;
  lastActionAt: string | null;
};

type TabId = "pending" | "ongoing" | "past";

const STATUS_LABEL: Record<TransactionRow["status"], string> = {
  sent: "未応答",
  negotiating: "ネゴ中",
  agreement_one_side: "一方合意",
  agreed: "合意済",
  rejected: "拒否",
  expired: "期限切れ",
  cancelled: "取消",
};

export function TransactionsView({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  const [tab, setTab] = useState<TabId>("ongoing");

  const grouped = useMemo(() => {
    const pending: TransactionRow[] = [];
    const ongoing: TransactionRow[] = [];
    const past: TransactionRow[] = [];
    for (const t of transactions) {
      switch (t.status) {
        case "sent":
        case "negotiating":
        case "agreement_one_side":
          pending.push(t);
          break;
        case "agreed":
          ongoing.push(t);
          break;
        case "rejected":
        case "expired":
        case "cancelled":
          past.push(t);
          break;
      }
    }
    return { pending, ongoing, past };
  }, [transactions]);

  const counts = {
    pending: grouped.pending.length,
    ongoing: grouped.ongoing.length,
    past: grouped.past.length,
  };

  const list =
    tab === "pending"
      ? grouped.pending
      : tab === "ongoing"
        ? grouped.ongoing
        : grouped.past;

  return (
    <div>
      {/* タブ */}
      <div className="mb-3 flex border-b border-[#3a324a14]">
        {(
          [
            { id: "pending", label: "打診中", count: counts.pending },
            { id: "ongoing", label: "進行中", count: counts.ongoing },
            { id: "past", label: "過去取引", count: counts.past },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 border-b-[2.5px] px-1 py-2.5 text-center text-[13px] transition-colors ${
                active
                  ? "border-[#a695d8] font-extrabold text-[#a695d8]"
                  : "border-transparent font-semibold text-[#3a324a8c]"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[11px] tabular-nums">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* リスト */}
      {list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : tab === "ongoing" ? (
        <OngoingList list={list} />
      ) : (
        <BasicList list={list} tab={tab} />
      )}
    </div>
  );
}

/* ─── 進行中（合意済み）：合流時刻までのカウントダウン強調 ─── */

function OngoingList({ list }: { list: TransactionRow[] }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        進行中
      </div>
      <div className="space-y-2">
        {list.map((t) => (
          <OngoingCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function OngoingCard({ t }: { t: TransactionRow }) {
  const meetupSummary =
    t.meetupStartAt && t.meetupEndAt
      ? formatRange(t.meetupStartAt, t.meetupEndAt)
      : "—";
  const countdown = t.meetupStartAt
    ? formatCountdown(t.meetupStartAt)
    : null;

  return (
    <Link
      href={`/transactions/${t.id}`}
      className="block overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
          {t.partnerDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-[#3a324a]">
            @{t.partnerHandle}
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-[#3a324a]">
            {t.myReceiveSummary}{" "}
            <span className="text-[#3a324a8c]">⇄</span> {t.myGiveSummary}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-[#3a324a8c]">
            {t.meetupPlaceName ? `${t.meetupPlaceName}・` : ""}
            <span className="tabular-nums">{meetupSummary}</span>
          </div>
          {countdown && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {countdown}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── 打診中 / 過去取引：シンプルリスト ─── */

function BasicList({
  list,
  tab,
}: {
  list: TransactionRow[];
  tab: TabId;
}) {
  return (
    <div className="space-y-2">
      {list.map((t) => (
        <BasicCard key={t.id} t={t} dim={tab === "past"} />
      ))}
    </div>
  );
}

function BasicCard({
  t,
  dim,
}: {
  t: TransactionRow;
  dim: boolean;
}) {
  const meetupSummary =
    t.meetupStartAt && t.meetupEndAt
      ? formatRange(t.meetupStartAt, t.meetupEndAt)
      : "—";
  const expiresInDays = t.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(t.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  // iter71-A：ネゴ中（negotiating / agreement_one_side / agreed）は
  // チャットへ直送。sent は受信側未応答なので /proposals 詳細ページ。
  const href =
    t.status === "negotiating" ||
    t.status === "agreement_one_side" ||
    t.status === "agreed"
      ? `/transactions/${t.id}`
      : `/proposals/${t.id}`;

  return (
    <Link
      href={href}
      className={`block overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] transition-all active:scale-[0.99] ${
        dim ? "border-[#3a324a14] opacity-70" : "border-[#3a324a14]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-[#3a324a08] px-3.5 py-1.5">
        <span
          className={`rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold tracking-[0.3px] ${statusColor(t.status)}`}
        >
          {STATUS_LABEL[t.status]}
        </span>
        {t.direction === "received" && t.status === "sent" && (
          <span className="rounded-full bg-[#a695d8] px-1.5 py-[1px] text-[9px] font-extrabold text-white">
            NEW
          </span>
        )}
        {t.cashOffer && (
          <span className="text-[10px] font-bold text-[#7a9a8a]">💴 定価</span>
        )}
        <div className="flex-1" />
        {expiresInDays !== null &&
          (t.status === "sent" || t.status === "negotiating") && (
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

      <div className="flex items-start gap-2.5 px-3.5 py-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[14px] font-bold text-[#a695d8]">
          {t.partnerDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[#3a324a]">
            @{t.partnerHandle}{" "}
            <span className="ml-1 text-[10px] font-medium text-[#3a324a8c]">
              {t.direction === "received" ? "← 受信" : "→ 送信"}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-[#3a324a]">
            {t.myReceiveSummary}{" "}
            <span className="text-[#3a324a8c]">⇄</span> {t.myGiveSummary}
          </div>
          {t.meetupPlaceName && (
            <div className="mt-0.5 truncate text-[10px] text-[#3a324a8c]">
              {t.meetupPlaceName}
              {meetupSummary !== "—" && ` ・${meetupSummary}`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── empty state ─── */

function EmptyState({ tab }: { tab: TabId }) {
  const msg =
    tab === "pending"
      ? "打診中の取引はありません"
      : tab === "ongoing"
        ? "進行中の取引はありません（合意済の打診がここに表示されます）"
        : "過去の取引はまだありません";
  return (
    <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
      {msg}
    </div>
  );
}

/* ─── helpers ─── */

function statusColor(s: TransactionRow["status"]): string {
  switch (s) {
    case "sent":
      return "bg-[#a8d4e6] text-white";
    case "negotiating":
      return "bg-[#f3c5d4] text-[#3a324a]";
    case "agreement_one_side":
      return "bg-[#a695d8] text-white";
    case "agreed":
      return "bg-emerald-500 text-white";
    default:
      return "bg-[#3a324a14] text-[#3a324a8c]";
  }
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

/**
 * 待ち合わせまでの時間 / 進行ステータス（モックアップ「合流5分前」「当日まで7日」風）
 */
function formatCountdown(startIso: string): string {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  const diffMs = start - now;
  if (diffMs <= 0) {
    // 過ぎた時間
    const mins = Math.floor((now - start) / 60_000);
    if (mins < 60) return `合流 ${mins}分前`;
    if (mins < 60 * 24) return `合流から ${Math.floor(mins / 60)}時間経過`;
    return `合流から ${Math.floor(mins / (60 * 24))}日経過`;
  }
  // 未来
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `合流まで ${mins}分`;
  if (mins < 60 * 24) return `合流まで ${Math.floor(mins / 60)}時間`;
  return `当日まで ${Math.ceil(diffMs / (1000 * 60 * 60 * 24))}日`;
}
