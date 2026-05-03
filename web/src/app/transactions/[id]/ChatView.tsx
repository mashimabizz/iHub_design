"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  sendLocationMessage,
  sendTextMessage,
  updateArrivalStatus,
} from "../actions";

export type ChatItem = {
  id: string;
  label: string;
  goodsTypeName: string | null;
  photoUrl: string | null;
  qty: number;
};

export type ChatProposal = {
  id: string;
  status: "agreed" | "negotiating" | "agreement_one_side";
  cashOffer: boolean;
  cashAmount: number | null;
  myGiveItems: ChatItem[];
  myReceiveItems: ChatItem[];
  meetupStartAt: string | null;
  meetupEndAt: string | null;
  meetupPlaceName: string | null;
  meetupLat: number | null;
  meetupLng: number | null;
  partner: {
    id: string;
    handle: string;
    displayName: string;
    primaryArea: string | null;
  };
  me: { id: string };
};

export type ChatMessage = {
  id: string;
  senderId: string;
  isMine: boolean;
  type:
    | "text"
    | "photo"
    | "outfit_photo"
    | "location"
    | "arrival_status"
    | "system";
  body: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
  locationLabel: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

const STATUS_LABEL: Record<ChatProposal["status"], string> = {
  agreed: "合意済",
  negotiating: "ネゴ中",
  agreement_one_side: "一方合意",
};

export function ChatView({
  proposal,
  messages,
  myArrival,
  partnerArrival,
  myOutfitPhoto,
  partnerOutfitPhoto,
}: {
  proposal: ChatProposal;
  messages: ChatMessage[];
  myArrival: "enroute" | "arrived" | "left" | null;
  partnerArrival: "enroute" | "arrived" | "left" | null;
  myOutfitPhoto: string | null;
  partnerOutfitPhoto: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 自動下スクロール（新着メッセージ時）
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 5 秒ごとに refresh（リアルタイム代替）
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const r = await sendTextMessage({
        proposalId: proposal.id,
        body,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  function handleSendLocation() {
    setShowActions(false);
    setError(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("位置情報が利用できません");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          const r = await sendLocationMessage({
            proposalId: proposal.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: "現在地を共有",
          });
          if (r?.error) setError(r.error);
          else router.refresh();
        });
      },
      () => setError("位置情報の取得に失敗しました"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleArrival(status: "enroute" | "arrived" | "left") {
    setShowActions(false);
    setError(null);
    startTransition(async () => {
      const r = await updateArrivalStatus({
        proposalId: proposal.id,
        status,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative flex h-[calc(100vh-72px)] flex-col bg-[#fbf9fc]">
      {/* 上部：取引内容 + 待ち合わせ + 服装写真ステータス（折りたたみ可） */}
      <div className="flex-shrink-0 overflow-y-auto border-b border-[#3a324a14] bg-white">
        <div className="mx-auto max-w-md px-3.5 py-3">
          <DealCard proposal={proposal} />
          <OutfitSection
            myPhotoUrl={myOutfitPhoto}
            partnerPhotoUrl={partnerOutfitPhoto}
            partnerHandle={proposal.partner.handle}
          />
        </div>
      </div>

      {/* メッセージリスト */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3.5 py-3"
      >
        <div className="mx-auto max-w-md space-y-2">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#3a324a14] bg-white px-4 py-6 text-center text-[11.5px] text-[#3a324a8c]">
              まだメッセージがありません。挨拶から始めましょう 👋
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-3.5 mb-1 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* アクションメニュー（+ ボタンタップで展開） */}
      {showActions && (
        <div className="border-t border-[#3a324a14] bg-white px-3.5 py-2.5">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
            <ActionButton
              icon="📍"
              label="現在地を送る"
              onClick={handleSendLocation}
            />
            <ActionButton
              icon={myArrival === "arrived" ? "✓" : "🚶"}
              label={
                myArrival === "arrived"
                  ? "到着済"
                  : myArrival === "enroute"
                    ? "向かう中"
                    : "向かう"
              }
              onClick={() =>
                handleArrival(
                  myArrival === "arrived"
                    ? "left"
                    : myArrival === "enroute"
                      ? "arrived"
                      : "enroute",
                )
              }
              active={myArrival === "arrived"}
            />
            <ActionButton
              icon="📷"
              label="服装写真"
              onClick={() => {
                setShowActions(false);
                alert("服装写真の撮影は次イテで実装予定です");
              }}
              disabled
            />
          </div>
        </div>
      )}

      {/* 入力欄 */}
      <form
        onSubmit={handleSend}
        className="border-t border-[#3a324a14] bg-white/95 px-3.5 pb-7 pt-2 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-md items-end gap-2">
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            aria-label="アクション"
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
              showActions
                ? "border-[#a695d8] bg-[#a695d8] text-white"
                : "border-[#3a324a14] bg-white text-[#3a324a8c]"
            }`}
          >
            <span className="text-[16px] leading-none">＋</span>
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="メッセージ…"
            rows={1}
            maxLength={2000}
            className="block max-h-32 min-h-[36px] flex-1 resize-none rounded-[18px] border-[0.5px] border-[#3a324a14] bg-[#fbf9fc] px-3 py-2 text-[13px] text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend(e as unknown as FormEvent);
              }
            }}
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            aria-label="送信"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)] transition-all active:scale-[0.95] disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M2 7l10-5-3 10-2-4z"
                fill="#fff"
                stroke="#fff"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </form>

      {/* ステータスインジケータ（合意済バッジ、上部） */}
      {proposal.status !== "agreed" && (
        <div className="absolute right-3 top-2 rounded-full bg-[#f3c5d4] px-2 py-[2px] text-[9.5px] font-extrabold text-[#3a324a]">
          {STATUS_LABEL[proposal.status]}
        </div>
      )}
    </div>
  );
}

/* ─── 取引内容カード（上部固定） ─── */

function DealCard({ proposal }: { proposal: ChatProposal }) {
  const meetupSummary =
    proposal.meetupStartAt && proposal.meetupEndAt
      ? formatRange(proposal.meetupStartAt, proposal.meetupEndAt)
      : "—";

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#a695d822] bg-[linear-gradient(135deg,#a695d80a,#a8d4e60a)]">
      <div className="flex items-center gap-2 border-b border-[#a695d822] px-3 py-1.5">
        <span className="text-[10px] font-extrabold tracking-[0.4px] text-[#a695d8]">
          📦 取引内容＋待ち合わせ（確定済）
        </span>
        <div className="flex-1" />
        <span className="rounded-full bg-emerald-500 px-1.5 py-[1px] text-[9px] font-extrabold text-white">
          合意済
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-2">
        <div>
          <div className="mb-1 text-[9px] font-bold tracking-[0.5px] text-[#3a324a8c]">
            受け取る
          </div>
          <div className="space-y-0.5">
            {proposal.myReceiveItems.length === 0 && proposal.cashOffer ? (
              <div className="text-[11px] font-extrabold text-[#7a9a8a]">
                💴 ¥{proposal.cashAmount?.toLocaleString() ?? "—"}
              </div>
            ) : (
              proposal.myReceiveItems.map((it) => (
                <div
                  key={it.id}
                  className="text-[11px] font-bold text-[#3a324a]"
                >
                  {it.label} ×{it.qty}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center pt-3 text-[14px] font-bold text-[#a695d8]">
          ⇄
        </div>
        <div>
          <div className="mb-1 text-[9px] font-bold tracking-[0.5px] text-[#3a324a8c]">
            出す
          </div>
          <div className="space-y-0.5">
            {proposal.cashOffer && proposal.myGiveItems.length === 0 ? (
              <div className="text-[11px] font-extrabold text-[#7a9a8a]">
                💴 ¥{proposal.cashAmount?.toLocaleString() ?? "—"}
              </div>
            ) : (
              proposal.myGiveItems.map((it) => (
                <div
                  key={it.id}
                  className="text-[11px] font-bold text-[#3a324a]"
                >
                  {it.label} ×{it.qty}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#a695d822] bg-white/40 px-3 py-1.5">
        <div className="text-[10px] font-bold text-[#3a324a]">
          📍 {proposal.meetupPlaceName ?? "—"}
        </div>
        <div className="text-[10px] tabular-nums text-[#3a324a8c]">
          {meetupSummary}
        </div>
      </div>
    </div>
  );
}

/* ─── 服装写真シェアセクション ─── */

function OutfitSection({
  myPhotoUrl,
  partnerPhotoUrl,
  partnerHandle,
}: {
  myPhotoUrl: string | null;
  partnerPhotoUrl: string | null;
  partnerHandle: string;
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-[12px] bg-[#a695d80a] px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10.5px] font-extrabold text-[#a695d8]">
          👕 服装写真をシェア
        </span>
        <span className="text-[9.5px] text-[#3a324a8c]">
          合流時にお互いを見つけやすく
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <OutfitChip label="あなた" photoUrl={myPhotoUrl} self />
        <OutfitChip
          label={`@${partnerHandle}`}
          photoUrl={partnerPhotoUrl}
          self={false}
        />
      </div>
      <button
        type="button"
        onClick={() =>
          alert("服装写真の撮影は次イテで実装予定です（Storage 整備後）")
        }
        className="mt-1.5 block w-full rounded-[10px] border border-[#a695d855] bg-white py-2 text-[11.5px] font-bold text-[#a695d8] active:scale-[0.97]"
      >
        📷 服装写真を撮影してシェア
      </button>
    </div>
  );
}

function OutfitChip({
  label,
  photoUrl,
  self,
}: {
  label: string;
  photoUrl: string | null;
  self: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-[10px] border px-2 py-1.5 ${
        photoUrl
          ? "border-[#a695d855] bg-white"
          : "border-dashed border-[#3a324a14] bg-[#fbf9fc]"
      }`}
    >
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          photoUrl
            ? "bg-[#a695d8] text-white"
            : "bg-[#3a324a08] text-[#3a324a8c]"
        }`}
      >
        {photoUrl ? "✓" : "—"}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10.5px] font-bold text-[#3a324a]">
          {label}
        </div>
        <div className="text-[9.5px] text-[#3a324a8c]">
          {photoUrl
            ? "✓ 共有済"
            : self
              ? "未シェア"
              : "未シェア"}
        </div>
      </div>
    </div>
  );
}

/* ─── メッセージバブル ─── */

function MessageBubble({ m }: { m: ChatMessage }) {
  if (m.type === "arrival_status") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-emerald-50 px-2.5 py-[3px] text-[10px] font-bold text-emerald-700">
          {m.body ?? "ステータス更新"} ・ {formatTime(m.createdAt)}
        </span>
      </div>
    );
  }
  if (m.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-[#3a324a08] px-2.5 py-[3px] text-[10px] text-[#3a324a8c]">
          {m.body}
        </span>
      </div>
    );
  }

  const align = m.isMine ? "items-end" : "items-start";
  const bubble = m.isMine
    ? "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_2px_6px_rgba(166,149,216,0.25)]"
    : "border border-[#3a324a14] bg-white text-[#3a324a]";

  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      {m.type === "location" && (
        <div
          className={`max-w-[80%] rounded-[14px] px-3 py-2 text-[12.5px] ${bubble}`}
        >
          <div className="flex items-center gap-1.5">
            <span>📍</span>
            <span className="font-bold">
              {m.locationLabel ?? "現在地を共有"}
            </span>
          </div>
          {m.lat != null && m.lng != null && (
            <a
              href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1 block text-[10.5px] underline ${
                m.isMine ? "text-white/85" : "text-[#a695d8]"
              }`}
            >
              地図で見る →
            </a>
          )}
        </div>
      )}
      {m.type === "text" && (
        <div
          className={`max-w-[80%] whitespace-pre-wrap break-words rounded-[14px] px-3 py-2 text-[13px] leading-relaxed ${bubble}`}
        >
          {m.body}
        </div>
      )}
      {(m.type === "photo" || m.type === "outfit_photo") && m.photoUrl && (
        <div
          className={`max-w-[60%] overflow-hidden rounded-[14px] ${bubble}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.photoUrl}
            alt={m.type === "outfit_photo" ? "服装写真" : "写真"}
            className="block h-auto w-full"
          />
        </div>
      )}
      <span className="px-1 text-[9px] text-[#3a324a4d] tabular-nums">
        {formatTime(m.createdAt)}
      </span>
    </div>
  );
}

/* ─── action button ─── */

function ActionButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all ${
        active
          ? "border-[#a695d8] bg-[#a695d80f] text-[#a695d8]"
          : disabled
            ? "border-[#3a324a14] bg-[#fbf9fc] text-[#3a324a8c] opacity-60"
            : "border-[#3a324a14] bg-white text-[#3a324a]"
      }`}
    >
      <span className="text-[18px] leading-none">{icon}</span>
      <span className="text-[9.5px] font-bold leading-tight">{label}</span>
    </button>
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
