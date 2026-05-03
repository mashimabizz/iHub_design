"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[10px] text-[#3a324a8c]">
      地図…
    </div>
  ),
});

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
  /** 取引証跡が撮影済か */
  hasEvidence: boolean;
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
  const [qrOpen, setQrOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  /* 自動下スクロール */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /* 5 秒 polling */
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

  function handleArrival() {
    setError(null);
    const next: "enroute" | "arrived" | "left" =
      myArrival === "arrived"
        ? "left"
        : myArrival === "enroute"
          ? "arrived"
          : "enroute";
    startTransition(async () => {
      const r = await updateArrivalStatus({
        proposalId: proposal.id,
        status: next,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative flex h-[calc(100vh-72px)] flex-col bg-[#fbf9fc]">
      {/* チャットヘッダー（HeaderBack 配下に追加表示）：相手アバター + ステータス + QR */}
      <ChatHeaderBar
        proposal={proposal}
        partnerArrival={partnerArrival}
        onQrTap={() => setQrOpen(true)}
        onArrivalTap={handleArrival}
        myArrival={myArrival}
      />

      {/* 上部固定：取引内容カード（mini map 付き） + 服装写真シェアバナー */}
      <div className="flex-shrink-0 overflow-y-auto bg-[#fbf9fc]">
        <div className="mx-auto max-w-md px-3.5 pt-2.5">
          <DealCard proposal={proposal} />
          {!myOutfitPhoto && (
            <OutfitShareBanner
              partnerHandle={proposal.partner.handle}
              partnerShared={!!partnerOutfitPhoto}
            />
          )}
        </div>
      </div>

      {/* メッセージリスト */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3.5 pt-2"
        style={{ paddingBottom: 8 }}
      >
        <div className="mx-auto max-w-md space-y-2">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#3a324a14] bg-white px-4 py-6 text-center text-[11.5px] text-[#3a324a8c]">
              まだメッセージがありません。挨拶から始めましょう 👋
            </div>
          )}
          {/* day separator + system messages を inline で */}
          {renderMessagesWithSeparators(messages)}

          {/* 「合流したら証跡撮影」案内（合意済み + まだ撮影前） */}
          {proposal.status === "agreed" && !proposal.hasEvidence && (
            <EvidenceCallout proposalId={proposal.id} />
          )}
        </div>
      </div>

      {error && (
        <div className="mx-3.5 mb-1 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* クイックアクション（常時表示、chip 横並び） + 入力欄 */}
      <div className="border-t border-[#a695d822] bg-white/96 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-3 pb-7 pt-2">
          {/* Quick actions chip row */}
          <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            <QuickChip
              icon={
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <path
                    d="M6 1C3.5 1 1.5 3 1.5 5.5c0 3 4.5 6 4.5 6s4.5-3 4.5-6C10.5 3 8.5 1 6 1z"
                    stroke="#a695d8"
                    strokeWidth="1.3"
                    fill="none"
                  />
                  <circle cx="6" cy="5.5" r="1.6" fill="#a695d8" />
                </svg>
              }
              label="現在地を送る"
              tone="lavender"
              onClick={handleSendLocation}
              disabled={pending}
            />
            <QuickChip
              icon={<span className="text-[12px] leading-none">👕</span>}
              label="服装写真"
              tone="pink"
              onClick={() =>
                alert("服装写真の撮影は次イテで実装予定です（Storage 整備後）")
              }
            />
            <QuickChip
              icon={
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <rect
                    x="1.5"
                    y="2.5"
                    width="9"
                    height="7"
                    rx="1"
                    stroke="#3a324a"
                    strokeWidth="1.2"
                    fill="none"
                  />
                  <circle cx="6" cy="6" r="2" stroke="#3a324a" strokeWidth="1.2" fill="none" />
                </svg>
              }
              label="写真添付"
              tone="neutral"
              onClick={() =>
                alert("写真添付は次イテで実装予定です（Storage 整備後）")
              }
            />
          </div>

          {/* Composer */}
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleArrival}
              disabled={pending}
              aria-label="到着ステータス"
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                myArrival === "arrived"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-[#3a324a14] bg-white text-[#3a324a8c]"
              }`}
              title={
                myArrival === "arrived"
                  ? "到着済（タップで離脱）"
                  : myArrival === "enroute"
                    ? "向かう中（タップで到着）"
                    : "向かう（タップで開始）"
              }
            >
              <span className="text-[14px] leading-none">
                {myArrival === "arrived"
                  ? "✓"
                  : myArrival === "enroute"
                    ? "🚶"
                    : "📍"}
              </span>
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="メッセージ…"
              rows={1}
              maxLength={2000}
              className="block max-h-32 min-h-[36px] flex-1 resize-none rounded-[18px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[13px] text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
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
                  d="M2 12L13 7 2 2v4l7 1-7 1z"
                  fill="#fff"
                  stroke="#fff"
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {qrOpen && (
        <QrModal
          handle={proposal.partner.handle}
          myHandle="あなた"
          onClose={() => setQrOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Header bar ─── */

function ChatHeaderBar({
  proposal,
  partnerArrival,
  myArrival,
  onQrTap,
  onArrivalTap,
}: {
  proposal: ChatProposal;
  partnerArrival: "enroute" | "arrived" | "left" | null;
  myArrival: "enroute" | "arrived" | "left" | null;
  onQrTap: () => void;
  onArrivalTap: () => void;
}) {
  void myArrival;
  void onArrivalTap;
  const arrivedColor =
    partnerArrival === "arrived"
      ? "#22c55e"
      : partnerArrival === "enroute"
        ? "#e0a847"
        : "#9ca3af";
  const arrivedLabel =
    partnerArrival === "arrived"
      ? "会場到着済"
      : partnerArrival === "enroute"
        ? "移動中"
        : "未到着";

  return (
    <div className="flex items-center gap-2.5 border-b border-[#3a324a14] bg-white px-3.5 py-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[13px] font-bold text-[#a695d8]">
        {proposal.partner.displayName[0] || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-[#3a324a]">
          @{proposal.partner.handle}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-[#3a324a8c]">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: arrivedColor }}
          />
          <span style={{ color: arrivedColor }} className="font-bold">
            {arrivedLabel}
          </span>
          {proposal.partner.primaryArea && (
            <>
              <span>·</span>
              <span>{proposal.partner.primaryArea}</span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onQrTap}
        className="inline-flex items-center gap-1 rounded-full bg-[#a695d81a] px-2.5 py-1.5 text-[11.5px] font-bold text-[#a695d8] active:scale-[0.97]"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect
            x="1"
            y="1"
            width="3"
            height="3"
            rx="0.5"
            stroke="#a695d8"
            strokeWidth="1"
            fill="none"
          />
          <rect
            x="6"
            y="1"
            width="3"
            height="3"
            rx="0.5"
            stroke="#a695d8"
            strokeWidth="1"
            fill="none"
          />
          <rect
            x="1"
            y="6"
            width="3"
            height="3"
            rx="0.5"
            stroke="#a695d8"
            strokeWidth="1"
            fill="none"
          />
          <rect x="6" y="6" width="1" height="1" fill="#a695d8" />
          <rect x="8" y="8" width="1" height="1" fill="#a695d8" />
        </svg>
        QR
      </button>
    </div>
  );
}

/* ─── 取引内容カード（mini map 付き） ─── */

function DealCard({ proposal }: { proposal: ChatProposal }) {
  const meetupSummary =
    proposal.meetupStartAt && proposal.meetupEndAt
      ? formatRange(proposal.meetupStartAt, proposal.meetupEndAt)
      : "—";

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#a695d833] bg-white shadow-[0_2px_8px_rgba(166,149,216,0.08)]">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="text-[9.5px] font-extrabold tracking-[0.5px] text-[#a695d8]">
          📋 取引内容＋待ち合わせ（確定済）
        </div>
        <span className="rounded-full bg-emerald-500 px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.4px] text-white">
          合意済
        </span>
      </div>

      {/* Trade items */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-2">
        <div>
          <div className="mb-0.5 text-[9px] font-bold text-[#3a324a8c]">
            受け取る
          </div>
          {proposal.myReceiveItems.length === 0 && proposal.cashOffer ? (
            <div className="text-[11.5px] font-extrabold leading-tight text-[#7a9a8a]">
              💴 ¥{proposal.cashAmount?.toLocaleString() ?? "—"}
            </div>
          ) : (
            <div className="text-[11.5px] font-bold leading-tight text-[#3a324a]">
              {proposal.myReceiveItems.map((it, i) => (
                <div key={it.id}>
                  {it.label}{" "}
                  <span className="text-[#a695d8]">×{it.qty}</span>
                  {i < proposal.myReceiveItems.length - 1 ? null : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 22 22">
          <path
            d="M5 8h12M14 4l4 4-4 4M17 14H5M8 18l-4-4 4-4"
            stroke="#a695d8"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-right">
          <div className="mb-0.5 text-[9px] font-bold text-[#3a324a8c]">
            出す
          </div>
          {proposal.cashOffer && proposal.myGiveItems.length === 0 ? (
            <div className="text-[11.5px] font-extrabold leading-tight text-[#7a9a8a]">
              💴 ¥{proposal.cashAmount?.toLocaleString() ?? "—"}
            </div>
          ) : (
            <div className="text-[11.5px] font-bold leading-tight text-[#3a324a]">
              {proposal.myGiveItems.map((it) => (
                <div key={it.id}>
                  {it.label}{" "}
                  <span className="text-[#a695d8]">×{it.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meetup with mini map */}
      <div className="flex items-center gap-2.5 border-t border-dashed border-[#3a324a14] px-3 py-2">
        <div className="h-[60px] w-[92px] flex-shrink-0 overflow-hidden rounded-[8px] border border-[#3a324a14]">
          {proposal.meetupLat != null && proposal.meetupLng != null ? (
            <MapPicker
              center={[proposal.meetupLat, proposal.meetupLng]}
              radiusM={120}
              onCenterChange={() => {}}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[10px] text-[#3a324a8c]">
              地図なし
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[8.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            📍 待ち合わせ
          </div>
          <div className="text-[12px] font-extrabold tabular-nums leading-tight text-[#3a324a]">
            {meetupSummary}
          </div>
          <div className="mt-0.5 truncate text-[10px] leading-tight text-[#3a324a8c]">
            📍 {proposal.meetupPlaceName ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 服装写真シェアバナー（紫グラデの目立つやつ） ─── */

function OutfitShareBanner({
  partnerHandle,
  partnerShared,
}: {
  partnerHandle: string;
  partnerShared: boolean;
}) {
  return (
    <div className="relative mt-2 overflow-hidden rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] p-3.5 text-white shadow-[0_6px_18px_rgba(166,149,216,0.27)]">
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/12" />
      <div className="pointer-events-none absolute -bottom-2 right-3 h-8 w-8 rounded-full bg-white/10" />

      <div className="relative mb-2 flex items-center gap-2.5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-white/22 text-[20px]">
          👕
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-extrabold leading-tight">
            服装写真をシェア
          </div>
          <div className="mt-0.5 text-[10.5px] leading-snug opacity-90">
            合流時にお互いを見つけやすく
          </div>
        </div>
      </div>

      <div className="relative mb-2.5 flex gap-1.5">
        <div className="flex flex-1 items-center justify-between rounded-[8px] bg-white/18 px-2.5 py-1.5 text-[10px] font-bold">
          <span>あなた</span>
          <span className="opacity-90">未シェア</span>
        </div>
        <div className="flex flex-1 items-center justify-between rounded-[8px] bg-white/32 px-2.5 py-1.5 text-[10px] font-bold">
          <span>{partnerShared ? `@${partnerHandle}` : "相手"}</span>
          <span>{partnerShared ? "✓ 共有済" : "未シェア"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          alert("服装写真の撮影は次イテで実装予定です（Storage 整備後）")
        }
        className="relative inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-white py-2.5 text-[13.5px] font-extrabold tracking-[0.3px] text-[#a695d8] shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.97]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <rect
            x="1.5"
            y="3.5"
            width="11"
            height="8"
            rx="1.5"
            stroke="#a695d8"
            strokeWidth="1.5"
            fill="none"
          />
          <circle
            cx="7"
            cy="7.5"
            r="2.2"
            stroke="#a695d8"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        服装写真を撮影してシェア
      </button>
    </div>
  );
}

/* ─── 「合流したら証跡撮影」案内 ─── */

function EvidenceCallout({ proposalId }: { proposalId: string }) {
  return (
    <div className="my-2 flex items-center gap-2.5 rounded-[14px] border border-dashed border-[#a695d866] bg-white px-3 py-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)]">
        <svg width="14" height="14" viewBox="0 0 14 14">
          <rect
            x="1.5"
            y="3.5"
            width="11"
            height="8"
            rx="1.5"
            stroke="#fff"
            strokeWidth="1.4"
            fill="none"
          />
          <circle cx="7" cy="7.5" r="2" stroke="#fff" strokeWidth="1.4" fill="none" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold leading-tight text-[#3a324a]">
          合流したら証跡を撮影
        </div>
        <div className="mt-0.5 text-[10px] leading-tight text-[#3a324a8c]">
          両者の交換物を1枚に収めます
        </div>
      </div>
      <Link
        href={`/transactions/${proposalId}/capture`}
        className="rounded-[10px] bg-[#a695d8] px-3 py-1.5 text-[11.5px] font-bold text-white active:scale-[0.97]"
      >
        撮影へ
      </Link>
    </div>
  );
}

/* ─── メッセージリスト + day separator ─── */

function renderMessagesWithSeparators(messages: ChatMessage[]) {
  const out: React.ReactNode[] = [];
  let lastDay: string | null = null;
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== lastDay) {
      out.push(
        <div key={`sep-${dayKey}-${m.id}`} className="flex justify-center py-1">
          <span className="rounded-full bg-[#3a324a08] px-2.5 py-[3px] text-[10px] text-[#3a324a8c]">
            {`${d.getMonth() + 1}/${d.getDate()} (${"日月火水木金土"[d.getDay()]}) · ${formatTime(m.createdAt)}`}
          </span>
        </div>,
      );
      lastDay = dayKey;
    }
    out.push(<MessageBubble key={m.id} m={m} />);
  }
  return out;
}

/* ─── メッセージバブル ─── */

function MessageBubble({ m }: { m: ChatMessage }) {
  if (m.type === "arrival_status") {
    const status = (m.meta as { status?: string } | null)?.status;
    const color =
      status === "arrived"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
    return (
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold ${color}`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              status === "arrived" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {m.body ?? "ステータス更新"} · {formatTime(m.createdAt)}
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

  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      {m.type === "location" && (
        <LocationBubble m={m} />
      )}
      {m.type === "text" && (
        <div
          className={`max-w-[78%] whitespace-pre-wrap break-words rounded-[16px] px-3 py-2 text-[13px] leading-relaxed ${
            m.isMine
              ? "rounded-tr-[4px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_2px_6px_rgba(166,149,216,0.25)]"
              : "rounded-tl-[4px] border border-[#3a324a14] bg-white text-[#3a324a]"
          }`}
        >
          {m.body}
        </div>
      )}
      {(m.type === "photo" || m.type === "outfit_photo") && m.photoUrl && (
        <div
          className={`max-w-[60%] overflow-hidden rounded-[14px] ${
            m.isMine ? "bg-white" : "border border-[#3a324a14] bg-white"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.photoUrl}
            alt={m.type === "outfit_photo" ? "服装写真" : "写真"}
            className="block h-auto w-full"
          />
        </div>
      )}
      <span className="px-1 text-[9px] tabular-nums text-[#3a324a4d]">
        {formatTime(m.createdAt)}
      </span>
    </div>
  );
}

function LocationBubble({ m }: { m: ChatMessage }) {
  const isMine = m.isMine;
  return (
    <div
      className={`max-w-[78%] overflow-hidden rounded-[16px] border ${
        isMine
          ? "rounded-tr-[4px] border-[#a695d840] bg-white shadow-[0_2px_6px_rgba(166,149,216,0.13)]"
          : "rounded-tl-[4px] border-[#3a324a14] bg-white"
      }`}
    >
      {m.lat != null && m.lng != null && (
        <div className="h-[120px] w-[240px]">
          <MapPicker
            center={[m.lat, m.lng]}
            radiusM={120}
            onCenterChange={() => {}}
            className="h-full w-full"
          />
        </div>
      )}
      <div className="px-2.5 py-2">
        <div className="text-[11px] font-bold text-[#3a324a]">
          📍 {m.locationLabel ?? "現在地を共有"}
        </div>
        {m.lat != null && m.lng != null && (
          <a
            href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block text-[10px] text-[#a695d8] underline"
          >
            地図アプリで開く →
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Quick chip ─── */

function QuickChip({
  icon,
  label,
  tone,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "lavender" | "pink" | "neutral";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    tone === "lavender"
      ? "border-[#a695d844] bg-[#a695d814] text-[#a695d8]"
      : tone === "pink"
        ? "border-[#f3c5d455] bg-[#f3c5d41a] text-[#3a324a]"
        : "border-[#3a324a14] bg-[#3a324a08] text-[#3a324a]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold disabled:opacity-50 ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── QR モーダル（簡易） ─── */

function QrModal({
  handle,
  myHandle,
  onClose,
}: {
  handle: string;
  myHandle: string;
  onClose: () => void;
}) {
  void myHandle;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-6"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-[320px] rounded-[16px] bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#3a324a08] text-[#3a324a8c]"
        >
          ✕
        </button>
        <div className="mb-2 text-center text-[14px] font-bold text-[#3a324a]">
          QR で本人確認
        </div>
        <div className="mb-3 text-center text-[10.5px] leading-relaxed text-[#3a324a8c]">
          相手の QR をカメラで読み取るか、自分の QR を見せて
          @{handle} 本人であることを確認しましょう。
        </div>
        <div className="mx-auto flex h-[160px] w-[160px] items-center justify-center rounded-[12px] border border-[#3a324a14] bg-[#fbf9fc] text-[10px] text-[#3a324a8c]">
          QR 機能は次イテで実装予定
        </div>
        <div className="mt-3 rounded-[10px] bg-[#3a324a08] px-3 py-2 text-center text-[10.5px] text-[#3a324a8c]">
          相手：@{handle}
        </div>
      </div>
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
