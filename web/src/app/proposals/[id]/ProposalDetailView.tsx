"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToProposal } from "@/app/propose/actions";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#e8eef0] text-[11px] text-[#3a324a8c]">
      地図を読み込み中…
    </div>
  ),
});

export type ProposalItem = {
  id: string;
  label: string;
  title: string;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  qty: number;
};

export type ProposalDetail = {
  id: string;
  isReceiver: boolean;
  isSender: boolean;
  matchType: "perfect" | "forward" | "backward";
  status:
    | "sent"
    | "negotiating"
    | "agreement_one_side"
    | "agreed"
    | "rejected"
    | "expired"
    | "cancelled";
  senderItems: ProposalItem[];
  receiverItems: ProposalItem[];
  message: string;
  messageTone: "standard" | "casual" | "polite" | null;
  meetupStartAt: string | null;
  meetupEndAt: string | null;
  meetupPlaceName: string | null;
  meetupLat: number | null;
  meetupLng: number | null;
  exposeCalendar: boolean;
  cashOffer: boolean;
  cashAmount: number | null;
  listingId: string | null;
  expiresAt: string | null;
  lastActionAt: string | null;
  createdAt: string;
  rejectedTemplate: string | null;
  partner: {
    id: string;
    handle: string;
    displayName: string;
    primaryArea: string | null;
  };
};

const STATUS_LABEL: Record<ProposalDetail["status"], string> = {
  sent: "未応答",
  negotiating: "ネゴ中",
  agreement_one_side: "一方合意",
  agreed: "合意済",
  rejected: "拒否",
  expired: "期限切れ",
  cancelled: "取消",
};

const STATUS_COLOR: Record<ProposalDetail["status"], string> = {
  sent: "bg-[#a8d4e6] text-white",
  negotiating: "bg-[#f3c5d4] text-[#3a324a]",
  agreement_one_side: "bg-[#a695d8] text-white",
  agreed: "bg-emerald-500 text-white",
  rejected: "bg-[#3a324a14] text-[#3a324a8c]",
  expired: "bg-[#3a324a14] text-[#3a324a8c]",
  cancelled: "bg-[#3a324a14] text-[#3a324a8c]",
};

const REJECT_TEMPLATES: { id: string; label: string }[] = [
  { id: "ratio", label: "条件が合わない" },
  { id: "timing", label: "時間が合わない" },
  { id: "place", label: "場所が遠い" },
  { id: "no_reason", label: "理由非開示" },
];

export function ProposalDetailView({ detail }: { detail: ProposalDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);

  const canRespond =
    detail.isReceiver &&
    (detail.status === "sent" || detail.status === "negotiating");

  function handleAction(
    action: "accept" | "reject" | "negotiate",
    rejectedTemplate?: string,
  ) {
    setError(null);
    startTransition(async () => {
      const r = await respondToProposal({
        id: detail.id,
        action,
        rejectedTemplate,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* ヘッダーカード */}
      <section className="rounded-2xl border border-[#3a324a14] bg-white p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.3px] ${STATUS_COLOR[detail.status]}`}
          >
            {STATUS_LABEL[detail.status]}
          </span>
          {detail.cashOffer && (
            <span className="rounded-full bg-[#7a9a8a14] px-2 py-[2px] text-[10px] font-bold text-[#7a9a8a]">
              💴 定価交換
            </span>
          )}
          <div className="flex-1" />
          {detail.expiresAt && (
            <ExpiresLabel iso={detail.expiresAt} status={detail.status} />
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d822,#a8d4e622)] text-[15px] font-bold text-[#a695d8]">
            {detail.partner.displayName[0] || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-[#3a324a]">
              @{detail.partner.handle}
            </div>
            <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">
              {detail.isReceiver ? "← 受信" : "→ 送信"}
              {detail.partner.primaryArea
                ? ` ・${detail.partner.primaryArea}`
                : ""}
            </div>
          </div>
        </div>
      </section>

      {/* 交換内容 */}
      <Section label="交換内容">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 rounded-2xl border border-[#3a324a14] bg-white p-3">
          <ItemColumn
            label={detail.isReceiver ? "相手の譲（→ あなた）" : "あなたの譲（→ 相手）"}
            items={detail.senderItems}
            align="left"
            accent="have"
          />
          <div className="flex flex-col items-center gap-1 pt-4">
            <ArrowDot color="#a695d8" dir="right" />
            <ArrowDot color="#a8d4e6" dir="left" />
          </div>
          {detail.cashOffer ? (
            <div className="text-right">
              <div className="mb-1.5 text-[9.5px] font-bold tracking-[0.6px] text-[#3a324a8c]">
                {detail.isReceiver
                  ? "あなたの提示（→ 相手）"
                  : "相手の提示（→ あなた）"}
              </div>
              <div className="rounded-md border border-[#7a9a8a55] bg-[#7a9a8a14] p-2 text-right">
                <div className="text-[9.5px] font-bold text-[#7a9a8a]">
                  💴 定価交換
                </div>
                <div className="mt-0.5 text-[14px] font-extrabold tabular-nums text-[#3a324a]">
                  ¥{detail.cashAmount?.toLocaleString() ?? "—"}
                </div>
              </div>
            </div>
          ) : (
            <ItemColumn
              label={
                detail.isReceiver
                  ? "あなたの譲（→ 相手）"
                  : "相手の譲（→ あなた）"
              }
              items={detail.receiverItems}
              align="right"
              accent="wish"
            />
          )}
        </div>
      </Section>

      {/* 待ち合わせ */}
      <Section label="待ち合わせ">
        <div className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white">
          <div className="px-3 py-2.5">
            <div className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              日時
            </div>
            <div className="mt-0.5 text-[13px] font-bold tabular-nums text-[#3a324a]">
              {detail.meetupStartAt && detail.meetupEndAt
                ? formatRange(detail.meetupStartAt, detail.meetupEndAt)
                : "—"}
            </div>
            <div className="mt-2 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
              場所
            </div>
            <div className="text-[13px] font-bold text-[#3a324a]">
              📍 {detail.meetupPlaceName ?? "—"}
            </div>
          </div>
          {detail.meetupLat != null && detail.meetupLng != null && (
            <div className="h-[160px] w-full border-t border-[#3a324a14]">
              <MapPicker
                center={[detail.meetupLat, detail.meetupLng]}
                radiusM={120}
                onCenterChange={() => {}}
                className="h-full w-full"
              />
            </div>
          )}
        </div>
      </Section>

      {/* メッセージ */}
      <Section
        label="メッセージ"
        hint={
          detail.messageTone === "casual"
            ? "カジュアル"
            : detail.messageTone === "polite"
              ? "丁寧"
              : detail.messageTone === "standard"
                ? "標準"
                : undefined
        }
      >
        <pre className="whitespace-pre-wrap break-words rounded-2xl border border-[#3a324a14] bg-white p-3 text-[13px] leading-relaxed text-[#3a324a]">
          {detail.message || "（本文なし）"}
        </pre>
      </Section>

      {/* その他 */}
      <Section label="その他">
        <div className="space-y-1 rounded-2xl border border-[#3a324a14] bg-white px-3 py-3 text-[11.5px]">
          <div>
            スケジュール共有：
            <span
              className={`ml-1 font-bold ${
                detail.exposeCalendar ? "text-[#a695d8]" : "text-[#3a324a8c]"
              }`}
            >
              {detail.exposeCalendar ? "ON" : "OFF"}
            </span>
          </div>
          {detail.listingId && (
            <div className="text-[#3a324a8c]">
              個別募集経由（listing #{detail.listingId.slice(0, 8)}）
            </div>
          )}
          {detail.rejectedTemplate && (
            <div className="text-[#d9826b]">
              拒否理由：
              {REJECT_TEMPLATES.find((t) => t.id === detail.rejectedTemplate)
                ?.label ?? detail.rejectedTemplate}
            </div>
          )}
        </div>
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 受信者向け CTA */}
      {canRespond && !rejectMode && (
        <div className="space-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAction("accept")}
            className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:opacity-50"
          >
            ✓ この内容で承諾する
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleAction("negotiate")}
              className="block w-full rounded-[14px] border-[1.5px] border-[#a695d855] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#a695d8] disabled:opacity-50"
            >
              ネゴ（条件相談）
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejectMode(true)}
              className="block w-full rounded-[14px] border border-[#3a324a14] bg-white px-4 py-3 text-center text-[13px] font-bold text-[#3a324a8c] disabled:opacity-50"
            >
              拒否
            </button>
          </div>
          <p className="px-1 text-center text-[10.5px] leading-snug text-[#3a324a8c]">
            ネゴ：日時 / 数量 / 提示物の調整を打診相手と相談（C-1.5、次イテレーションで実装）
          </p>
        </div>
      )}

      {canRespond && rejectMode && (
        <div className="space-y-2 rounded-2xl border border-[#d9826b55] bg-[#fff5f0] p-3">
          <div className="text-[12px] font-bold text-[#d9826b]">
            拒否理由を選んでください（任意）
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {REJECT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={pending}
                onClick={() => handleAction("reject", t.id)}
                className="rounded-[10px] border border-[#3a324a14] bg-white px-2 py-2 text-[11.5px] font-bold text-[#3a324a] disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleAction("reject")}
            className="block w-full rounded-[10px] bg-[#d9826b] px-3 py-2 text-center text-[11.5px] font-bold text-white disabled:opacity-50"
          >
            理由なしで拒否を確定
          </button>
          <button
            type="button"
            onClick={() => setRejectMode(false)}
            className="block w-full text-center text-[10.5px] text-[#3a324a8c]"
          >
            ← 戻る
          </button>
        </div>
      )}

      {/* 合意済 / ネゴ中 → 取引チャットへの導線（双方向） */}
      {(detail.status === "agreed" ||
        detail.status === "negotiating" ||
        detail.status === "agreement_one_side") && (
        <Link
          href={`/transactions/${detail.id}`}
          className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-sm font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.97]"
        >
          {detail.status === "agreed"
            ? "💬 取引チャットへ進む →"
            : "💬 ネゴチャットへ進む →"}
        </Link>
      )}

      {/* 送信者向けの状態表示 */}
      {detail.isSender && (
        <div className="rounded-2xl border border-[#3a324a14] bg-[#fbf9fc] p-3 text-[11.5px] leading-relaxed text-[#3a324a8c]">
          {detail.status === "sent"
            ? "相手の応答を待っています。期限切れまでに応答がなければ自動で expired になります。"
            : detail.status === "negotiating"
              ? "ネゴ中です。チャットで条件を相談できます。"
              : detail.status === "agreed"
                ? "合意済 ✓ — 取引チャットで当日の段取りを進めましょう。"
                : detail.status === "rejected"
                  ? "拒否されました。"
                  : detail.status === "expired"
                    ? "期限切れになりました。"
                    : detail.status === "cancelled"
                      ? "取消されました。"
                      : ""}
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ─── */

function ExpiresLabel({
  iso,
  status,
}: {
  iso: string;
  status: ProposalDetail["status"];
}) {
  if (status !== "sent" && status !== "negotiating") return null;
  const days = Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  return (
    <span
      className={`text-[10px] tabular-nums ${
        days <= 1 ? "font-bold text-[#d9826b]" : "text-[#3a324a8c]"
      }`}
    >
      残 {days}日
    </span>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
          {label}
        </span>
        {hint && (
          <span className="text-[9.5px] font-bold text-[#a695d8]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ItemColumn({
  label,
  items,
  align,
  accent,
}: {
  label: string;
  items: ProposalItem[];
  align: "left" | "right";
  accent: "have" | "wish";
}) {
  return (
    <div>
      <div
        className={`mb-1.5 px-1 text-[9.5px] font-bold tracking-[0.6px] text-[#3a324a8c] ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        {label}（{items.length}）
      </div>
      <div
        className={`flex flex-wrap gap-1.5 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        {items.length === 0 ? (
          <span className="px-1 text-[10px] italic text-[#3a324a4d]">—</span>
        ) : (
          items.map((it) => <Tcg key={it.id} item={it} accent={accent} />)
        )}
      </div>
    </div>
  );
}

function Tcg({
  item,
  accent,
}: {
  item: ProposalItem;
  accent: "have" | "wish";
}) {
  const hue =
    Math.abs(
      [...item.label].reduce((s, c) => s + c.charCodeAt(0), 0) ?? 0,
    ) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 86%) 0 5px, hsl(${hue}, 28%, 78%) 5px 10px)`;
  const initialShadow = `0 1px 3px hsla(${hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-md border shadow-[0_1px_3px_rgba(58,50,74,0.15)] ${
        accent === "have" ? "border-[#a8d4e6]" : "border-[#f3c5d4]"
      }`}
      style={{
        width: 36,
        height: 48,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${item.label} ×${item.qty}`}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <div
          className="absolute inset-0 flex items-center justify-center text-[16px] font-extrabold text-white/95"
          style={{ textShadow: initialShadow }}
        >
          {item.label[0] || "?"}
        </div>
      )}
      {item.qty > 1 && (
        <div className="absolute right-0.5 top-0.5 rounded-sm bg-black/55 px-1 text-[8px] font-extrabold leading-tight text-white">
          ×{item.qty}
        </div>
      )}
    </div>
  );
}

function ArrowDot({
  color,
  dir,
}: {
  color: string;
  dir: "left" | "right";
}) {
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-white"
      style={{
        background: color,
        boxShadow: `0 2px 5px ${color}80`,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        {dir === "right" ? (
          <path
            d="M2 5h6m-2-2l2 2-2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <path
            d="M8 5H2m2-2L2 5l2 2"
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </div>
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
    : `${dateFmt(s)} ${timeFmt(s)} 〜 ${dateFmt(e)} ${timeFmt(e)}`;
}
