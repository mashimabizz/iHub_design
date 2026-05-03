"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteSchedule } from "./actions";

export type ScheduleItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  note: string | null;
};

function fmtDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const date = `${d.getMonth() + 1}/${d.getDate()} (${wd})`;
  if (allDay) return date;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function fmtRange(startISO: string, endISO: string, allDay: boolean): string {
  if (allDay) {
    const sd = new Date(startISO);
    const ed = new Date(endISO);
    if (
      sd.getFullYear() === ed.getFullYear() &&
      sd.getMonth() === ed.getMonth() &&
      sd.getDate() === ed.getDate()
    ) {
      return `${fmtDate(startISO, true)} 終日`;
    }
    return `${fmtDate(startISO, true)} 〜 ${fmtDate(endISO, true)}`;
  }
  const start = fmtDate(startISO, false);
  const ed = new Date(endISO);
  const sd = new Date(startISO);
  const sameDay =
    sd.getFullYear() === ed.getFullYear() &&
    sd.getMonth() === ed.getMonth() &&
    sd.getDate() === ed.getDate();
  if (sameDay) {
    return `${start} 〜 ${String(ed.getHours()).padStart(2, "0")}:${String(ed.getMinutes()).padStart(2, "0")}`;
  }
  return `${start} 〜 ${fmtDate(endISO, false)}`;
}

export function SchedulesView({ items }: { items: ScheduleItem[] }) {
  const router = useRouter();

  async function handleDelete(id: string, title: string) {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    const r = await deleteSchedule(id);
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-[#3a324a8c]">
        まだ予定がありません
        <br />
        <Link
          href="/schedules/new"
          className="mt-2 inline-block font-bold text-[#a695d8]"
        >
          + 予定を追加 →
        </Link>
      </div>
    );
  }

  // 過去・今後で分割
  const now = Date.now();
  const upcoming = items.filter((i) => new Date(i.endAt).getTime() >= now);
  const past = items.filter((i) => new Date(i.endAt).getTime() < now);

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <Section label="今後の予定" count={upcoming.length}>
          {upcoming.map((s) => (
            <ScheduleCard
              key={s.id}
              item={s}
              onDelete={() => handleDelete(s.id, s.title)}
            />
          ))}
        </Section>
      )}
      {past.length > 0 && (
        <Section label="過去" count={past.length} dim>
          {past.slice(0, 10).map((s) => (
            <ScheduleCard
              key={s.id}
              item={s}
              onDelete={() => handleDelete(s.id, s.title)}
              dim
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  count,
  dim,
  children,
}: {
  label: string;
  count: number;
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-extrabold tracking-[0.7px] text-[#3a324a8c]">
        {label}
        <span className="text-[10px] text-[#3a324a8c]">· {count}</span>
      </div>
      <div className={`space-y-2 ${dim ? "opacity-70" : ""}`}>{children}</div>
    </div>
  );
}

function ScheduleCard({
  item,
  onDelete,
  dim,
}: {
  item: ScheduleItem;
  onDelete: () => void;
  dim?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#3a324a0f] bg-white p-3.5 shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4">
            <rect x="2" y="3" width="12" height="11" rx="1.5" />
            <path d="M5 1.5v3M11 1.5v3M2 7h12" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold text-gray-900">
            {item.title}
            {dim && (
              <span className="ml-2 rounded-full bg-[#3a324a08] px-1.5 py-0.5 text-[9px] font-bold text-[#3a324a8c]">
                済
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10.5px] tabular-nums text-[#3a324a8c]">
            {fmtRange(item.startAt, item.endAt, item.allDay)}
          </div>
          {item.note && (
            <div className="mt-1 text-[11px] text-gray-700">{item.note}</div>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col gap-1.5">
          <Link
            href={`/schedules/${item.id}`}
            className="rounded-[8px] border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#a695d8]"
          >
            編集
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-[8px] border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a8c]"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
