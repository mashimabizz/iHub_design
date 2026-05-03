"use client";

/**
 * iter92: 通知一覧画面
 *
 * - 未読 / 既読を区別（未読は紫枠 + ドット）
 * - タップで既読化 + link_path に遷移
 * - 「すべて既読にする」ボタン
 */

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "./actions";

export type NotificationItem = {
  id: string;
  kind:
    | "proposal_received"
    | "proposal_accepted"
    | "proposal_rejected"
    | "proposal_revised"
    | "evidence_added"
    | "trade_completed"
    | "evaluation_received"
    | "dispute_received"
    | "dispute_responded"
    | "dispute_closed"
    | "cancel_requested"
    | "expires_soon";
  title: string;
  body: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_ICON: Record<NotificationItem["kind"], string> = {
  proposal_received: "📨",
  proposal_accepted: "✓",
  proposal_rejected: "✕",
  proposal_revised: "✎",
  evidence_added: "📷",
  trade_completed: "🎉",
  evaluation_received: "★",
  dispute_received: "⚠️",
  dispute_responded: "⚖️",
  dispute_closed: "🛟",
  cancel_requested: "🚫",
  expires_soon: "⏰",
};

const KIND_TONE: Record<NotificationItem["kind"], string> = {
  proposal_received: "lavender",
  proposal_accepted: "ok",
  proposal_rejected: "mute",
  proposal_revised: "lavender",
  evidence_added: "lavender",
  trade_completed: "ok",
  evaluation_received: "amber",
  dispute_received: "warn",
  dispute_responded: "warn",
  dispute_closed: "lavender",
  cancel_requested: "warn",
  expires_soon: "amber",
};

export function NotificationsView({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleMarkAllRead() {
    startTransition(async () => {
      await markNotificationRead({ all: true });
      router.refresh();
    });
  }

  function handleTap(n: NotificationItem) {
    // 既読化 + 遷移
    if (!n.readAt) {
      startTransition(async () => {
        await markNotificationRead({ id: n.id });
        if (n.linkPath) router.push(n.linkPath);
        else router.refresh();
      });
    } else if (n.linkPath) {
      router.push(n.linkPath);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-[12px] text-[#3a324a8c]">
        まだ通知はありません
        <br />
        <Link
          href="/"
          className="mt-2 inline-block font-bold text-[#a695d8]"
        >
          ホームに戻る →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* すべて既読 */}
      {unreadCount > 0 && (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={pending}
            className="rounded-full border border-[#3a324a14] bg-white px-3 py-1 text-[10.5px] font-bold text-[#3a324a8c] disabled:opacity-50"
          >
            すべて既読にする
          </button>
        </div>
      )}

      {items.map((n) => {
        const isUnread = !n.readAt;
        const tone = KIND_TONE[n.kind];
        const iconBg =
          tone === "ok"
            ? "bg-emerald-100 text-emerald-600"
            : tone === "warn"
              ? "bg-[#fff5f0] text-[#d9826b]"
              : tone === "amber"
                ? "bg-amber-50 text-amber-700"
                : tone === "mute"
                  ? "bg-[#3a324a08] text-[#3a324a8c]"
                  : "bg-[#a695d822] text-[#a695d8]";
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => handleTap(n)}
            disabled={pending}
            className={`block w-full overflow-hidden rounded-2xl border bg-white text-left transition-all active:scale-[0.99] ${
              isUnread
                ? "border-[#a695d855] shadow-[0_4px_14px_rgba(166,149,216,0.16)]"
                : "border-[#3a324a14] opacity-80"
            } disabled:opacity-50`}
          >
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[16px] ${iconBg}`}
              >
                {KIND_ICON[n.kind]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                  {isUnread && (
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#a695d8]" />
                  )}
                  <div className="flex-1 text-[13px] font-bold text-[#3a324a]">
                    {n.title}
                  </div>
                  <div className="ml-2 flex-shrink-0 text-[10px] tabular-nums text-[#3a324a8c]">
                    {formatRelative(n.createdAt)}
                  </div>
                </div>
                {n.body && (
                  <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-[#3a324a8c]">
                    {n.body}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
