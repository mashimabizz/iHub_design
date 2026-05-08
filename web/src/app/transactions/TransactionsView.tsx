"use client";

/**
 * iter76-D: 取引タブ刷新（モックアップ iHub/account-support.jsx の TradeTab 準拠）
 *
 * - 打診中：送信→/←受信 chip 色分け、状態文「相手の返信待ち / 返信が必要」
 * - 進行中：合流カウントダウン
 * - 完了：フィルタ chip（すべて/完了/キャンセル/期限切れ拒否）+ 月別セクション + ★評価
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/common/Avatar";

export type TransactionPreviewItem = {
  id: string;
  label: string;
  photoUrl: string | null;
  qty: number;
  cash?: boolean;
};

export type TransactionRow = {
  id: string;
  direction: "sent" | "received";
  partnerId: string;
  partnerHandle: string;
  partnerDisplayName: string;
  /** iter122: パートナーのアバター URL */
  partnerAvatarUrl: string | null;
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
  myGiveItems: TransactionPreviewItem[];
  myReceiveItems: TransactionPreviewItem[];
  myAgreed: boolean;
  partnerAgreed: boolean;
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
  /** iter154.65: 最新メッセージが自分/相手どちら由来か */
  latestMessageFrom: "me" | "partner" | null;
  /** iter91: 打診作成時のメッセージ抜粋（打診中タブで表示） */
  messageExcerpt: string | null;
};

type TabId = "pending" | "ongoing" | "past";
type PendingSubTab = "action" | "waiting";
type PastFilter = "all" | "completed" | "cancelled" | "rejected_expired";

/** iter127: スワイプ用 tab 順 */
const TAB_IDS: TabId[] = ["pending", "ongoing", "past"];

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
  const [tab, setTab] = useState<TabId>("pending");
  const [pastFilter, setPastFilter] = useState<PastFilter>("all");
  const [now] = useState(() => Date.now());

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

  // iter127: スワイプ + sticky tab
  const scrollRef = useRef<HTMLDivElement>(null);

  // スクロール位置でタブを更新（debounce 付き）
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    let frame: number | null = null;
    function onScroll() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!container) return;
        const idx = Math.round(
          container.scrollLeft / container.clientWidth,
        );
        const next = TAB_IDS[idx];
        if (next && next !== tab) setTab(next);
      });
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tab]);

  // タブ click でスムーズスクロール
  function selectTab(target: TabId) {
    setTab(target);
    const container = scrollRef.current;
    if (!container) return;
    const idx = TAB_IDS.indexOf(target);
    container.scrollTo({
      left: idx * container.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* iter127: sticky 白背景タブヘッダー */}
      <div className="sticky top-0 z-20 border-b border-[#3a324a14] bg-white">
        <div className="mx-auto flex max-w-md">
          {(
            [
              { id: "pending", label: "打診中", count: counts.pending },
              { id: "ongoing", label: "進行中", count: counts.ongoing },
              { id: "past", label: "完了", count: counts.past },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`flex-1 border-b-[2.5px] px-1 py-2.5 text-center text-[13px] transition-colors ${
                  active
                    ? "border-[#a695d8] font-extrabold text-[#a695d8]"
                    : "border-transparent font-semibold text-[#3a324a8c]"
                }`}
              >
                {t.label}
                <span className="ml-1 text-[11px] tabular-nums">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* iter127: スワイプコンテナ（横スクロール + scroll snap） */}
      <div
        ref={scrollRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {/* 打診中 */}
        <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pt-3 pb-4">
          {grouped.pending.length === 0 ? (
            <EmptyState tab="pending" active={tab === "pending"} />
          ) : (
            <PendingList
              list={grouped.pending}
              active={tab === "pending"}
              now={now}
            />
          )}
        </div>
        {/* 進行中 */}
        <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pt-3 pb-4">
          {grouped.ongoing.length === 0 ? (
            <EmptyState tab="ongoing" active={tab === "ongoing"} />
          ) : (
            <OngoingList
              list={grouped.ongoing}
              active={tab === "ongoing"}
              now={now}
            />
          )}
        </div>
        {/* 過去取引 */}
        <div className="flex w-full flex-shrink-0 snap-start flex-col overflow-y-auto px-4 pt-3 pb-4">
          <PastView
            list={grouped.past}
            filter={pastFilter}
            onFilterChange={setPastFilter}
            active={tab === "past"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── 打診中 ─── */

function PendingList({
  list,
  active,
  now,
}: {
  list: TransactionRow[];
  active: boolean;
  now: number;
}) {
  const [pendingSubTab, setPendingSubTab] =
    useState<PendingSubTab>("action");
  const actionList = useMemo(
    () => sortPendingCards(list.filter(pendingNeedsAction), now),
    [list, now],
  );
  const waitingList = useMemo(
    () => sortPendingCards(list.filter((t) => !pendingNeedsAction(t)), now),
    [list, now],
  );

  const displaySubTab =
    pendingSubTab === "action" &&
    actionList.length === 0 &&
    waitingList.length > 0
      ? "waiting"
      : pendingSubTab === "waiting" &&
          waitingList.length === 0 &&
          actionList.length > 0
        ? "action"
        : pendingSubTab;
  const currentList =
    displaySubTab === "action" ? actionList : waitingList;

  return (
    <div className="mb-2">
      <div className="mb-3 grid grid-cols-2 rounded-full bg-[#3a324a0a] p-1">
        {(
          [
            { id: "action", label: "要対応", count: actionList.length },
            { id: "waiting", label: "相手待ち", count: waitingList.length },
          ] as const
        ).map((item) => {
          const selected = displaySubTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPendingSubTab(item.id)}
              className={`rounded-full px-3 py-2 text-[12px] font-extrabold transition-all ${
                selected
                  ? "bg-white text-[#3a324a] shadow-[0_4px_14px_rgba(58,50,74,0.10)]"
                  : "text-[#3a324a8c]"
              }`}
            >
              {item.label}
              <span className="ml-1 text-[10.5px] tabular-nums">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {currentList.length === 0 ? (
        <div
          className={`rounded-2xl border border-dashed border-[#3a324a14] bg-white py-9 text-center text-xs text-[#3a324a8c] ${
            active ? "animate-transaction-panel-in" : ""
          }`}
        >
          {displaySubTab === "action"
            ? "いま対応が必要な打診はありません"
            : "相手待ちの打診はありません"}
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((t, i) => (
            <div
              key={t.id}
              className={active ? "animate-transaction-panel-in" : undefined}
              style={active ? { animationDelay: `${i * 95}ms` } : undefined}
            >
              <PendingCard t={t} now={now} subTab={displaySubTab} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({
  t,
  now,
  subTab,
}: {
  t: TransactionRow;
  now: number;
  subTab: PendingSubTab;
}) {
  const href =
    t.status === "negotiating" || t.status === "agreement_one_side"
      ? `/transactions/${t.id}`
      : `/proposals/${t.id}`;
  const needsAction = pendingNeedsAction(t);
  const statusText = pendingStatusText(t, needsAction);
  const expiresInDays = getExpiresInDays(t, now);
  const expiryText = expiresLabel(expiresInDays);
  const urgent = expiresInDays !== null && expiresInDays <= 1;
  const meetup = compactMeetup(t);
  const cta = needsAction ? "確認" : "詳細";
  const updated = updatedLabel(t, now);
  const directionText = t.direction === "received" ? "届いた" : "送った";

  return (
    <Link
      href={href}
      className={`relative block overflow-hidden rounded-[16px] border bg-white px-3 py-2.5 transition-all active:scale-[0.99] ${
        needsAction
          ? "border-[#d9826b3d] shadow-[0_8px_20px_rgba(217,130,107,0.11)]"
          : "border-[#3a324a12] shadow-[0_6px_18px_rgba(58,50,74,0.06)]"
      }`}
    >
      {needsAction && (
        <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-[#d9826b]" />
      )}
      <div className="flex items-center gap-1.5">
        <Avatar
          url={t.partnerAvatarUrl}
          fallbackName={t.partnerDisplayName || t.partnerHandle}
          size={22}
          variant="square"
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-[#3a324a]">
          @{t.partnerHandle}
        </span>
        <span
          className={`rounded-full px-2 py-[2px] text-[9.5px] font-extrabold ${
            t.direction === "received"
              ? "bg-[#a695d814] text-[#a695d8]"
              : "bg-[#a8d4e626] text-[#3a7c93]"
          }`}
        >
          {directionText}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-[2px] text-[10px] font-extrabold ${
            needsAction
              ? "bg-[#d9826b14] text-[#d9826b]"
              : "bg-[#a8d4e626] text-[#3a7c93]"
          }`}
        >
          {statusText}
        </span>
        {expiryText && (
          <span
            className={`text-[10px] font-bold tabular-nums ${
              urgent
                ? "text-[#d9826b]"
                : "text-[#3a324a8c]"
            }`}
          >
            {expiryText}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-right text-[10px] font-semibold text-[#3a324a66]">
          {updated}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_20px_minmax(0,0.82fr)] items-center gap-1.5">
        <TradeSide label="受け取る" items={t.myReceiveItems} emphasis />
        <div className="flex justify-center text-[12px] font-extrabold text-[#3a324a66]">
          ⇄
        </div>
        <TradeSide label="出す" items={t.myGiveItems} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#3a324a8c]">
        <span
          className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
            needsAction ? "bg-[#d9826b]" : "bg-[#a8d4e6]"
          }`}
        />
        <span
          className={`min-w-0 flex-1 truncate ${
            meetup.includes("未設定")
              ? "font-bold text-[#d9826b]"
              : "text-[#3a324a8c]"
          }`}
        >
          {meetup}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
            subTab === "action"
              ? "bg-[#3a324a] text-white"
              : "bg-[#3a324a0a] text-[#3a324acc]"
          }`}
        >
          {cta}
        </span>
      </div>
    </Link>
  );
}

function TradeSide({
  label,
  items,
  emphasis = false,
}: {
  label: string;
  items: TransactionPreviewItem[];
  emphasis?: boolean;
}) {
  const visible = items.slice(0, 3);
  const extra = Math.max(0, items.length - visible.length);
  const summary = items.map((item) => item.label).join(" / ") || "—";
  return (
    <div
      className={`min-w-0 rounded-[12px] px-2 py-1.5 ${
        emphasis ? "bg-[#a695d80d]" : "bg-[#3a324a08]"
      }`}
    >
      <div
        className={`mb-1 text-[9.5px] font-extrabold ${
          emphasis ? "text-[#a695d8]" : "text-[#3a324a8c]"
        }`}
      >
        {label}
      </div>
      <div className="flex min-w-0 items-center gap-1">
        {visible.length > 0 ? (
          visible.map((item) => (
            <ItemThumb key={item.id} item={item} emphasis={emphasis} />
          ))
        ) : (
          <span className="text-[11px] font-bold text-[#3a324a8c]">—</span>
        )}
        {extra > 0 && (
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-white text-[10px] font-extrabold text-[#3a324a8c]">
            +{extra}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[10.5px] font-bold text-[#3a324acc]">
          {summary}
        </span>
      </div>
    </div>
  );
}

function ItemThumb({
  item,
  emphasis,
}: {
  item: TransactionPreviewItem;
  emphasis: boolean;
}) {
  return (
    <span
      className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[9px] border ${
        emphasis ? "border-[#a695d855] bg-white" : "border-white bg-white"
      }`}
    >
      {item.photoUrl ? (
        // Supabase Storage の public URL をそのまま表示するため、Avatar と同じく img を使う。
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl}
          alt={item.label}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className={`text-[10px] font-black ${
            item.cash ? "text-[#3a7c93]" : "text-[#a695d8]"
          }`}
        >
          {item.cash ? "¥" : item.label.slice(0, 1)}
        </span>
      )}
      {item.qty > 1 && (
        <span className="absolute bottom-0 right-0 rounded-tl-[5px] bg-[#3a324acc] px-[3px] text-[8px] font-black leading-[12px] text-white">
          ×{item.qty}
        </span>
      )}
    </span>
  );
}

function pendingNeedsAction(t: TransactionRow): boolean {
  if (t.status === "sent") return t.direction === "received";
  if (t.status === "agreement_one_side")
    return t.partnerAgreed && !t.myAgreed;
  if (t.status === "negotiating") {
    if (t.latestMessageFrom) return t.latestMessageFrom === "partner";
    return t.direction === "received";
  }
  return false;
}

function pendingStatusText(
  t: TransactionRow,
  needsAction: boolean,
): string {
  if (t.status === "sent") {
    return needsAction ? "返信が必要" : "相手の返信待ち";
  }
  if (t.status === "agreement_one_side") {
    return needsAction ? "相手は合意済み" : "あなたは合意済み";
  }
  if (t.status === "negotiating") {
    return needsAction ? "返信が届いています" : "相手待ち";
  }
  return needsAction ? "要対応" : "相手待ち";
}

function sortPendingCards(
  list: TransactionRow[],
  now: number,
): TransactionRow[] {
  return [...list].sort((a, b) => {
    const rankDiff = pendingRank(a) - pendingRank(b);
    if (rankDiff !== 0) return rankDiff;

    const aExpires = a.expiresAt
      ? new Date(a.expiresAt).getTime()
      : Number.POSITIVE_INFINITY;
    const bExpires = b.expiresAt
      ? new Date(b.expiresAt).getTime()
      : Number.POSITIVE_INFINITY;
    const aUrgent = getExpiresInDays(a, now);
    const bUrgent = getExpiresInDays(b, now);
    if ((aUrgent ?? 99) <= 1 || (bUrgent ?? 99) <= 1) {
      if (aExpires !== bExpires) return aExpires - bExpires;
    }

    return pendingTouchedAt(b) - pendingTouchedAt(a);
  });
}

function pendingRank(t: TransactionRow): number {
  if (t.status === "agreement_one_side") return t.myAgreed ? 4 : 0;
  if (t.status === "sent") return t.direction === "received" ? 1 : 5;
  if (t.status === "negotiating") {
    if (t.latestMessageFrom === "partner") return 2;
    if (t.latestMessageFrom === "me") return 6;
    return t.direction === "received" ? 3 : 7;
  }
  return 8;
}

function pendingTouchedAt(t: TransactionRow): number {
  return new Date(t.lastActionAt ?? t.createdAt).getTime();
}

function getExpiresInDays(t: TransactionRow, now: number): number | null {
  return t.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(t.expiresAt).getTime() - now) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;
}

function expiresLabel(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "今日まで";
  if (days === 1) return "あと1日";
  return `あと${days}日`;
}

function compactMeetup(t: TransactionRow): string {
  const time =
    t.meetupStartAt && t.meetupEndAt
      ? formatRange(t.meetupStartAt, t.meetupEndAt)
      : null;
  const place = t.meetupPlaceName;
  if (time && place) return `${time}・${place}`;
  if (time) return `${time}・場所未設定`;
  if (place) return `時間未設定・${place}`;
  return "待ち合わせ未設定";
}

function updatedLabel(t: TransactionRow, now: number): string {
  return `${relativeLabel(pendingTouchedAt(t), now)}更新`;
}

function relativeLabel(target: number, now: number): string {
  const diff = Math.max(0, now - target);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "いま";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const d = new Date(target);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/* ─── 進行中（合意済み）：合流時刻までのカウントダウン強調 ─── */

function OngoingList({
  list,
  active,
  now,
}: {
  list: TransactionRow[];
  active: boolean;
  now: number;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        進行中
      </div>
      <div className="space-y-2">
        {list.map((t, i) => (
          <div
            key={t.id}
            className={active ? "animate-transaction-panel-in" : undefined}
            style={active ? { animationDelay: `${i * 95}ms` } : undefined}
          >
            <OngoingCard t={t} now={now} />
          </div>
        ))}
      </div>
    </div>
  );
}

function OngoingCard({ t, now }: { t: TransactionRow; now: number }) {
  const meetupSummary =
    t.meetupStartAt && t.meetupEndAt
      ? formatRange(t.meetupStartAt, t.meetupEndAt)
      : "—";
  const countdown = t.meetupStartAt
    ? formatCountdown(t.meetupStartAt, now)
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
        {t.openDispute ? (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#d9826b22] text-[15px] font-bold text-[#d9826b]">
            !
          </div>
        ) : (
          <Avatar
            url={t.partnerAvatarUrl}
            fallbackName={t.partnerDisplayName || t.partnerHandle}
            size={40}
            variant="square"
          />
        )}
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
  active,
}: {
  list: TransactionRow[];
  filter: PastFilter;
  onFilterChange: (f: PastFilter) => void;
  active: boolean;
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

  if (list.length === 0) return <EmptyState tab="past" active={active} />;

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
        <div
          className={`rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c] ${
            active ? "animate-transaction-panel-in" : ""
          }`}
          style={active ? { animationDelay: "95ms" } : undefined}
        >
          該当する取引がありません
        </div>
      ) : (
        monthlyGroups.map(([monthLabel, items], monthIndex) => (
          <div key={monthLabel} className="mb-4">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-[11px] font-bold tracking-[0.4px] text-[#3a324a]">
                {monthLabel}
              </span>
              <span className="text-[10px] text-[#3a324a8c]">新着順</span>
            </div>
            <div className="space-y-1.5">
              {items.map((t, i) => (
                <div
                  key={t.id}
                  className={active ? "animate-transaction-panel-in" : undefined}
                  style={
                    active
                      ? { animationDelay: `${(monthIndex + i) * 85}ms` }
                      : undefined
                  }
                >
                  <PastCard t={t} />
                </div>
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

function EmptyState({ tab, active = true }: { tab: TabId; active?: boolean }) {
  const msg =
    tab === "pending"
      ? "打診中の取引はありません"
      : tab === "ongoing"
        ? "進行中の取引はありません（合意済の打診がここに表示されます）"
        : "過去の取引はまだありません";
  return (
    <div
      className={`rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c] ${
        active ? "animate-transaction-panel-in" : ""
      }`}
    >
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

function formatCountdown(startIso: string, now: number): string {
  const start = new Date(startIso).getTime();
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
