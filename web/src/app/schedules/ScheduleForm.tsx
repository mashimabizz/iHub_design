"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createSchedule, updateSchedule } from "./actions";

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function plusHoursLocal(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ScheduleForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    note: string | null;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startAt, setStartAt] = useState(
    initial ? isoToLocal(initial.startAt) : isoToLocal(new Date().toISOString()),
  );
  const [endAt, setEndAt] = useState(
    initial ? isoToLocal(initial.endAt) : plusHoursLocal(2),
  );
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/schedules");
  }, [router]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createSchedule({
              title,
              startAt,
              endAt,
              allDay,
              note: note || undefined,
            })
          : await updateSchedule({
              id: initial!.id,
              title,
              startAt,
              endAt,
              allDay,
              note: note || undefined,
            });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/schedules");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      <Section label="タイトル" required>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="例: 出張・友人ランチ・ライブ参戦"
          className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      <Section label="日時" required>
        <label className="mb-2 flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#a695d8] focus:ring-[#a695d8]"
          />
          終日
        </label>
        <div className="space-y-2">
          <Field label="開始">
            <input
              type={allDay ? "date" : "datetime-local"}
              required
              value={allDay ? startAt.slice(0, 10) : startAt}
              onChange={(e) =>
                setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)
              }
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
          <Field label="終了">
            <input
              type={allDay ? "date" : "datetime-local"}
              required
              value={allDay ? endAt.slice(0, 10) : endAt}
              onChange={(e) =>
                setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)
              }
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      <Section label="メモ" hint={`${note.length} / 500`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="補足メモ（任意）"
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="保存中…">
        {mode === "create" ? "予定を追加" : "変更を保存"}
      </PrimaryButton>
    </form>
  );
}

function Section({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-[#3a324a8c]">{label}</div>
      {children}
    </div>
  );
}
