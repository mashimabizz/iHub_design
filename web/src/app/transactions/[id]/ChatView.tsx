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
  hasEvidence: boolean;
  evidencePhotoCount: number;
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

const PREVIEW_MAX = 2; // 取引内容カードで 1 行で表示する最大数

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
  const [tradeOpen, setTradeOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
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
      const r = await sendTextMessage({ proposalId: proposal.id, body });
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

  function handleArrival(status: "enroute" | "arrived") {
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
      <ChatHeaderBar
        proposal={proposal}
        partnerArrival={partnerArrival}
      />

      {/* 上部固定：取引内容カード（コンパクト・画像表示） + 服装写真ステータス（1 行） */}
      <div className="flex-shrink-0 bg-[#fbf9fc]">
        <div className="mx-auto max-w-md px-3.5 pt-2.5">
          <DealCard
            proposal={proposal}
            onTap={() => setTradeOpen(true)}
            onMapTap={() => setMapOpen(true)}
          />
          <OutfitCompactRow
            myShared={!!myOutfitPhoto}
            partnerShared={!!partnerOutfitPhoto}
            partnerHandle={proposal.partner.handle}
          />
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
          {renderMessagesWithSeparators(messages, proposal.id)}

          {/* 「合流したら証跡撮影」案内（合意済 + 撮影前） */}
          {proposal.status === "agreed" &&
            proposal.evidencePhotoCount === 0 && (
              <EvidenceCallout proposalId={proposal.id} />
            )}
        </div>
      </div>

      {error && (
        <div className="mx-3.5 mb-1 rounded-xl border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* クイックアクション（向かう/到着 含む 5 chip）+ 入力欄 */}
      <div className="border-t border-[#a695d822] bg-white/96 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-3 pb-7 pt-2">
          <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            <QuickChip
              icon={<MapPin />}
              label="現在地を送る"
              tone="lavender"
              onClick={handleSendLocation}
              disabled={pending}
            />
            <QuickChip
              icon={<span className="text-[12px] leading-none">🚶</span>}
              label="向かっています"
              tone={myArrival === "enroute" ? "lavender-active" : "lavender"}
              onClick={() => handleArrival("enroute")}
              disabled={pending}
            />
            <QuickChip
              icon={<span className="text-[12px] leading-none">✓</span>}
              label="到着しました"
              tone={myArrival === "arrived" ? "emerald-active" : "emerald"}
              onClick={() => handleArrival("arrived")}
              disabled={pending}
            />
            <QuickChip
              icon={<span className="text-[12px] leading-none">👕</span>}
              label="服装写真"
              tone="pink"
              onClick={() =>
                alert("服装写真の撮影は次イテで実装予定です")
              }
            />
            <QuickChip
              icon={<CameraIcon />}
              label="写真添付"
              tone="neutral"
              onClick={() =>
                alert("写真添付は次イテで実装予定です")
              }
            />
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="メッセージ…"
              rows={1}
              maxLength={2000}
              className="block max-h-32 min-h-[36px] flex-1 resize-none rounded-[18px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[16px] text-[#3a324a] placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
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

      {tradeOpen && (
        <TradeDetailModal
          proposal={proposal}
          onClose={() => setTradeOpen(false)}
          onMapTap={() => {
            setTradeOpen(false);
            setMapOpen(true);
          }}
        />
      )}
      {mapOpen && (
        <MapModal
          lat={proposal.meetupLat}
          lng={proposal.meetupLng}
          placeName={proposal.meetupPlaceName}
          startAt={proposal.meetupStartAt}
          endAt={proposal.meetupEndAt}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Header bar ─── */

function ChatHeaderBar({
  proposal,
  partnerArrival,
}: {
  proposal: ChatProposal;
  partnerArrival: "enroute" | "arrived" | "left" | null;
}) {
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
    </div>
  );
}

/* ─── 取引内容カード（コンパクト・画像、タップで詳細） ─── */

function DealCard({
  proposal,
  onTap,
  onMapTap,
}: {
  proposal: ChatProposal;
  onTap: () => void;
  onMapTap: () => void;
}) {
  const meetupSummary =
    proposal.meetupStartAt && proposal.meetupEndAt
      ? formatRange(proposal.meetupStartAt, proposal.meetupEndAt)
      : "—";
  const totalReceive = proposal.cashOffer
    ? 0
    : proposal.myReceiveItems.length;
  const totalGive = proposal.myGiveItems.length;
  const overflow =
    totalReceive > PREVIEW_MAX || totalGive > PREVIEW_MAX;

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

      {/* 画像で交換内容を表示（タップで詳細展開） */}
      <button
        type="button"
        onClick={onTap}
        className="flex w-full items-center gap-1.5 px-3 pb-2 pt-0.5 text-left active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[8.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            受け取る
          </div>
          {proposal.cashOffer && proposal.myReceiveItems.length === 0 ? (
            <CashChip amount={proposal.cashAmount} />
          ) : (
            <ItemRowImg items={proposal.myReceiveItems} />
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 22 22" className="flex-shrink-0">
          <path
            d="M5 8h12M14 4l4 4-4 4M17 14H5M8 18l-4-4 4-4"
            stroke="#a695d8"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="min-w-0 flex-1 text-right">
          <div className="mb-0.5 text-[8.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            出す
          </div>
          {proposal.cashOffer && proposal.myGiveItems.length === 0 ? (
            <div className="flex justify-end">
              <CashChip amount={proposal.cashAmount} />
            </div>
          ) : (
            <ItemRowImg items={proposal.myGiveItems} align="right" />
          )}
        </div>
      </button>

      {overflow && (
        <button
          type="button"
          onClick={onTap}
          className="block w-full border-t border-dashed border-[#3a324a14] bg-[#a695d80a] px-3 py-1 text-center text-[10px] font-bold text-[#a695d8] active:bg-[#a695d814]"
        >
          すべて表示 ▾
        </button>
      )}

      {/* 待ち合わせ：mini map サムネ（タップで拡大モーダル） */}
      <button
        type="button"
        onClick={onMapTap}
        className="flex w-full items-center gap-2.5 border-t border-dashed border-[#3a324a14] px-3 py-2 text-left active:bg-[#a695d80a]"
      >
        <div className="relative h-[44px] w-[68px] flex-shrink-0 overflow-hidden rounded-[8px] border border-[#3a324a14]">
          {proposal.meetupLat != null && proposal.meetupLng != null ? (
            <>
              <MapPicker
                center={[proposal.meetupLat, proposal.meetupLng]}
                radiusM={120}
                onCenterChange={() => {}}
                className="pointer-events-none h-full w-full"
              />
              <span className="absolute right-1 top-1 rounded-sm bg-black/55 px-1 text-[7.5px] font-bold text-white">
                ⤢
              </span>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[9px] text-[#3a324a8c]">
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
        <span className="text-[10px] text-[#3a324a8c]">›</span>
      </button>
    </div>
  );
}

function ItemRowImg({
  items,
  align,
}: {
  items: ChatItem[];
  align?: "right";
}) {
  if (items.length === 0) {
    return (
      <div className="text-[10px] italic text-[#3a324a4d]">—</div>
    );
  }
  const visible = items.slice(0, PREVIEW_MAX);
  const overflow = items.length - visible.length;
  return (
    <div
      className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      {visible.map((it) => (
        <ItemThumb key={it.id} item={it} />
      ))}
      {overflow > 0 && (
        <div className="flex h-7 min-w-[20px] items-center justify-center rounded-md bg-[#3a324a08] px-1 text-[9px] font-extrabold text-[#3a324a8c]">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function ItemThumb({ item }: { item: ChatItem }) {
  const hue =
    Math.abs(
      [...item.label].reduce((s, c) => s + c.charCodeAt(0), 0),
    ) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 84%) 0 4px, hsl(${hue}, 28%, 76%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className="relative flex h-7 w-[22px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-white/60 shadow-[0_1px_2px_rgba(58,50,74,0.18)]"
      style={{
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${item.label} ×${item.qty}`}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {!hasPhoto && (
        <span
          className="text-[10px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] ?? "?"}
        </span>
      )}
      {item.qty > 1 && (
        <span className="absolute -right-0.5 -top-0.5 rounded-bl-[3px] bg-black/60 px-[2px] text-[7px] font-extrabold leading-tight text-white">
          ×{item.qty}
        </span>
      )}
    </div>
  );
}

function CashChip({ amount }: { amount: number | null }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-[#7a9a8a14] px-1.5 py-0.5 text-[11px] font-extrabold text-[#7a9a8a]">
      💴 ¥{amount?.toLocaleString() ?? "—"}
    </span>
  );
}

/* ─── 服装写真コンパクト 1 行 ─── */

function OutfitCompactRow({
  myShared,
  partnerShared,
  partnerHandle,
}: {
  myShared: boolean;
  partnerShared: boolean;
  partnerHandle: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        alert("服装写真の撮影は次イテで実装予定です（Storage 整備後）")
      }
      className="mt-1.5 flex w-full items-center gap-2 rounded-[10px] border border-[#a695d855] bg-[#a695d80a] px-2.5 py-1.5 text-left active:bg-[#a695d814]"
    >
      <span className="text-[12px]">👕</span>
      <span className="text-[10.5px] font-bold text-[#a695d8]">服装写真</span>
      <span className="text-[10px] text-[#3a324a]">
        あなた：
        <span className={myShared ? "font-bold text-emerald-600" : "text-[#3a324a8c]"}>
          {myShared ? "✓ 共有済" : "未シェア"}
        </span>
      </span>
      <span className="text-[10px] text-[#3a324a8c]">/</span>
      <span className="text-[10px] text-[#3a324a]">
        @{partnerHandle}：
        <span
          className={
            partnerShared ? "font-bold text-emerald-600" : "text-[#3a324a8c]"
          }
        >
          {partnerShared ? "✓ 共有済" : "未シェア"}
        </span>
      </span>
      <div className="flex-1" />
      <span className="rounded-full bg-[#a695d8] px-2 py-[2px] text-[10px] font-bold text-white">
        📷 撮影
      </span>
    </button>
  );
}

/* ─── 「合流したら証跡撮影」案内 ─── */

function EvidenceCallout({ proposalId }: { proposalId: string }) {
  return (
    <div className="my-2 flex items-center gap-2.5 rounded-[14px] border border-dashed border-[#a695d866] bg-white px-3 py-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)]">
        <CameraIconWhite />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-bold leading-tight text-[#3a324a]">
          合流したら証跡を撮影
        </div>
        <div className="mt-0.5 text-[10px] leading-tight text-[#3a324a8c]">
          両者の交換物を1枚に収めます（複数枚可）
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

function renderMessagesWithSeparators(
  messages: ChatMessage[],
  proposalId: string,
) {
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
    out.push(<MessageBubble key={m.id} m={m} proposalId={proposalId} />);
  }
  return out;
}

/* ─── メッセージバブル ─── */

function MessageBubble({
  m,
  proposalId,
}: {
  m: ChatMessage;
  proposalId: string;
}) {
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
    const action = (m.meta as { action?: string } | null)?.action;
    if (action === "open_approve") {
      return (
        <Link
          href={`/transactions/${proposalId}/approve`}
          className="block self-stretch rounded-[14px] border border-[#a695d855] bg-[linear-gradient(135deg,rgba(166,149,216,0.10),rgba(168,212,230,0.10))] px-3 py-2.5 text-center font-bold text-[#a695d8] shadow-[0_2px_8px_rgba(166,149,216,0.13)] active:scale-[0.99]"
        >
          <div className="text-[12px]">{m.body}</div>
          <div className="mt-0.5 text-[10px] font-semibold text-[#a695d8]/80">
            タップで取引完了の確認画面へ →
          </div>
        </Link>
      );
    }
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
      {m.type === "location" && <LocationBubble m={m} />}
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
  tone:
    | "lavender"
    | "lavender-active"
    | "pink"
    | "neutral"
    | "emerald"
    | "emerald-active";
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    tone === "lavender"
      ? "border-[#a695d844] bg-[#a695d814] text-[#a695d8]"
      : tone === "lavender-active"
        ? "border-[#a695d8] bg-[#a695d8] text-white"
        : tone === "pink"
          ? "border-[#f3c5d455] bg-[#f3c5d41a] text-[#3a324a]"
          : tone === "emerald"
            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
            : tone === "emerald-active"
              ? "border-emerald-500 bg-emerald-500 text-white"
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

/* ─── 取引内容 詳細モーダル ─── */

function TradeDetailModal({
  proposal,
  onClose,
  onMapTap,
}: {
  proposal: ChatProposal;
  onClose: () => void;
  onMapTap: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[20px] bg-white p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.25)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[14px] font-bold text-[#3a324a]">取引内容</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3a324a08] text-[#3a324a8c]"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 pb-1">
          <DetailGroup label="受け取る" items={proposal.myReceiveItems} cashOffer={proposal.cashOffer && proposal.myReceiveItems.length === 0} cashAmount={proposal.cashAmount} />
          <DetailGroup label="出す" items={proposal.myGiveItems} cashOffer={proposal.cashOffer && proposal.myGiveItems.length === 0} cashAmount={proposal.cashAmount} />
          <button
            type="button"
            onClick={onMapTap}
            className="block w-full rounded-[12px] border border-[#a695d855] bg-[#a695d80a] py-2.5 text-center text-[12px] font-bold text-[#a695d8]"
          >
            📍 待ち合わせ場所を地図で見る →
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailGroup({
  label,
  items,
  cashOffer,
  cashAmount,
}: {
  label: string;
  items: ChatItem[];
  cashOffer: boolean;
  cashAmount: number | null;
}) {
  return (
    <div className="rounded-[14px] border border-[#3a324a14] bg-[#fbf9fc] p-3">
      <div className="mb-2 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        {label}（{cashOffer ? 1 : items.length}）
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cashOffer ? (
          <CashChip amount={cashAmount} />
        ) : items.length === 0 ? (
          <span className="text-[11px] italic text-[#3a324a4d]">—</span>
        ) : (
          items.map((it) => <BigItemThumb key={it.id} item={it} />)
        )}
      </div>
    </div>
  );
}

function BigItemThumb({ item }: { item: ChatItem }) {
  const hue =
    Math.abs([...item.label].reduce((s, c) => s + c.charCodeAt(0), 0)) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 84%) 0 5px, hsl(${hue}, 28%, 76%) 5px 10px)`;
  const initialShadow = `0 1px 3px hsla(${hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex h-[64px] w-[48px] items-center justify-center overflow-hidden rounded-md border border-white/60 shadow-[0_2px_6px_rgba(58,50,74,0.18)]"
        style={{ background: hasPhoto ? "#3a324a" : stripeBg }}
      >
        {hasPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl!}
            alt={item.label}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!hasPhoto && (
          <span
            className="text-[20px] font-extrabold text-white/95"
            style={{ textShadow: initialShadow }}
          >
            {item.label[0] ?? "?"}
          </span>
        )}
        {item.qty > 1 && (
          <span className="absolute right-0.5 top-0.5 rounded-sm bg-black/60 px-1 text-[9px] font-extrabold text-white">
            ×{item.qty}
          </span>
        )}
      </div>
      <div className="mt-1 max-w-[60px] truncate text-center text-[10px] font-bold text-[#3a324a]">
        {item.label}
      </div>
      {item.goodsTypeName && (
        <div className="max-w-[60px] truncate text-center text-[8.5px] text-[#3a324a8c]">
          {item.goodsTypeName}
        </div>
      )}
    </div>
  );
}

/* ─── 待ち合わせ拡大マップモーダル ─── */

function MapModal({
  lat,
  lng,
  placeName,
  startAt,
  endAt,
  onClose,
}: {
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  startAt: string | null;
  endAt: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="absolute right-4 top-12 z-[1010] flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#3a324a] shadow-md"
      >
        ✕
      </button>
      <div
        className="m-auto w-[92%] max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-2 pt-3">
          <div className="text-[14px] font-bold text-[#3a324a]">
            📍 待ち合わせ場所
          </div>
          <div className="mt-0.5 text-[11px] tabular-nums text-[#3a324a8c]">
            {startAt && endAt ? formatRange(startAt, endAt) : "—"}
          </div>
          <div className="mt-0.5 truncate text-[11.5px] font-semibold text-[#3a324a]">
            {placeName ?? "—"}
          </div>
        </div>
        <div className="h-[360px] w-full">
          {lat != null && lng != null ? (
            <MapPicker
              center={[lat, lng]}
              radiusM={150}
              onCenterChange={() => {}}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[12px] text-[#3a324a8c]">
              地図情報なし
            </div>
          )}
        </div>
        {lat != null && lng != null && (
          <div className="border-t border-[#3a324a14] bg-white px-4 py-2.5 text-center">
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] font-bold text-[#a695d8] underline"
            >
              地図アプリで開く →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── icons ─── */

function MapPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12">
      <path
        d="M6 1C3.5 1 1.5 3 1.5 5.5c0 3 4.5 6 4.5 6s4.5-3 4.5-6C10.5 3 8.5 1 6 1z"
        stroke="#a695d8"
        strokeWidth="1.3"
        fill="none"
      />
      <circle cx="6" cy="5.5" r="1.6" fill="#a695d8" />
    </svg>
  );
}
function CameraIcon() {
  return (
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
  );
}
function CameraIconWhite() {
  return (
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
