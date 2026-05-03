"use client";

/**
 * iter70-B：打診中の「カレンダー重ね表示」モーダル。
 *
 * 自分 + 相手の AW（合流可能枠）+ schedules（個人予定）を
 * 週カレンダー形式（7 日 × 時間軸）で重ねて表示する。
 *
 * 相手のデータは proposals.expose_calendar=true な打診経由のみ閲覧可能
 * （RLS が "Calendar disclosure: counterpart can read" で担保）
 *
 * 簡略実装：
 * - 表示範囲：今日〜+13日（2週間ぶん）
 * - 1 日 1 列、時間軸 6:00〜26:00（深夜 2 時まで）
 * - 自分 = 紫系 / 相手 = ピンク系 / AW = 実線塗り / 個人予定 = 斜線
 * - タップで詳細（時刻 + タイトル + 場所）を下部に表示
 */

import { useEffect, useMemo, useState } from "react";

export type CalEvent = {
  id: string;
  /** 'aw' | 'schedule' */
  kind: "aw" | "schedule";
  /** 'me' | 'partner' */
  side: "me" | "partner";
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  venue?: string | null;
  note?: string | null;
};

const HOUR_START = 6; // 6:00
const HOUR_END = 26; // 26:00 = 翌 2:00
const HOUR_PX = 28; // 1 時間 = 28px
const DAY_W = 92; // 1 日列幅
const HEADER_H = 38; // 日付ヘッダ高さ
const TIME_COL_W = 36; // 左の時刻ラベル列幅

export function CalendarOverlayModal({
  events,
  partnerHandle,
  exposed,
  onClose,
}: {
  events: CalEvent[];
  partnerHandle: string;
  /** 相手がカレンダーを公開しているか（false なら相手側を「非公開」表示） */
  exposed: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<CalEvent | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // 14 日分の日付配列
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  // 各日付に対応するイベントを抽出
  function eventsForDay(day: Date): CalEvent[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return events.filter((e) => {
      const s = new Date(e.startAt);
      const x = new Date(e.endAt);
      return s <= dayEnd && x >= dayStart;
    });
  }

  // イベントを「特定の日のオフセット位置 (top, height)」に変換
  function eventBox(ev: CalEvent, day: Date): {
    top: number;
    height: number;
  } | null {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const s = new Date(ev.startAt);
    const x = new Date(ev.endAt);
    // この日に重なる範囲だけを切り出す
    const dayHourStart = new Date(day);
    dayHourStart.setHours(HOUR_START, 0, 0, 0);
    const dayHourEnd = new Date(day);
    dayHourEnd.setHours(0, 0, 0, 0);
    dayHourEnd.setHours(HOUR_END);
    const startIso = s < dayHourStart ? dayHourStart : s;
    const endIso = x > dayHourEnd ? dayHourEnd : x;
    if (endIso <= startIso) return null;
    const startH =
      (startIso.getTime() - dayHourStart.getTime()) / (60 * 60 * 1000);
    const durH = (endIso.getTime() - startIso.getTime()) / (60 * 60 * 1000);
    return {
      top: startH * HOUR_PX,
      height: Math.max(durH * HOUR_PX, 14), // 最小 14px
    };
  }

  const totalHeight = (HOUR_END - HOUR_START) * HOUR_PX;

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="m-auto flex max-h-[92vh] w-[96%] max-w-[720px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダ */}
        <div className="flex items-center justify-between border-b border-[#3a324a14] bg-white px-4 py-3">
          <div>
            <div className="text-[14px] font-bold text-[#3a324a]">
              📅 カレンダー（重ね表示）
            </div>
            <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#a695d822] px-1.5 py-[1px] font-bold text-[#a695d8]">
                ● あなた
              </span>
              <span className="mx-1.5 text-[#3a324a4d]">/</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] font-bold ${
                  exposed
                    ? "bg-[#f3c5d422] text-[#cc7592]"
                    : "bg-[#3a324a08] text-[#3a324a8c]"
                }`}
              >
                ● @{partnerHandle}
                {!exposed && "（非公開）"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a324a08] text-[16px] font-bold text-[#3a324a8c]"
          >
            ✕
          </button>
        </div>

        {/* カレンダー本体 — 横スクロール */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左：時刻列（固定） */}
          <div
            className="flex-shrink-0 border-r border-[#3a324a14] bg-[#fbf9fc]"
            style={{ width: TIME_COL_W }}
          >
            <div style={{ height: HEADER_H }} />
            <div
              className="relative"
              style={{ height: totalHeight }}
            >
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 px-1 text-[8.5px] tabular-nums text-[#3a324a8c]"
                  style={{
                    top: i * HOUR_PX - 5,
                    height: HOUR_PX,
                  }}
                >
                  {((HOUR_START + i) % 24).toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* 右：日付列（スクロール） */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="relative" style={{ width: days.length * DAY_W }}>
              {/* 日付ヘッダ */}
              <div
                className="sticky top-0 z-10 flex border-b border-[#3a324a14] bg-white"
                style={{ height: HEADER_H }}
              >
                {days.map((d) => {
                  const isToday =
                    d.getFullYear() === today.getFullYear() &&
                    d.getMonth() === today.getMonth() &&
                    d.getDate() === today.getDate();
                  const dow = "日月火水木金土"[d.getDay()];
                  return (
                    <div
                      key={d.toISOString()}
                      className="flex flex-shrink-0 flex-col items-center justify-center border-r border-[#3a324a08] py-1"
                      style={{ width: DAY_W }}
                    >
                      <div
                        className={`text-[10px] font-bold ${
                          isToday ? "text-[#a695d8]" : "text-[#3a324a8c]"
                        }`}
                      >
                        {d.getMonth() + 1}/{d.getDate()}
                        <span
                          className={`ml-1 ${
                            d.getDay() === 0
                              ? "text-red-500"
                              : d.getDay() === 6
                                ? "text-blue-500"
                                : ""
                          }`}
                        >
                          ({dow})
                        </span>
                      </div>
                      {isToday && (
                        <span className="mt-0.5 rounded-full bg-[#a695d8] px-1.5 py-[1px] text-[8px] font-extrabold text-white">
                          今日
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* グリッド */}
              <div className="flex" style={{ height: totalHeight }}>
                {days.map((d) => {
                  const dayEvents = eventsForDay(d);
                  return (
                    <div
                      key={d.toISOString()}
                      className="relative flex-shrink-0 border-r border-[#3a324a08]"
                      style={{ width: DAY_W, height: totalHeight }}
                    >
                      {/* 時刻区切り線 */}
                      {Array.from(
                        { length: HOUR_END - HOUR_START },
                        (_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-t border-dashed border-[#3a324a08]"
                            style={{ top: i * HOUR_PX }}
                          />
                        ),
                      )}

                      {/* イベント box（自分は左半分・相手は右半分） */}
                      {dayEvents.map((ev) => {
                        const box = eventBox(ev, d);
                        if (!box) return null;
                        const isMe = ev.side === "me";
                        const isAW = ev.kind === "aw";
                        const baseColor = isMe ? "#a695d8" : "#cc7592";
                        const bg = isMe
                          ? isAW
                            ? "rgba(166,149,216,0.85)"
                            : "rgba(166,149,216,0.20)"
                          : isAW
                            ? "rgba(204,117,146,0.85)"
                            : "rgba(204,117,146,0.20)";
                        const stripe = !isAW
                          ? `repeating-linear-gradient(135deg, ${bg} 0 4px, ${isMe ? "rgba(166,149,216,0.10)" : "rgba(204,117,146,0.10)"} 4px 8px)`
                          : bg;
                        const isSelected = selected?.id === ev.id;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(isSelected ? null : ev);
                            }}
                            className="absolute overflow-hidden rounded-[4px] border text-left text-[8.5px] font-bold leading-tight transition-all"
                            style={{
                              top: box.top,
                              height: box.height,
                              left: isMe ? 1 : DAY_W / 2,
                              width: DAY_W / 2 - 2,
                              borderColor: baseColor,
                              borderWidth: isSelected ? 1.5 : 0.5,
                              background: stripe,
                              color: isAW ? "#fff" : baseColor,
                              boxShadow: isSelected
                                ? `0 4px 12px ${baseColor}55`
                                : undefined,
                              padding: "1px 2px",
                            }}
                            title={`${ev.title} ${formatRange(ev.startAt, ev.endAt)}`}
                          >
                            <div className="truncate">{ev.title}</div>
                            <div className="truncate text-[7.5px] opacity-80">
                              {formatHour(ev.startAt)}〜
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 凡例 + 詳細 */}
        <div className="border-t border-[#3a324a14] bg-[#fbf9fc] px-4 py-2">
          {selected ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#3a324a]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: selected.side === "me" ? "#a695d8" : "#cc7592",
                  }}
                />
                <span>
                  [{selected.kind === "aw" ? "AW" : "予定"}] {selected.title}
                </span>
                <span className="text-[10px] font-normal text-[#3a324a8c]">
                  · {selected.side === "me" ? "あなた" : `@${partnerHandle}`}
                </span>
              </div>
              <div className="text-[10.5px] tabular-nums text-[#3a324a8c]">
                {formatRange(selected.startAt, selected.endAt)}
              </div>
              {selected.venue && (
                <div className="text-[10.5px] text-[#3a324a]">
                  📍 {selected.venue}
                </div>
              )}
              {selected.note && (
                <div className="text-[10.5px] text-[#3a324a]">
                  💬 {selected.note}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10.5px] leading-relaxed text-[#3a324a8c]">
              タップで詳細表示。塗り = AW（合流可能枠）／ 斜線 = 個人予定。
              {!exposed && (
                <>
                  {" "}
                  <span className="text-amber-600">
                    @{partnerHandle} はカレンダー非公開のため自分側のみ表示
                  </span>
                </>
              )}
            </div>
          )}
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
    : `${dateFmt(s)} ${timeFmt(s)} 〜 ${dateFmt(e)} ${timeFmt(e)}`;
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
