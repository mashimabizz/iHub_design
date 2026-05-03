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
  approveTradeCancel,
  sendLocationMessage,
  sendPhotoMessage,
  sendTextMessage,
  updateArrivalStatus,
} from "../actions";
import { extendProposal, respondToProposal } from "@/app/propose/actions";
import {
  CalendarOverlayModal,
  type CalEvent,
} from "@/components/schedule/CalendarOverlayModal";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

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
  status: "agreed" | "negotiating" | "agreement_one_side" | "sent";
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
  /** iter73: 合意フラグ（自分視点・相手視点） */
  myAgreed: boolean;
  partnerAgreed: boolean;
  /** iter73: 自分が打診の receiver か（拒否ボタン表示判定用） */
  iAmReceiver: boolean;
  /** iter78-E: 期限・延長関連 */
  expiresAt: string | null;
  extensionCount: number;
  /** iter79-C: 申告中の dispute（open のもの） */
  openDispute: { id: string; ticketNo: string } | null;
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
  calendarEvents,
  partnerCalendarExposed,
}: {
  proposal: ChatProposal;
  messages: ChatMessage[];
  myArrival: "enroute" | "arrived" | "left" | null;
  partnerArrival: "enroute" | "arrived" | "left" | null;
  myOutfitPhoto: string | null;
  partnerOutfitPhoto: string | null;
  calendarEvents: CalEvent[];
  partnerCalendarExposed: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);

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

  // iter78-E: 期限延長
  function handleExtend() {
    if (!confirm("打診の期限を 7 日間延長しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await extendProposal({ id: proposal.id });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  // iter73: 打診を承諾 / 拒否
  function handleAccept() {
    if (!confirm("この内容で合意しますか？両者が合意すると取引フェーズに進みます。"))
      return;
    setError(null);
    startTransition(async () => {
      const r = await respondToProposal({
        id: proposal.id,
        action: "accept",
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }
  function handleReject() {
    if (!confirm("この打診を拒否しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await respondToProposal({
        id: proposal.id,
        action: "reject",
      });
      if (r?.error) setError(r.error);
      else router.push("/transactions");
    });
  }

  /**
   * iter71-D：写真添付
   * iter76-A: 通常写真 / 服装写真 の 2 種類を扱えるよう汎用化
   */
  async function uploadAndSend(
    file: File | null,
    kind: "photo" | "outfit_photo",
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選んでください");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("8MB 以下の画像にしてください");
      return;
    }
    setError(null);
    if (kind === "outfit_photo") setUploadingOutfit(true);
    else setUploadingPhoto(true);
    try {
      const sb = createBrowserClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const prefix = kind === "outfit_photo" ? "outfit" : "chat";
      const path = `${proposal.id}/${prefix}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("chat-photos")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (upErr) {
        setError(upErr.message || "アップロード失敗");
        return;
      }
      startTransition(async () => {
        const r = await sendPhotoMessage({
          proposalId: proposal.id,
          storagePath: path,
          messageType: kind,
        });
        if (r?.error) {
          setError(r.error);
          return;
        }
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      if (kind === "outfit_photo") setUploadingOutfit(false);
      else setUploadingPhoto(false);
    }
  }
  function handlePhotoSelected(file: File | null) {
    uploadAndSend(file, "photo");
  }
  function handleOutfitSelected(file: File | null) {
    uploadAndSend(file, "outfit_photo");
  }

  // iter70-D：合意前は当日合流系 UI を非表示（向かう/到着/服装写真）
  const isAgreed = proposal.status === "agreed";

  return (
    <div className="relative flex h-[calc(100vh-72px)] flex-col bg-[#fbf9fc]">
      <ChatHeaderBar
        proposal={proposal}
        partnerArrival={partnerArrival}
        isAgreed={isAgreed}
      />

      {/* 上部固定：取引内容カード（コンパクト・画像表示） + 合意バー or 服装写真 */}
      <div className="flex-shrink-0 bg-[#fbf9fc]">
        <div className="mx-auto max-w-md px-3.5 pt-2.5">
          {/* iter79-C: 申告中なら警告バナー */}
          {proposal.openDispute && (
            <Link
              href={`/disputes/${proposal.openDispute.id}`}
              className="mb-1.5 flex items-center gap-2 rounded-[10px] border border-[#d9826b40] bg-[#fff5f0] px-3 py-2"
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#d9826b] text-[10px] font-extrabold text-white">
                !
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-[#d9826b]">
                  申告 {proposal.openDispute.ticketNo} ・ 仲裁中
                </div>
                <div className="text-[9.5px] text-[#3a324a8c]">
                  ステータス確認はタップ
                </div>
              </div>
              <span className="text-[10px] text-[#d9826b]">›</span>
            </Link>
          )}
          <DealCard
            proposal={proposal}
            onTap={() => setTradeOpen(true)}
            onMapTap={() => setMapOpen(true)}
          />
          {!isAgreed && (
            <>
              <ExpireBanner
                expiresAt={proposal.expiresAt}
                extensionCount={proposal.extensionCount}
                onExtend={handleExtend}
                pending={pending}
              />
              <AgreementBar
                proposal={proposal}
                onAccept={handleAccept}
                onReject={handleReject}
                pending={pending}
              />
            </>
          )}
          {isAgreed && (
            <OutfitCompactRow
              myShared={!!myOutfitPhoto}
              partnerShared={!!partnerOutfitPhoto}
              myPhotoUrl={myOutfitPhoto}
              partnerPhotoUrl={partnerOutfitPhoto}
              partnerHandle={proposal.partner.handle}
              onTake={() => outfitInputRef.current?.click()}
              uploading={uploadingOutfit}
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

      {/* クイックアクション + 入力欄
          iter70-D：agreed 時のみ向かう/到着/服装写真を表示。
          打診中は再打診ボタン（iter70-C）+ カレンダーボタン（iter70-B）を表示。 */}
      <div className="border-t border-[#a695d822] bg-white/96 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-3 pb-7 pt-2">
          <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            {isAgreed ? (
              <>
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
                  label={uploadingOutfit ? "送信中…" : "服装写真"}
                  tone="pink"
                  onClick={() => outfitInputRef.current?.click()}
                  disabled={pending || uploadingOutfit}
                />
                <QuickChip
                  icon={<CameraIcon />}
                  label={uploadingPhoto ? "送信中…" : "写真添付"}
                  tone="neutral"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={pending || uploadingPhoto}
                />
                <QuickChip
                  icon={<span className="text-[12px] leading-none">⏰</span>}
                  label="遅刻連絡"
                  tone="pink"
                  onClick={() =>
                    router.push(
                      `/transactions/${proposal.id}/cancel-or-late?kind=late`,
                    )
                  }
                />
                <QuickChip
                  icon={<span className="text-[12px] leading-none">🚫</span>}
                  label="キャンセル"
                  tone="neutral"
                  onClick={() =>
                    router.push(
                      `/transactions/${proposal.id}/cancel-or-late?kind=cancel`,
                    )
                  }
                />
              </>
            ) : (
              <>
                <QuickChip
                  icon={<span className="text-[12px] leading-none">📅</span>}
                  label="カレンダー"
                  tone="lavender"
                  onClick={() => setCalendarOpen(true)}
                />
                <QuickChip
                  icon={<span className="text-[12px] leading-none">↻</span>}
                  label="条件を変えて再打診"
                  tone="pink"
                  onClick={() =>
                    router.push(
                      `/propose/${proposal.partner.id}?proposalId=${proposal.id}&revise=1`,
                    )
                  }
                />
                <QuickChip
                  icon={<CameraIcon />}
                  label={uploadingPhoto ? "送信中…" : "写真添付"}
                  tone="neutral"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={pending || uploadingPhoto}
                />
              </>
            )}
          </div>

          {/* iter71-D: 写真添付用 hidden input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              handlePhotoSelected(f);
              // 同じ画像を連続で選べるよう reset
              if (e.target) e.target.value = "";
            }}
          />
          {/* iter76-A: 服装写真用 hidden input（capture=user で内カメラ優先） */}
          <input
            ref={outfitInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              handleOutfitSelected(f);
              if (e.target) e.target.value = "";
            }}
          />

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
      {calendarOpen && (
        <CalendarOverlayModal
          events={calendarEvents}
          partnerHandle={proposal.partner.handle}
          exposed={partnerCalendarExposed}
          onClose={() => setCalendarOpen(false)}
          onProposeWithEvent={(ev) => {
            // iter71-E：選択した予定の時間帯 + 場所で再打診
            const params = new URLSearchParams();
            params.set("proposalId", proposal.id);
            params.set("revise", "1");
            params.set("meetupStart", ev.startAt);
            params.set("meetupEnd", ev.endAt);
            if (ev.venue) params.set("meetupPlace", ev.venue);
            setCalendarOpen(false);
            router.push(
              `/propose/${proposal.partner.id}?${params.toString()}`,
            );
          }}
        />
      )}
    </div>
  );
}

/* ─── Header bar ─── */

function ChatHeaderBar({
  proposal,
  partnerArrival,
  isAgreed,
}: {
  proposal: ChatProposal;
  partnerArrival: "enroute" | "arrived" | "left" | null;
  isAgreed: boolean;
}) {
  // iter70-D：合意前は到着ステータス表示しない（打診中は不要）
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
          {isAgreed ? (
            <>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: arrivedColor }}
              />
              <span style={{ color: arrivedColor }} className="font-bold">
                {arrivedLabel}
              </span>
            </>
          ) : (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a695d8]" />
              <span className="font-bold text-[#a695d8]">打診中</span>
            </>
          )}
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

/* ─── iter78-E: 期限警告バナー + 延長ボタン ─── */

function ExpireBanner({
  expiresAt,
  extensionCount,
  onExtend,
  pending,
}: {
  expiresAt: string | null;
  extensionCount: number;
  onExtend: () => void;
  pending: boolean;
}) {
  if (!expiresAt) return null;
  const remainMs = new Date(expiresAt).getTime() - Date.now();
  const remainDays = Math.ceil(remainMs / (1000 * 60 * 60 * 24));
  // 残 3 日以下のみ表示
  if (remainDays > 3) return null;

  const tone =
    remainDays <= 1 ? "warn" : remainDays <= 2 ? "amber" : "lavender";
  const bgClass =
    tone === "warn"
      ? "border-[#d9826b80] bg-[#fff5f0]"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50"
        : "border-[#a695d855] bg-[#a695d80a]";
  const labelClass =
    tone === "warn"
      ? "text-[#d9826b]"
      : tone === "amber"
        ? "text-amber-700"
        : "text-[#a695d8]";
  const iconText = tone === "warn" ? "⚠️" : "⏰";
  const headlineText =
    remainDays <= 0
      ? "本日期限切れ"
      : remainDays === 1
        ? "あと 1 日で期限切れ"
        : `あと ${remainDays} 日で期限切れ`;

  const canExtend = extensionCount < 3;

  return (
    <div
      className={`mt-1.5 flex items-center gap-2 rounded-[10px] border px-3 py-2 ${bgClass}`}
    >
      <span className="text-[12px]">{iconText}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-bold ${labelClass}`}>
          {headlineText}
        </div>
        <div className="text-[9.5px] text-[#3a324a8c]">
          延長 {extensionCount}/3 回 ・ +7 日延長で再開できます
        </div>
      </div>
      <button
        type="button"
        onClick={onExtend}
        disabled={pending || !canExtend}
        className={`flex-shrink-0 rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_2px_5px_rgba(0,0,0,0.15)] disabled:opacity-50 ${
          tone === "warn"
            ? "bg-[#d9826b]"
            : tone === "amber"
              ? "bg-amber-500"
              : "bg-[#a695d8]"
        }`}
      >
        {canExtend ? "+7日延長" : "延長上限"}
      </button>
    </div>
  );
}

/* ─── iter73: 合意バー（打診中・ネゴ中・片方合意中） ─── */

function AgreementBar({
  proposal,
  onAccept,
  onReject,
  pending,
}: {
  proposal: ChatProposal;
  onAccept: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const myAgreed = proposal.myAgreed;
  const partnerAgreed = proposal.partnerAgreed;
  const canReject = proposal.iAmReceiver;

  // ステータス文
  const statusText = myAgreed
    ? `あなた合意済 · @${proposal.partner.handle} の合意待ち`
    : partnerAgreed
      ? `@${proposal.partner.handle} 合意済 · あなたの確認をお願いします`
      : "両者の合意で取引フェーズへ進めます";

  return (
    <div className="mt-1.5 overflow-hidden rounded-[12px] border border-[#a695d855] bg-[linear-gradient(180deg,rgba(166,149,216,0.10),rgba(168,212,230,0.06))]">
      <div className="flex items-center gap-2 px-3 pt-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#a695d8]">
          ✓ 合意ステータス
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[9.5px]">
          <AgreedDot done={myAgreed} label="あなた" />
          <AgreedDot done={partnerAgreed} label="相手" />
        </div>
      </div>
      <div className="px-3 pt-1 text-[10.5px] leading-relaxed text-[#3a324a]">
        {statusText}
      </div>
      <div className="flex gap-1.5 px-3 pb-2 pt-2">
        {canReject && (
          <button
            type="button"
            onClick={onReject}
            disabled={pending}
            className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#3a324a8c] disabled:opacity-50"
          >
            拒否
          </button>
        )}
        <button
          type="button"
          onClick={onAccept}
          disabled={pending || myAgreed}
          className="flex-1 rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-1.5 text-[12px] font-bold tracking-[0.3px] text-white shadow-[0_2px_6px_rgba(166,149,216,0.31)] active:scale-[0.98] disabled:opacity-50"
        >
          {myAgreed
            ? "合意済（相手の合意待ち）"
            : partnerAgreed
              ? "✓ この内容で合意して取引へ進む →"
              : "✓ この内容で合意する"}
        </button>
      </div>
    </div>
  );
}

function AgreedDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] font-bold tabular-nums ${
        done
          ? "bg-emerald-500 text-white"
          : "border border-[#3a324a14] bg-white text-[#3a324a8c]"
      }`}
    >
      {done ? "✓" : "○"} {label}
    </span>
  );
}

/* ─── 服装写真コンパクト 1 行 ─── */

function OutfitCompactRow({
  myShared,
  partnerShared,
  myPhotoUrl,
  partnerPhotoUrl,
  partnerHandle,
  onTake,
  uploading,
}: {
  myShared: boolean;
  partnerShared: boolean;
  myPhotoUrl: string | null;
  partnerPhotoUrl: string | null;
  partnerHandle: string;
  onTake: () => void;
  uploading: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <>
      <div className="mt-1.5 flex w-full items-center gap-2 rounded-[10px] border border-[#a695d855] bg-[#a695d80a] px-2.5 py-1.5">
        <span className="text-[12px]">👕</span>
        <span className="text-[10.5px] font-bold text-[#a695d8]">服装写真</span>

        {/* 自分側：サムネ or 未シェア */}
        <button
          type="button"
          onClick={() => myPhotoUrl && setPreviewUrl(myPhotoUrl)}
          disabled={!myPhotoUrl}
          className="inline-flex items-center gap-1 text-[10px] text-[#3a324a]"
        >
          あなた：
          {myShared && myPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={myPhotoUrl}
              alt="あなたの服装"
              className="h-5 w-5 rounded-full border border-emerald-300 object-cover"
            />
          ) : (
            <span className="font-bold text-[#3a324a8c]">未シェア</span>
          )}
        </button>
        <span className="text-[10px] text-[#3a324a8c]">/</span>

        {/* 相手側：サムネ or 未シェア */}
        <button
          type="button"
          onClick={() => partnerPhotoUrl && setPreviewUrl(partnerPhotoUrl)}
          disabled={!partnerPhotoUrl}
          className="inline-flex items-center gap-1 text-[10px] text-[#3a324a]"
        >
          @{partnerHandle}：
          {partnerShared && partnerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerPhotoUrl}
              alt="相手の服装"
              className="h-5 w-5 rounded-full border border-emerald-300 object-cover"
            />
          ) : (
            <span className="font-bold text-[#3a324a8c]">未シェア</span>
          )}
        </button>
        <div className="flex-1" />

        {/* 撮影ボタン */}
        <button
          type="button"
          onClick={onTake}
          disabled={uploading}
          className="rounded-full bg-[#a695d8] px-2 py-[2px] text-[10px] font-bold text-white disabled:opacity-50"
        >
          {uploading ? "送信中…" : myShared ? "📷 撮り直す" : "📷 撮影"}
        </button>
      </div>

      {/* iter76-A: 服装写真プレビュー（サムネタップで拡大） */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            aria-label="閉じる"
            className="absolute right-4 top-12 z-[1010] flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#3a324a] shadow-md"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="服装写真プレビュー"
            className="m-4 max-h-[80vh] max-w-[92vw] rounded-[18px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
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
    // iter80-D7: キャンセル要請の system message — 相手側に「同意」ボタン
    if (action === "cancel_requested" && !m.isMine) {
      return (
        <CancelRequestedBubble
          proposalId={proposalId}
          body={m.body ?? "キャンセル要請"}
        />
      );
    }
    return (
      <div className="flex justify-center">
        <span className="whitespace-pre-wrap rounded-[10px] bg-[#3a324a08] px-2.5 py-1.5 text-center text-[10.5px] leading-relaxed text-[#3a324a8c]">
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

/* ─── iter80-D7: キャンセル要請バブル（受信側で「同意」ボタン） ─── */

function CancelRequestedBubble({
  proposalId,
  body,
}: {
  proposalId: string;
  body: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    if (
      !confirm(
        "キャンセルに同意しますか？取引は無効化され、評価への影響はありません。",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const r = await approveTradeCancel({ proposalId });
      if (r?.error) setError(r.error);
      else if (r?.redirectTo) router.push(r.redirectTo);
      else router.refresh();
    });
  }

  function handleDispute() {
    // 同意できない場合は申告フローへ
    router.push(`/disputes/new?proposalId=${proposalId}`);
  }

  return (
    <div className="self-stretch overflow-hidden rounded-[14px] border border-[#d9826b40] bg-[#fff5f0]">
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9826b] text-[10px] font-extrabold text-white">
            !
          </span>
          <span className="text-[11px] font-extrabold tracking-[0.3px] text-[#d9826b]">
            キャンセル要請
          </span>
        </div>
        <div className="mt-1 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#3a324a]">
          {body}
        </div>
      </div>
      {error && (
        <div className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
          {error}
        </div>
      )}
      <div className="mt-2 flex gap-1.5 border-t border-[#d9826b22] bg-white/40 px-3 py-2">
        <button
          type="button"
          onClick={handleDispute}
          disabled={pending}
          className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-1.5 text-[11px] font-bold text-[#3a324a] disabled:opacity-50"
        >
          申告する
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={pending}
          className="flex-1 rounded-[10px] bg-[linear-gradient(135deg,#d9826b,#cc6051)] px-3 py-1.5 text-[12px] font-extrabold text-white shadow-[0_2px_5px_rgba(217,130,107,0.4)] disabled:opacity-50"
        >
          {pending ? "処理中…" : "✓ 同意してキャンセル"}
        </button>
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
