"use client";

/**
 * iter76-D: 取引タブ刷新（モックアップ iHub/account-support.jsx の TradeTab 準拠）
 *
 * - 打診中：送信→/←受信 chip 色分け、状態文「相手の返信待ち / 返信が必要」
 * - 進行中：合流カウントダウン
 * - 過去取引：フィルタ chip（すべて/完了/キャンセル/期限切れ拒否）+ 月別セクション + ★評価
 */

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
    | "completed"
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
  /** iter76-D: 完了日時 */
  completedAt: string | null;
  /** iter76-D: 自分が付けた評価（1〜5） */
  myStars: number | null;
  /** iter79-C: 進行中の dispute（あれば ID と ticket_no） */
  openDispute: { id: string; ticketNo: string } | null;
  /** iter91: 打診作成時のメッセージ抜粋（打診中タブで表示） */
  messageExcerpt: string | null;
};

type TabId = "pending" | "ongoing" | "past";
type PastFilter = "all" | "completed" | "cancelled" | "rejected_expired";

const STATUS_LABEL: Record<TransactionRow["status"], string> = {
  sent: "未応答",
  negotiating: "ネゴ中",
  agreement_one_side: "一方合意",
  agreed: "合意済",
  completed: "完了",
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
  const [pastFilter, setPastFilter] = useState<PastFilter>("all");

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
        case "completed":
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
      {tab === "pending" &&
        (grouped.pending.length === 0 ? (
          <EmptyState tab="pending" />
        ) : (
          <PendingList list={grouped.pending} />
        ))}
      {tab === "ongoing" &&
        (grouped.ongoing.length === 0 ? (
          <EmptyState tab="ongoing" />
        ) : (
          <OngoingList list={grouped.ongoing} />
        ))}
      {tab === "past" && (
        <PastView
          list={grouped.past}
          filter={pastFilter}
          onFilterChange={setPastFilter}
        />
      )}
    </div>
  );
}

/* ─── 打診中 ─── */

function PendingList({ list }: { list: TransactionRow[] }) {
  return (
    <div className="mb-2">
      <div className="mb-2 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        打診中
        <span className="ml-1 font-normal text-[#3a324a4d]">· 新着順</span>
      </div>
      <div className="space-y-2">
        {list.map((t) => (
          <PendingCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function PendingCard({ t }: { t: TransactionRow }) {
  // ネゴ系はチャットへ直送、未応答 (sent) は受信側なら詳細ページへ
  const href =
    t.status === "negotiating" || t.status === "agreement_one_side"
      ? `/transactions/${t.id}`
      : `/proposals/${t.id}`;

  // ステータス文：受信×未応答 = 「返信が必要」（赤強調）
  const needsReply = t.direction === "received" && t.status === "sent";
  const statusText = needsReply
    ? "返信が必要"
    : t.status === "negotiating"
      ? "ネゴ中（メッセージ確認）"
      : t.status === "agreement_one_side"
        ? "一方合意（あなたの確認待ち or 相手待ち）"
        : t.direction === "sent"
          ? "相手の返信待ち"
          : "確認お願いします";

  const expiresInDays = t.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(t.expiresAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;
  const dirChipBg =
    t.direction === "sent"
      ? "bg-[#a8d4e6]"
      : "bg-[#a695d8]";
  const dirLabel = t.direction === "sent" ? "送信→" : "←受信";

  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[13px] font-extrabold text-[#a695d8]">
          {t.partnerDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span
              className={`rounded-[3px] px-1.5 py-[1px] text-[9.5px] font-bold tracking-[0.3px] text-white ${dirChipBg}`}
            >
              {dirLabel}
            </span>
            <span className="text-[12px] font-bold text-[#3a324a]">
              @{t.partnerHandle}
            </span>
            {needsReply && (
              <span className="rounded-full bg-[#d9826b] px-1.5 py-[1px] text-[9px] font-extrabold text-white">
                NEW
              </span>
            )}
            <div className="flex-1" />
            {expiresInDays !== null && (
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
          <div className="text-[12px] font-semibold text-[#3a324a]">
            {t.myReceiveSummary}{" "}
            <span className="text-[#3a324a8c]">⇄</span> {t.myGiveSummary}
          </div>
          {t.meetupPlaceName && (
            <div className="mt-0.5 truncate text-[10.5px] text-[#3a324a8c]">
              {t.meetupPlaceName}
              {t.meetupStartAt &&
                t.meetupEndAt &&
                ` ・${formatRange(t.meetupStartAt, t.meetupEndAt)}`}
            </div>
          )}
          {t.messageExcerpt && (
            <div className="mt-1 line-clamp-2 text-[11px] italic leading-snug text-[#3a324a]">
              「{t.messageExcerpt}」
            </div>
          )}
          <div
            className={`mt-1 text-[10.5px] font-bold ${
              needsReply ? "text-[#d9826b]" : "text-[#a695d8]"
            }`}
          >
            {needsReply && "● "}
            {statusText}
          </div>
        </div>
      </div>
    </Link>
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
  const isImminent = !!t.meetupStartAt && countdown?.startsWith("合流");

  return (
    <Link
      href={
        t.openDispute ? `/disputes/${t.openDispute.id}` : `/transactions/${t.id}`
      }
      className={`block overflow-hidden rounded-2xl border bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)] transition-all active:scale-[0.99] ${
        t.openDispute
          ? "border-[#d9826b55]"
          : "border-[#3a324a14]"
      }`}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold ${
            t.openDispute
              ? "bg-[#d9826b22] text-[#d9826b]"
              : "bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[#a695d8]"
          }`}
        >
          {t.openDispute ? "!" : t.partnerDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold text-[#3a324a]">
              @{t.partnerHandle}
            </span>
            {t.openDispute && (
              <span className="rounded-[3px] bg-[#d9826b] px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.3px] text-white">
                申告中
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-[#3a324a]">
            {t.myReceiveSummary}{" "}
            <span className="text-[#3a324a8c]">⇄</span> {t.myGiveSummary}
          </div>
          {t.openDispute ? (
            <div className="mt-0.5 truncate text-[10.5px] font-bold text-[#d9826b]">
              {t.openDispute.ticketNo} ・ 仲裁中（タップで詳細）
            </div>
          ) : (
            <>
              <div className="mt-0.5 truncate text-[10.5px] text-[#3a324a8c]">
                {t.meetupPlaceName ? `${t.meetupPlaceName}・` : ""}
                <span className="tabular-nums">{meetupSummary}</span>
              </div>
              {countdown && (
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold ${
                    isImminent ? "text-emerald-600" : "text-[#3a324a8c]"
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isImminent ? "bg-emerald-500" : "bg-[#3a324a4d]"
                    }`}
                  />
                  {countdown}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── 過去取引：フィルタ chip + 月別セクション + ★評価 ─── */

function PastView({
  list,
  filter,
  onFilterChange,
}: {
  list: TransactionRow[];
  filter: PastFilter;
  onFilterChange: (f: PastFilter) => void;
}) {
  // フィルタ counts
  const filterCounts = useMemo(() => {
    const c = { all: list.length, completed: 0, cancelled: 0, rejected_expired: 0 };
    for (const t of list) {
      if (t.status === "completed") c.completed++;
      else if (t.status === "cancelled") c.cancelled++;
      else c.rejected_expired++;
    }
    return c;
  }, [list]);

  // フィルタ適用
  const filtered = useMemo(() => {
    if (filter === "all") return list;
    if (filter === "completed") return list.filter((t) => t.status === "completed");
    if (filter === "cancelled") return list.filter((t) => t.status === "cancelled");
    return list.filter(
      (t) => t.status === "rejected" || t.status === "expired",
    );
  }, [list, filter]);

  // 月別グルーピング（completed_at 優先、なければ lastActionAt → createdAt）
  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, TransactionRow[]>();
    for (const t of filtered) {
      const dateStr =
        t.completedAt ?? t.lastActionAt ?? t.createdAt;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      const arr = groups.get(key) ?? [];
      arr.push(t);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  if (list.length === 0) return <EmptyState tab="past" />;

  return (
    <div>
      {/* フィルタ chip */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {(
          [
            { id: "all" as PastFilter, label: `すべて ${filterCounts.all}` },
            {
              id: "completed" as PastFilter,
              label: `完了 ${filterCounts.completed}`,
            },
            {
              id: "cancelled" as PastFilter,
              label: `キャンセル ${filterCounts.cancelled}`,
            },
            {
              id: "rejected_expired" as PastFilter,
              label: `拒否・期限切れ ${filterCounts.rejected_expired}`,
            },
          ] as const
        ).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                active
                  ? "bg-[#3a324a] text-white"
                  : "border-[0.5px] border-[#3a324a14] bg-white text-[#3a324a]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 月別セクション */}
      {monthlyGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
          該当する取引がありません
        </div>
      ) : (
        monthlyGroups.map(([monthLabel, items]) => (
          <div key={monthLabel} className="mb-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-[11px] font-bold tracking-[0.4px] text-[#3a324a]">
                {monthLabel}
              </span>
              <span className="text-[10px] text-[#3a324a8c]">新着順</span>
            </div>
            <div className="space-y-1.5">
              {items.map((t) => (
                <PastCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PastCard({ t }: { t: TransactionRow }) {
  const dateStr = t.completedAt ?? t.lastActionAt ?? t.createdAt;
  const d = new Date(dateStr);
  const dayLabel = `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;

  const statusTone =
    t.status === "completed"
      ? "text-emerald-600"
      : t.status === "rejected" || t.status === "expired"
        ? "text-[#d9826b]"
        : "text-[#3a324a8c]";

  const statusText =
    t.status === "completed"
      ? "● 完了"
      : t.status === "cancelled"
        ? "キャンセル"
        : t.status === "rejected"
          ? "拒否"
          : "期限切れ";

  return (
    <Link
      href={
        t.status === "completed"
          ? `/transactions/${t.id}`
          : `/proposals/${t.id}`
      }
      className="block rounded-xl border border-[#3a324a14] bg-white px-3 py-2.5 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-9 flex-shrink-0 pt-0.5 text-center text-[10px] font-bold tabular-nums text-[#3a324a8c]">
          {dayLabel}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-[#3a324a]">
            @{t.partnerHandle}
          </div>
          <div className="text-[11.5px] text-[#3a324a]">
            {t.myReceiveSummary}{" "}
            <span className="text-[#3a324a8c]">⇄</span> {t.myGiveSummary}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-[10.5px] font-bold ${statusTone}`}>
              {statusText}
            </span>
            {t.myStars !== null && t.status === "completed" && (
              <span className="text-[10.5px] tabular-nums text-[#3a324a8c]">
                {"★".repeat(t.myStars)}
                <span className="text-[#3a324a14]">
                  {"★".repeat(5 - t.myStars)}
                </span>
              </span>
            )}
          </div>
        </div>
        <span className="self-center text-[12px] text-[#a695d8]">›</span>
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

function formatCountdown(startIso: string): string {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  const diffMs = start - now;
  if (diffMs <= 0) {
    const mins = Math.floor((now - start) / 60_000);
    if (mins < 60) return `合流 ${mins}分前`;
    if (mins < 60 * 24) return `合流から ${Math.floor(mins / 60)}時間経過`;
    return `合流から ${Math.floor(mins / (60 * 24))}日経過`;
  }
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `合流まで ${mins}分`;
  if (mins < 60 * 24) return `合流まで ${Math.floor(mins / 60)}時間`;
  return `当日まで ${Math.ceil(diffMs / (1000 * 60 * 60 * 24))}日`;
}

// STATUS_LABEL を使う場面が現状ないが、将来用に維持
void STATUS_LABEL;
