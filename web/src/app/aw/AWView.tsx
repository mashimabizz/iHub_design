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

function formatTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(s)} 〜 ${fmt(e)}`;
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
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* ヘッダー */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-2.5 pt-12">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
              AW · 合流可能枠
            </h1>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Availability Window — 場所 × 時間 × 半径
            </p>
          </div>
          <Link
            href="/aw/new"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3.5 text-[12px] font-bold text-white shadow-[0_4px_10px_rgba(166,149,216,0.4)] transition-all duration-150 active:scale-[0.97]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M5.5 1v9M1 5.5h9" />
            </svg>
            AWを追加
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-3.5">
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
          <div className={grouped.active.length > 0 ? "mt-4" : ""}>
            <SectionHeading>
              SCHEDULED
              <span className="ml-1.5 text-[10px] font-extrabold text-gray-500">
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
          <div className={grouped.active.length || grouped.scheduled.length ? "mt-4" : ""}>
            <SectionHeading>
              自動アーカイブ
              <span className="ml-1.5 text-[10px] font-extrabold text-gray-500">
                · {grouped.past.length}
              </span>
            </SectionHeading>
            <div className="rounded-2xl border border-[#3a324a14] bg-white opacity-75">
              {grouped.past.slice(0, 5).map((aw, i, arr) => (
                <div
                  key={aw.id}
                  className={`flex items-center gap-2.5 px-3 py-2 ${
                    i < arr.length - 1
                      ? "border-b border-[#3a324a14]"
                      : ""
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#3a324a08] text-[10px] font-bold text-gray-500">
                    済
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-gray-900 truncate">
                      {aw.venue}
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-500">
                      {formatDate(aw.startAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(aw.id)}
                    className="text-[10px] text-gray-400 hover:text-red-500"
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
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
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
    <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] font-extrabold tracking-wider text-gray-500">
      {pulse && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
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

  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        isActive
          ? "border-[1.5px] border-[#a695d8aa] bg-[linear-gradient(135deg,#a695d81c,#a8d4e624)] shadow-[0_8px_20px_rgba(166,149,216,0.25)]"
          : "border-[0.5px] border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]"
      } ${isDisabled ? "opacity-60" : ""}`}
    >
      {/* ヘッダーストリップ */}
      <div className="flex items-center gap-2 px-3.5 pb-2 pt-2.5">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9.5px] font-extrabold tracking-wider text-white">
            <span className="h-1 w-1 rounded-full bg-white" />
            LIVE
          </span>
        ) : isDisabled ? (
          <span className="rounded-full bg-[#f3c5d4] px-2 py-0.5 text-[9.5px] font-extrabold text-white">
            一時無効
          </span>
        ) : (
          <span className="rounded-full bg-[#3a324a08] px-2 py-0.5 text-[9.5px] font-extrabold tracking-wider text-gray-500">
            予定
          </span>
        )}
        <div className="flex-1 text-[11px] font-semibold text-gray-500">
          {formatDate(aw.startAt)}
        </div>
        <button
          type="button"
          onClick={() => onDelete(aw.id)}
          className="text-[10px] text-gray-400 hover:text-red-500"
        >
          削除
        </button>
      </div>

      {/* 場所 + イベント */}
      <div className="px-3.5">
        <div className="flex items-center gap-1.5">
          {aw.eventless && (
            <span className="rounded-md bg-[#3a324a08] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-gray-500">
              合流可能枠
            </span>
          )}
          <div className="text-[15.5px] font-extrabold text-gray-900">
            {aw.venue}
          </div>
        </div>
        {!aw.eventless && aw.eventName && (
          <div className="mt-0.5 text-[12px] text-gray-500">
            {aw.eventName}
          </div>
        )}
        {aw.eventless && aw.note && (
          <div className="mt-0.5 text-[11.5px] text-gray-500">{aw.note}</div>
        )}
      </div>

      {/* メタ行 */}
      <div className="flex flex-col gap-1 px-3.5 pb-2 pt-2.5">
        <Meta icon="time">{formatTimeRange(aw.startAt, aw.endAt)}</Meta>
        <Meta icon="pin">
          半径 {aw.radiusM}m 内 ·{" "}
          {aw.eventless ? "エリア内" : "会場周辺"}
        </Meta>
      </div>

      {/* アクション（active のみ） */}
      {isActive && (
        <>
          <div className="flex border-t border-[#a695d833] bg-white/50">
            <Stat v="—" label="完全マッチ" />
            <Divider />
            <Stat v="—" label="打診中" />
            <Divider />
            <Stat
              v={`${Math.max(0, Math.floor((new Date(aw.endAt).getTime() - Date.now()) / 60000))}分`}
              label="クローズまで"
              tone="#f3c5d4"
            />
          </div>
          <div className="flex gap-1.5 border-t border-[#a695d822] p-2.5">
            <button
              type="button"
              onClick={() => onToggle(aw.id, "disabled")}
              className="flex-1 rounded-[10px] bg-[#f3c5d426] py-2 text-[12px] font-bold text-gray-900"
            >
              一時無効
            </button>
            <Link
              href={`/aw`}
              className="flex flex-1 items-center justify-center rounded-[10px] bg-[#a695d81f] py-2 text-[12px] font-bold text-[#a695d8]"
            >
              編集
            </Link>
            <button
              type="button"
              disabled
              className="flex flex-1 items-center justify-center gap-1 rounded-[10px] bg-black py-2 text-[12px] font-bold text-white opacity-60"
            >
              <span style={{ fontFamily: '"Inter Tight", sans-serif' }}>X</span>
              告知
            </button>
          </div>
        </>
      )}

      {/* disabled / scheduled の場合のアクション */}
      {!isActive && derived !== "archived" && (
        <div className="flex gap-1.5 px-3.5 pb-3 pt-1">
          {isDisabled ? (
            <button
              type="button"
              onClick={() => onToggle(aw.id, "enabled")}
              className="flex-1 rounded-[10px] bg-[#a695d81f] py-1.5 text-[11px] font-bold text-[#a695d8]"
            >
              再有効化
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(aw.id, "disabled")}
              className="flex-1 rounded-[10px] bg-[#3a324a08] py-1.5 text-[11px] font-bold text-gray-700"
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
    <div className="flex items-center gap-1.5 text-[11.5px] text-gray-700">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        {icon === "time" && (
          <>
            <circle cx="6" cy="6" r="4.5" stroke="#6b6478" strokeWidth="1.2" />
            <path
              d="M6 3v3l2 1"
              stroke="#6b6478"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </>
        )}
        {icon === "pin" && (
          <>
            <path
              d="M6 1.2c-2.4 0-4 1.7-4 4 0 2.7 4 5.6 4 5.6s4-2.9 4-5.6c0-2.3-1.6-4-4-4z"
              stroke="#6b6478"
              strokeWidth="1.2"
              fill="none"
            />
            <circle cx="6" cy="5.2" r="1.2" stroke="#6b6478" strokeWidth="1.2" />
          </>
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
    <div className="flex flex-1 flex-col items-center gap-0.5 py-2">
      <span
        className="text-[13px] font-extrabold tabular-nums"
        style={{ color: tone ?? "#1a1a26" }}
      >
        {v}
      </span>
      <span className="text-[9.5px] text-gray-500">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="w-px bg-[#a695d833]" />;
}
