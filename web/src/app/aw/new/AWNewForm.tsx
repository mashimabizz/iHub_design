"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAW } from "@/app/aw/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

const RADIUS_OPTIONS = [200, 500, 1000, 2000];

function nowLocalISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function plusHoursLocalISO(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AWNewForm() {
  const router = useRouter();
  const [eventless, setEventless] = useState(false);
  const [venue, setVenue] = useState("");
  const [eventName, setEventName] = useState("");
  const [startAt, setStartAt] = useState(nowLocalISO());
  const [endAt, setEndAt] = useState(plusHoursLocalISO(2));
  const [radiusM, setRadiusM] = useState(500);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/aw");
  }, [router]);

  async function handleSubmit() {
    if (!venue.trim()) {
      setError("会場名を入力してください");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveAW({
      venue: venue.trim(),
      eventName: eventless ? undefined : eventName.trim() || undefined,
      eventless,
      startAt,
      endAt,
      radiusM,
      note: note.trim() || undefined,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/aw");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* タイプ切替 */}
      <Section label="タイプ">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEventless(false)}
            className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
              !eventless
                ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            🎤 イベント参戦
          </button>
          <button
            type="button"
            onClick={() => setEventless(true)}
            className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
              eventless
                ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            📍 合流可能枠
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
          {eventless
            ? "イベント無しで「ここで時間内に動ける」枠"
            : "ライブ・物販イベントなどに合わせた合流枠"}
        </p>
      </Section>

      {/* 場所 */}
      <Section label="場所">
        <Field label="会場 / エリア名" required>
          <input
            type="text"
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder={
              eventless ? "例: 渋谷駅周辺" : "例: 横浜アリーナ"
            }
            maxLength={100}
            className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
          />
        </Field>

        <div className="mt-2.5">
          <Field label="半径">
            <div className="flex flex-wrap gap-1.5">
              {RADIUS_OPTIONS.map((r) => {
                const active = radiusM === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusM(r)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                      active
                        ? "bg-[#a695d8] text-white"
                        : "border border-[#3a324a14] bg-white text-gray-700"
                    }`}
                  >
                    {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="mt-3 block w-full"
            />
            <div className="mt-1 text-[11px] tabular-nums text-gray-500">
              現在: {radiusM}m
            </div>
          </Field>
        </div>
      </Section>

      {/* イベント名（イベント参戦時のみ） */}
      {!eventless && (
        <Section label="イベント">
          <Field label="イベント名" hint="（任意）">
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="例: LUMENA WORLD TOUR DAY 2"
              maxLength={100}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
        </Section>
      )}

      {/* 時間 */}
      <Section label="時間">
        <div className="space-y-2.5">
          <Field label="開始" required>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
          <Field label="終了" required>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {/* メモ */}
      <Section label="メモ" hint={`${note.length} / 200`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={
            eventless
              ? "例: 近場で柔軟に交換できます · 動けます"
              : "例: 開演前30分が交換タイム"
          }
          maxLength={200}
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="登録中...">
        AW を追加
      </PrimaryButton>
    </form>
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
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-gray-500">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
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
      <div className="mb-1.5 block text-sm font-bold text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && (
          <span className="ml-1 text-[11px] font-medium text-gray-500">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
