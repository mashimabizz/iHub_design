"use client";

import { useMemo } from "react";

/**
 * カレンダー重ね見コンポーネント。
 *
 * 自分と相手の AW（活動予定）を同じタイムラインに重ねて表示し、
 * 重なる時間帯をハイライトする。
 *
 * 仕様: notes/18 §B-4, notes/09 §9
 *
 * 公開条件は呼び出し側で判定（proposals.expose_calendar = true かつ
 * 取引未完了）。本コンポーネントは表示のみ責務。
 *
 * iter67-68 で打診画面が実装された時に使用する。
 */

export type AWBlock = {
  id: string;
  startAt: string; // ISO
  endAt: string;
  venue?: string;
  eventName?: string | null;
};

type Props = {
  myAWs: AWBlock[];
  partnerAWs: AWBlock[];
  /** 表示日数（default: 7） */
  days?: number;
  /** 開始日（default: 今日） */
  fromDate?: Date;
  /** 自分の AW 色 */
  myColor?: string;
  /** 相手の AW 色 */
  partnerColor?: string;
  /** 重なり時のハイライト色 */
  overlapColor?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const VIEW_START_HOUR = 8;
const VIEW_END_HOUR = 24;
const VIEW_HOURS = VIEW_END_HOUR - VIEW_START_HOUR; // 16
const ROW_HEIGHT_PX = 480; // タイムライン縦幅（1日あたり）
const PX_PER_HOUR = ROW_HEIGHT_PX / VIEW_HOURS;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDay(d: Date): string {
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (${wd})`;
}

function blockOnDay(
  block: AWBlock,
  dayStart: Date,
): { topPx: number; heightPx: number } | null {
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const blockStart = new Date(block.startAt);
  const blockEnd = new Date(block.endAt);

  // 当日の表示範囲（VIEW_START〜VIEW_END）と AW の時間が重なるか
  const viewStart = new Date(dayStart);
  viewStart.setHours(VIEW_START_HOUR, 0, 0, 0);
  const viewEnd = new Date(dayStart);
  viewEnd.setHours(VIEW_END_HOUR, 0, 0, 0);

  const start = blockStart < dayStart ? dayStart : blockStart;
  const end = blockEnd > dayEnd ? dayEnd : blockEnd;
  if (end <= viewStart || start >= viewEnd) return null;

  const clampedStart = start < viewStart ? viewStart : start;
  const clampedEnd = end > viewEnd ? viewEnd : end;

  const offsetHours =
    (clampedStart.getTime() - viewStart.getTime()) / HOUR_MS;
  const lengthHours =
    (clampedEnd.getTime() - clampedStart.getTime()) / HOUR_MS;

  return {
    topPx: offsetHours * PX_PER_HOUR,
    heightPx: Math.max(8, lengthHours * PX_PER_HOUR),
  };
}

export function CalendarOverlay({
  myAWs,
  partnerAWs,
  days = 7,
  fromDate = new Date(),
  myColor = "#a695d8",
  partnerColor = "#f3c5d4",
  overlapColor = "#e0a847",
}: Props) {
  const dayList = useMemo(() => {
    const start = startOfDay(fromDate);
    return Array.from({ length: days }).map(
      (_, i) => new Date(start.getTime() + i * DAY_MS),
    );
  }, [fromDate, days]);

  const hourLabels = useMemo(() => {
    const labels: number[] = [];
    for (let h = VIEW_START_HOUR; h <= VIEW_END_HOUR; h += 2) labels.push(h);
    return labels;
  }, []);

  return (
    <div className="rounded-2xl border border-[#3a324a14] bg-white p-3">
      {/* Legend */}
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[10.5px] text-gray-600">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: myColor }}
          />
          自分
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: partnerColor }}
          />
          相手
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: overlapColor }}
          />
          重なり（時空交差）
        </div>
      </div>

      {/* Timeline grid */}
      <div className="flex">
        {/* Hour ruler */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 32, height: ROW_HEIGHT_PX }}
        >
          {hourLabels.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 text-right text-[9.5px] text-gray-400 tabular-nums"
              style={{
                top: (h - VIEW_START_HOUR) * PX_PER_HOUR - 5,
              }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Day columns (scrollable) */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex" style={{ minWidth: days * 80 }}>
            {dayList.map((day) => {
              const myBlocks = myAWs
                .map((aw) => ({ aw, pos: blockOnDay(aw, day) }))
                .filter((x) => x.pos !== null) as Array<{
                aw: AWBlock;
                pos: { topPx: number; heightPx: number };
              }>;
              const partnerBlocks = partnerAWs
                .map((aw) => ({ aw, pos: blockOnDay(aw, day) }))
                .filter((x) => x.pos !== null) as Array<{
                aw: AWBlock;
                pos: { topPx: number; heightPx: number };
              }>;
              return (
                <div
                  key={day.toISOString()}
                  className="relative flex-1 border-l border-[#3a324a08]"
                  style={{ minWidth: 80, height: ROW_HEIGHT_PX }}
                >
                  {/* Day header */}
                  <div
                    className="sticky top-0 z-10 mb-1 border-b border-[#3a324a08] bg-white pb-1 text-center text-[10px] font-bold text-gray-700"
                    style={{ height: 22, lineHeight: "20px" }}
                  >
                    {fmtDay(day)}
                  </div>
                  {/* Hour grid lines */}
                  {hourLabels.map((h) => (
                    <div
                      key={h}
                      className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#3a324a08]"
                      style={{
                        top: (h - VIEW_START_HOUR) * PX_PER_HOUR,
                      }}
                    />
                  ))}
                  {/* My blocks */}
                  {myBlocks.map(({ aw, pos }) => (
                    <div
                      key={`me-${aw.id}`}
                      className="absolute left-1 w-[42%] rounded-md text-[8.5px] text-white"
                      style={{
                        top: pos.topPx,
                        height: pos.heightPx,
                        background: myColor,
                        opacity: 0.85,
                      }}
                      title={`自分: ${aw.venue ?? ""} ${aw.eventName ?? ""}`}
                    >
                      <div className="overflow-hidden px-1 leading-tight">
                        {aw.venue}
                      </div>
                    </div>
                  ))}
                  {/* Partner blocks */}
                  {partnerBlocks.map(({ aw, pos }) => (
                    <div
                      key={`pt-${aw.id}`}
                      className="absolute right-1 w-[42%] rounded-md text-[8.5px] text-white"
                      style={{
                        top: pos.topPx,
                        height: pos.heightPx,
                        background: partnerColor,
                        opacity: 0.85,
                      }}
                      title={`相手: ${aw.venue ?? ""} ${aw.eventName ?? ""}`}
                    >
                      <div className="overflow-hidden px-1 leading-tight">
                        {aw.venue}
                      </div>
                    </div>
                  ))}
                  {/* Overlap highlight bands */}
                  {myBlocks.flatMap(({ aw: m, pos: mp }) =>
                    partnerBlocks
                      .map(({ aw: p, pos: pp }) => {
                        const top = Math.max(mp.topPx, pp.topPx);
                        const bottom = Math.min(
                          mp.topPx + mp.heightPx,
                          pp.topPx + pp.heightPx,
                        );
                        if (bottom <= top) return null;
                        return (
                          <div
                            key={`ov-${m.id}-${p.id}`}
                            className="pointer-events-none absolute inset-x-0 border-y-2"
                            style={{
                              top,
                              height: bottom - top,
                              background: `${overlapColor}33`,
                              borderColor: overlapColor,
                            }}
                          />
                        );
                      })
                      .filter(Boolean),
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
