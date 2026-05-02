"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { deleteAW, toggleAWStatus } from "./actions";

export type AWItem = {
  id: string;
  venue: string;
  eventName: string | null;
  eventless: boolean;
  startAt: string; // ISO
  endAt: string;
  radiusM: number;
  note: string | null;
  status: "enabled" | "disabled" | "archived";
};

type DerivedStatus = "active" | "scheduled" | "past" | "disabled" | "archived";

function deriveStatus(aw: AWItem, now: Date): DerivedStatus {
  if (aw.status === "archived") return "archived";
  if (aw.status === "disabled") return "disabled";
  const start = new Date(aw.startAt).getTime();
  const end = new Date(aw.endAt).getTime();
  const t = now.getTime();
  if (t < start) return "scheduled";
  if (t > end) return "past";
  return "active";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const main = `${d.getMonth() + 1}/${d.getDate()} (${wd})`;
  if (isToday) return `今日 ${main}`;
  if (isTomorrow) return `明日 ${main}`;
  return main;
}

function formatTimeLabel(aw: AWItem): string {
  const s = new Date(aw.startAt);
  const e = new Date(aw.endAt);
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(s)} 〜 ${fmt(e)}`;
}

function formatRadius(m: number): string {
  if (m >= 1000) return `${m / 1000}km`;
  return `${m}m`;
}

export function AWView({ items }: { items: AWItem[] }) {
  const router = useRouter();
  const now = new Date();

  const grouped = useMemo(() => {
    const active: AWItem[] = [];
    const scheduled: AWItem[] = [];
    const past: AWItem[] = [];
    for (const aw of items) {
      const s = deriveStatus(aw, now);
      if (s === "active") active.push(aw);
      else if (s === "scheduled" || s === "disabled") scheduled.push(aw);
      else past.push(aw);
    }
    return { active, scheduled, past };
  }, [items, now]);

  async function handleDelete(id: string) {
    if (!confirm("この AW を削除しますか？")) return;
    const result = await deleteAW(id);
    if (result?.error) alert(result.error);
    else router.refresh();
  }

  async function handleToggle(
    id: string,
    next: "enabled" | "disabled" | "archived",
  ) {
    const result = await toggleAWStatus(id, next);
    if (result?.error) alert(result.error);
    else router.refresh();
  }

  return (
    <main
      className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]"
      style={{
        fontFamily: '"Noto Sans JP", -apple-system, system-ui',
        fontFeatureSettings: '"palt"',
        color: "#3a324a",
      }}
    >
      <div className="h-[60px]" />

      {/* ヘッダー */}
      <div className="border-b border-[#3a324a0f] bg-white px-[18px] pb-[10px] pt-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <div className="text-[19px] font-extrabold tracking-[0.3px] text-[#3a324a]">
              AW · 合流可能枠
            </div>
            <div className="mt-[1px] text-[11px] text-[#3a324a8c]">
              Availability Window — 場所 × 時間 × 半径
            </div>
          </div>
          <Link
            href="/aw/new"
            className="inline-flex items-center gap-[5px] rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-[14px] py-2 text-[12px] font-bold text-white shadow-[0_4px_10px_rgba(166,149,216,0.31)] transition-all duration-150 active:scale-[0.97]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M5.5 1v9M1 5.5h9" />
            </svg>
            AWを追加
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-[30px] pt-[14px]">
        {/* ACTIVE NOW */}
        {grouped.active.length > 0 && (
          <>
            <SectionHeading pulse>
              ACTIVE NOW
              <span className="ml-1.5 text-[10px] font-extrabold text-[#a695d8]">
                · {grouped.active.length}
              </span>
            </SectionHeading>
            <div className="space-y-2">
              {grouped.active.map((aw) => (
                <AWCard
                  key={aw.id}
                  aw={aw}
                  derived="active"
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}

        {/* SCHEDULED */}
        {grouped.scheduled.length > 0 && (
          <div className={grouped.active.length > 0 ? "mt-[14px]" : ""}>
            <SectionHeading>
              SCHEDULED
              <span className="ml-1.5 text-[10px] font-extrabold text-[#3a324a8c]">
                · {grouped.scheduled.length}
              </span>
            </SectionHeading>
            <div className="space-y-2">
              {grouped.scheduled.map((aw) => (
                <AWCard
                  key={aw.id}
                  aw={aw}
                  derived={
                    aw.status === "disabled" ? "disabled" : "scheduled"
                  }
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* 自動アーカイブ */}
        {grouped.past.length > 0 && (
          <div
            className={
              grouped.active.length || grouped.scheduled.length
                ? "mt-[14px]"
                : ""
            }
          >
            <SectionHeading>
              自動アーカイブ
              <span className="ml-1.5 text-[10px] font-extrabold text-[#3a324a8c]">
                · 直近
              </span>
            </SectionHeading>
            <div className="rounded-[14px] border-[0.5px] border-[#3a324a0f] bg-white p-3 opacity-75">
              {grouped.past.slice(0, 5).map((aw, i, arr) => (
                <div
                  key={aw.id}
                  className={`flex items-center gap-2.5 py-2 ${
                    i < arr.length - 1
                      ? "border-b-[0.5px] border-[#3a324a0f]"
                      : ""
                  }`}
                >
                  <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-[#3a324a0f] text-[10px] font-bold text-[#3a324a8c]">
                    済
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-[#3a324a]">
                      {aw.venue}
                    </div>
                    <div className="mt-[1px] text-[10px] text-[#3a324a8c]">
                      {formatDate(aw.startAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(aw.id)}
                    className="text-[10px] text-[#a695d8]"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状態 */}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
            まだ AW がありません
            <br />
            <Link
              href="/aw/new"
              className="mt-2 inline-block font-bold text-[#a695d8]"
            >
              + 最初の AW を追加
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionHeading({
  children,
  pulse,
}: {
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-extrabold tracking-[0.7px] text-[#3a324a8c]">
      {pulse && (
        <span
          className="h-[7px] w-[7px] rounded-full bg-emerald-500"
          style={{ boxShadow: "0 0 0 3px rgba(34,197,94,0.25)" }}
        />
      )}
      {children}
    </div>
  );
}

function AWCard({
  aw,
  derived,
  onToggle,
  onDelete,
}: {
  aw: AWItem;
  derived: DerivedStatus;
  onToggle: (id: string, next: "enabled" | "disabled" | "archived") => void;
  onDelete: (id: string) => void;
}) {
  const isActive = derived === "active";
  const isDisabled = derived === "disabled";
  const dateText = formatDate(aw.startAt);
  const dateBadgeText = dateText.split(" ")[0]; // "今日" or "明日" or "5/3"
  const timeLabel = aw.eventName
    ? `開演 — ${formatTimeLabel(aw)}`
    : formatTimeLabel(aw);

  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        isActive
          ? "border-[1.5px] border-[#a695d888] bg-[linear-gradient(135deg,#a695d81c,#a8d4e624)] shadow-[0_8px_20px_rgba(166,149,216,0.15)]"
          : "border-[0.5px] border-[#3a324a0f] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]"
      } ${isDisabled ? "opacity-60" : ""}`}
    >
      {/* ヘッダーストリップ */}
      <div className="flex items-center gap-2 px-[14px] pb-2 pt-[11px]">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.6px] text-white">
            <span className="h-[5px] w-[5px] rounded-full bg-white" />
            LIVE
          </span>
        ) : isDisabled ? (
          <span className="rounded-full bg-[#f3c5d4] px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.6px] text-white">
            一時無効
          </span>
        ) : (
          <span className="rounded-full bg-[#3a324a0f] px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.6px] text-[#3a324a8c]">
            {dateBadgeText}
          </span>
        )}
        <div className="flex-1 text-[11px] font-semibold text-[#3a324a8c]">
          {dateText}
        </div>
        <button
          type="button"
          onClick={() => onDelete(aw.id)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
          aria-label="削除"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="3" cy="7" r="1.2" fill="#3a324a8c" />
            <circle cx="7" cy="7" r="1.2" fill="#3a324a8c" />
            <circle cx="11" cy="7" r="1.2" fill="#3a324a8c" />
          </svg>
        </button>
      </div>

      {/* 場所 + イベント */}
      <div className="px-[14px]">
        <div className="flex items-center gap-1.5">
          {aw.eventless && (
            <span className="rounded-[5px] bg-[#3a324a0f] px-[7px] py-[2px] text-[9.5px] font-extrabold tracking-[0.5px] text-[#3a324a8c]">
              合流可能枠
            </span>
          )}
          <div className="text-[15.5px] font-extrabold tracking-[0.2px] text-[#3a324a]">
            {aw.venue}
          </div>
        </div>
        {!aw.eventless && aw.eventName && (
          <div className="mt-[2px] text-[12px] text-[#3a324a8c]">
            {aw.eventName}
          </div>
        )}
        {aw.eventless && aw.note && (
          <div className="mt-[2px] text-[11.5px] text-[#3a324a8c]">
            {aw.note}
          </div>
        )}
      </div>

      {/* メタ行 */}
      <div className="flex flex-col gap-1 px-[14px] pb-[6px] pt-[10px]">
        <Meta icon="time">{timeLabel}</Meta>
        <Meta icon="pin">
          半径 {formatRadius(aw.radiusM)} 内 ·{" "}
          {aw.eventless ? "エリア内" : "会場周辺"}
        </Meta>
        <Meta icon="hand">
          {aw.eventless
            ? "時間内で柔軟に動けます"
            : "会場近くで手渡し / 動けます"}
        </Meta>
      </div>

      {/* アクティブ時：統計 + アクション */}
      {isActive && (
        <>
          <div className="flex border-t-[0.5px] border-[#a695d833] bg-white/50">
            <Stat v="14" label="完全マッチ" />
            <Divider />
            <Stat v="2" label="打診中" />
            <Divider />
            <Stat
              v={`${Math.max(0, Math.floor((new Date(aw.endAt).getTime() - Date.now()) / 60000))}分`}
              label="クローズ通知まで"
              tone="#f3c5d4"
            />
          </div>
          <div className="flex gap-1.5 border-t-[0.5px] border-[#a695d822] px-[14px] py-[10px]">
            <button
              type="button"
              onClick={() => onToggle(aw.id, "disabled")}
              className="flex-1 rounded-[10px] bg-[#f3c5d426] py-2.5 text-[12px] font-bold text-[#3a324a]"
            >
              一時無効
            </button>
            <Link
              href={`/aw`}
              className="flex flex-1 items-center justify-center rounded-[10px] bg-[#a695d81f] py-2.5 text-[12px] font-bold text-[#a695d8]"
            >
              編集
            </Link>
            <button
              type="button"
              disabled
              className="flex flex-1 items-center justify-center gap-1 rounded-[10px] bg-black py-2.5 text-[12px] font-bold text-white opacity-60"
            >
              <span
                className="text-[13px] font-extrabold"
                style={{ fontFamily: '"Inter Tight", sans-serif' }}
              >
                X
              </span>
              告知
            </button>
          </div>
        </>
      )}

      {/* scheduled / disabled 時：軽いアクション */}
      {!isActive && derived !== "archived" && (
        <div className="flex gap-1.5 px-[14px] pb-[12px] pt-[6px]">
          {isDisabled ? (
            <button
              type="button"
              onClick={() => onToggle(aw.id, "enabled")}
              className="flex-1 rounded-[10px] bg-[#a695d81f] py-2 text-[11px] font-bold text-[#a695d8]"
            >
              再有効化
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(aw.id, "disabled")}
              className="flex-1 rounded-[10px] bg-[#3a324a08] py-2 text-[11px] font-bold text-[#3a324a]"
            >
              一時無効
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({
  icon,
  children,
}: {
  icon: "time" | "pin" | "hand";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[7px] text-[11.5px] text-[#3a324a]">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="#3a324a8c"
        strokeWidth="1.2"
      >
        {icon === "time" && (
          <>
            <circle cx="6" cy="6" r="4.5" />
            <path d="M6 3v3l2 1" strokeLinecap="round" />
          </>
        )}
        {icon === "pin" && (
          <>
            <path d="M6 1.2c-2.4 0-4 1.7-4 4 0 2.7 4 5.6 4 5.6s4-2.9 4-5.6c0-2.3-1.6-4-4-4z" />
            <circle cx="6" cy="5.2" r="1.2" />
          </>
        )}
        {icon === "hand" && (
          <path
            d="M3 6V4c0-.6.4-1 1-1s1 .4 1 1v2M5 6V3.5c0-.6.4-1 1-1s1 .4 1 1V6M7 6V4c0-.6.4-1 1-1s1 .4 1 1v3.5c0 1.5-1.3 3-3 3-1.7 0-3-1.5-3-3.5V6c0-.6-.4-1-1-1"
            strokeLinecap="round"
          />
        )}
      </svg>
      {children}
    </div>
  );
}

function Stat({
  v,
  label,
  tone,
}: {
  v: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center py-2">
      <span
        className="text-[17px] font-extrabold tabular-nums tracking-[0.2px]"
        style={{ color: tone ?? "#a695d8" }}
      >
        {v}
      </span>
      <span className="text-[10px] text-[#3a324a8c]">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px bg-[#a695d833]" />;
}
