"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAW } from "@/app/aw/actions";

/**
 * モックアップ aw-edit.jsx AWEditLocationLed (693-998) 準拠。
 *
 * 構成:
 *   1. 上部 360px の地図プレースホルダ（SVG ハッチ + 道路）
 *      - 上部ヘッダー: × / 検索バー / GPS
 *      - 中央: 半径サークル + ピン
 *      - 右上: 半径バッジ
 *      - 下: 会場ラベル
 *      - 左上: キャッシュバッジ
 *   2. ボトムシート（rounded-t-[22] 影 0 -10px 30px）
 *      - drag handle
 *      - 半径スライダー（prominent）
 *      - このエリアの近日イベント（任意・加点要素）
 *        - 「イベントなしで設定」がデフォルト選択
 *        - モックの 3 件 + 「イベントを追加」
 *      - 有効時間チップ: いま, 15分後, 30分後, 19:00, 19:30
 *      - 終了時刻表示
 *      - 今すぐ交換 / 動けます トグル
 *   3. 下部 CTA: 「有効化 — 時空交差 ◯件」
 */

// 近日のモックイベント（実装は後続 iter で master 化）
type MockEvent = {
  d: string;
  date: string;
  name: string;
  t: string;
  k: string;
  start: () => string;
  end: () => string;
  venue: string;
};

const MOCK_EVENTS: MockEvent[] = [
  {
    d: "今日",
    date: "4/27",
    name: "LUMENA WORLD TOUR DAY 2",
    t: "開演 18:00",
    k: "横浜アリーナ",
    venue: "横浜アリーナ",
    start: () => atTime(18, 0),
    end: () => atTime(21, 30),
  },
  {
    d: "今日",
    date: "4/27",
    name: "STAR Fan Meeting",
    t: "開演 19:00",
    k: "横浜BUNTAI",
    venue: "横浜BUNTAI",
    start: () => atTime(19, 0),
    end: () => atTime(21, 0),
  },
  {
    d: "明日",
    date: "4/28",
    name: "AURORA POP-UP STORE",
    t: "11:00 - 20:00",
    k: "横浜駅西口",
    venue: "横浜駅西口",
    start: () => atTime(11, 0, 1),
    end: () => atTime(20, 0, 1),
  },
];

function atTime(h: number, m: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function plusMinutes(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isoToLocalDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function LocationLedForm() {
  const router = useRouter();

  const [venue, setVenue] = useState("");
  const [radiusM, setRadiusM] = useState(500);
  const [eventIdx, setEventIdx] = useState<number | null>(null); // null = イベントなし
  const [startAt, setStartAt] = useState(() => new Date().toISOString());
  const [endAt, setEndAt] = useState(() => plusMinutes(120));
  const [activeChip, setActiveChip] = useState<string>("now");
  const [express, setExpress] = useState(true);
  const [mobile, setMobile] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    router.prefetch("/aw");
  }, [router]);

  const radiusLabel = useMemo(
    () => (radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)}km` : `${radiusM}m`),
    [radiusM],
  );

  // 半径サークル直径（モックの r = min(60, 12 + radius/30) と同じ計算）
  // 地図は 360px height、200px の固定サイズで描画
  // chosen event
  const chosenEvent = eventIdx === null ? null : MOCK_EVENTS[eventIdx] ?? null;

  const applyChip = useCallback((chip: string) => {
    setActiveChip(chip);
    const now = new Date();
    let s = now.getTime();
    let e = s + 120 * 60_000;
    if (chip === "now") {
      // already set
    } else if (chip === "min15") {
      s = now.getTime() + 15 * 60_000;
      e = s + 120 * 60_000;
    } else if (chip === "min30") {
      s = now.getTime() + 30 * 60_000;
      e = s + 120 * 60_000;
    } else if (chip === "h19") {
      const d = new Date();
      s = d.setHours(19, 0, 0, 0);
      e = d.setHours(21, 0, 0, 0);
    } else if (chip === "h1930") {
      const d = new Date();
      s = d.setHours(19, 30, 0, 0);
      e = d.setHours(21, 30, 0, 0);
    }
    setStartAt(new Date(s).toISOString());
    setEndAt(new Date(e).toISOString());
  }, []);

  function selectEvent(idx: number | null) {
    setEventIdx(idx);
    if (idx === null) return;
    const ev = MOCK_EVENTS[idx];
    if (!ev) return;
    setVenue(ev.venue);
    setStartAt(ev.start());
    setEndAt(ev.end());
    setActiveChip("");
  }

  async function handleSubmit() {
    setError(null);
    if (!venue.trim()) {
      setError("場所（会場・エリア名）を入力してください");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }
    setPending(true);
    const result = await saveAW({
      venue: venue.trim(),
      eventName: chosenEvent?.name,
      eventless: chosenEvent === null,
      startAt: isoToLocalDatetimeLocal(startAt),
      endAt: isoToLocalDatetimeLocal(endAt),
      radiusM,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/aw");
  }

  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#fbf9fc] text-[#3a324a]">
      {/* ─── Map Area (360px) ────────────────────────────────────── */}
      <div className="relative h-[360px] flex-shrink-0 overflow-hidden">
        {/* SVG hatch + roads (mockup-faithful) */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 420 360"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0"
        >
          <defs>
            <pattern
              id="awmap-hatch"
              x="0"
              y="0"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="14" height="14" fill="#a8d4e622" />
              <rect width="6" height="14" fill="#a8d4e633" />
            </pattern>
          </defs>
          <rect width="420" height="360" fill="url(#awmap-hatch)" />
          <path
            d="M0 220 Q120 180 220 230 T420 200"
            stroke="#fff"
            strokeWidth="14"
            fill="none"
            opacity="0.9"
          />
          <path
            d="M0 220 Q120 180 220 230 T420 200"
            stroke="#a8d4e666"
            strokeWidth="2"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M120 0 L160 360"
            stroke="#fff"
            strokeWidth="9"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M310 0 L290 360"
            stroke="#fff"
            strokeWidth="6"
            fill="none"
            opacity="0.55"
          />
          <rect x="160" y="40" width="60" height="36" fill="#fff" opacity="0.6" rx="3" />
          <rect x="240" y="60" width="50" height="50" fill="#fff" opacity="0.6" rx="3" />
          <rect x="40" y="240" width="80" height="60" fill="#fff" opacity="0.55" rx="3" />
        </svg>

        {/* Top sheet header overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0))] px-3.5 py-2.5">
          <Link
            href="/aw/new"
            aria-label="戻る"
            className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-[#3a324a14] bg-white shadow-[0_2px_6px_rgba(58,50,74,0.1)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="#3a324a"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <div className="flex flex-1 items-center justify-center px-2">
            <div className="flex w-full items-center gap-1.5 rounded-full border-[0.5px] border-[#3a324a14] bg-white px-3 py-[7px] shadow-[0_2px_6px_rgba(58,50,74,0.1)]">
              <svg width="11" height="11" viewBox="0 0 11 11" className="flex-shrink-0">
                <circle cx="5" cy="5" r="3.5" stroke="#3a324a" strokeWidth="1.4" fill="none" />
                <path d="M8 8l2.5 2.5" stroke="#3a324a" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="会場・場所を検索"
                maxLength={100}
                className="min-w-0 flex-1 border-0 bg-transparent text-[12px] font-bold text-[#3a324a] placeholder:font-bold placeholder:text-[#3a324a] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            aria-label="現在地"
            className="flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] border-[#3a324a14] bg-white shadow-[0_2px_6px_rgba(58,50,74,0.1)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="2" fill="#a695d8" />
              <circle cx="7" cy="7" r="5.5" stroke="#a695d8" strokeWidth="1" fill="none" />
            </svg>
          </button>
        </div>

        {/* Cache badge */}
        <div className="absolute left-3.5 top-[60px] inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
          <span className="h-[5px] w-[5px] rounded-full bg-[#e0a847]" />
          地図キャッシュ
        </div>

        {/* Radius circle (centered) */}
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#a695d8] bg-[#a695d81a] shadow-[0_0_0_1px_#a695d866,0_8px_28px_#a695d840]"
          style={{
            width: 200,
            height: 200,
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a695d8] shadow-[0_0_0_5px_#fff,0_6px_14px_rgba(0,0,0,0.2)]">
            <div className="h-2.5 w-2.5 rounded-full bg-white" />
          </div>
        </div>

        {/* Radius bubble */}
        <div className="absolute right-[18px] top-[100px] rounded-full bg-[#a695d8] px-2.5 py-[5px] text-[11px] font-extrabold tabular-nums tracking-[0.5px] text-white shadow-[0_4px_10px_#a695d855]">
          {radiusLabel}
        </div>

        {/* Venue label below pin */}
        {venue && (
          <div className="absolute left-1/2 top-[55%] mt-[70px] -translate-x-1/2 rounded-lg bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a] shadow-[0_2px_6px_rgba(58,50,74,0.15)]">
            {venue}
          </div>
        )}
      </div>

      {/* ─── Bottom Sheet ────────────────────────────────────────── */}
      <div className="relative -mt-5 flex-1 overflow-y-auto rounded-t-[22px] bg-white px-4 pb-[120px] pt-2.5 shadow-[0_-10px_30px_rgba(58,50,74,0.12)]">
        {/* drag handle */}
        <div className="mx-auto mb-3 h-1 w-9 rounded-sm bg-[#3a324a4d]" />

        {/* Radius slider — prominent */}
        <div className="rounded-[14px] border-[0.5px] border-[#a695d833] bg-[linear-gradient(120deg,#a695d810,#a8d4e614)] p-3.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <div className="text-xs font-bold text-[#3a324a8c]">マッチ範囲</div>
            <div className="text-[22px] font-extrabold tabular-nums tracking-[0.3px] text-[#a695d8]">
              {radiusLabel}
            </div>
          </div>
          <input
            type="range"
            min={200}
            max={2000}
            step={100}
            value={radiusM}
            onChange={(e) => setRadiusM(Number(e.target.value))}
            className="h-1 w-full"
            style={{ accentColor: "#a695d8" }}
          />
          <div className="mt-1 flex justify-between text-[9.5px] tabular-nums text-[#3a324a8c]">
            <span>200m</span>
            <span>2km</span>
          </div>
        </div>

        {/* Events nearby */}
        <FLabel top={16}>
          このエリアの近日イベント{" "}
          <span className="font-semibold text-[#3a324a4d]">
            (任意・加点要素)
          </span>
        </FLabel>
        <div className="flex flex-col gap-1.5">
          {/* Eventless option (default selected) */}
          <button
            type="button"
            onClick={() => selectEvent(null)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-[11px] text-left transition-all ${
              eventIdx === null
                ? "border-[1.5px] border-[#a695d8] bg-white"
                : "border-[0.5px] border-[#3a324a14] bg-white"
            }`}
          >
            <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="6" stroke="#fff" strokeWidth="1.4" fill="none" />
                <path
                  d="M9 5v4l3 2"
                  stroke="#fff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold text-[#3a324a]">
                イベントなしで設定
              </div>
              <div className="mt-px text-[10.5px] text-[#3a324a8c]">
                「明日渋谷で1時間」「会場周辺30分」など · 場所×時間だけでマッチング
              </div>
            </div>
            <Radio selected={eventIdx === null} />
          </button>

          {MOCK_EVENTS.map((e, i) => {
            const sel = eventIdx === i;
            return (
              <button
                key={e.name}
                type="button"
                onClick={() => selectEvent(i)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-[11px] text-left transition-all ${
                  sel
                    ? "border-[1.5px] border-[#a695d8] bg-[#a695d814]"
                    : "border-[0.5px] border-[#3a324a14] bg-white"
                }`}
              >
                <div
                  className={`flex h-[38px] w-[38px] flex-shrink-0 flex-col items-center justify-center rounded-[10px] text-[9px] font-bold leading-tight ${
                    sel
                      ? "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white"
                      : "bg-[#3a324a14] text-[#3a324a8c]"
                  }`}
                >
                  <span>{e.d}</span>
                  <span className="text-[10px]">{e.date}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold text-[#3a324a]">
                    {e.name}
                  </div>
                  <div className="mt-px text-[10.5px] tabular-nums text-[#3a324a8c]">
                    {e.k} · {e.t}
                  </div>
                </div>
                <Radio selected={sel} />
              </button>
            );
          })}

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#a695d888] bg-white px-3 py-2 text-[11.5px] font-bold text-[#a695d8]"
            onClick={() => setShowAdvanced(true)}
          >
            <svg width="11" height="11" viewBox="0 0 11 11">
              <path
                d="M5.5 1v9M1 5.5h9"
                stroke="#a695d8"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            イベントを追加（リストにない）
          </button>
        </div>

        {/* 有効時間 chips */}
        <FLabel top={14}>有効時間</FLabel>
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {[
            { id: "now", l: "いま" },
            { id: "min15", l: "15分後" },
            { id: "min30", l: "30分後" },
            { id: "h19", l: "19:00" },
            { id: "h1930", l: "19:30" },
          ].map((t) => {
            const sel = activeChip === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyChip(t.id)}
                className={`rounded-full px-3.5 py-[7px] text-[11.5px] font-semibold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border-[0.5px] border-[#3a324a14] bg-white text-[#3a324a]"
                }`}
              >
                {t.l}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#3a324a0f] px-3 py-2.5 text-[11px] text-[#3a324a8c]">
          <span>〜</span>
          <span className="font-bold tabular-nums text-[#3a324a]">
            {fmtTime(endAt)}
          </span>
          <span>
            {chosenEvent ? "(イベント終了 +30分)" : `(${Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000)}分間)`}
          </span>
        </div>

        {/* 詳細編集 (advanced) */}
        <button
          type="button"
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[10px] border-[0.5px] border-[#3a324a14] bg-white py-2 text-[11px] font-semibold text-[#3a324a8c]"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "詳細を閉じる" : "詳細編集"}
        </button>

        {showAdvanced && (
          <div className="mt-2 rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3 shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
            <div className="mb-1 text-[11px] font-bold text-[#3a324a8c]">開始</div>
            <input
              type="datetime-local"
              value={isoToLocalDatetimeLocal(startAt)}
              onChange={(e) =>
                setStartAt(new Date(e.target.value).toISOString())
              }
              className="block w-full rounded-[10px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[13px] text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
            />
            <div className="mb-1 mt-2 text-[11px] font-bold text-[#3a324a8c]">終了</div>
            <input
              type="datetime-local"
              value={isoToLocalDatetimeLocal(endAt)}
              onChange={(e) => setEndAt(new Date(e.target.value).toISOString())}
              className="block w-full rounded-[10px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[13px] text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
            />
          </div>
        )}

        {/* Quick toggles */}
        <div className="mt-3 rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3">
          <ToggleRow
            title="今すぐ交換 (5分以内)"
            sub="完全マッチ相手に即通知"
            v={express}
            onChange={setExpress}
            accent="#f3c5d4"
          />
          <div className="my-2 h-px bg-[#3a324a14]" />
          <ToggleRow
            title="動けます"
            sub="相手の場所近くもOK"
            v={mobile}
            onChange={setMobile}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* ─── Bottom CTA ──────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-[#a695d822] bg-white/96 px-[18px] pb-[30px] pt-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="h-12 flex-1 rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[14.5px] font-bold tracking-[0.4px] text-white shadow-[0_6px_16px_#a695d850] transition-all disabled:opacity-60"
        >
          {pending ? "保存中…" : "有効化 — 時空交差を再計算"}
        </button>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function FLabel({
  children,
  top = 14,
}: {
  children: React.ReactNode;
  top?: number;
}) {
  return (
    <div
      className="mb-1.5 px-0.5 text-[11px] font-extrabold tracking-[0.6px] text-[#3a324a8c]"
      style={{ marginTop: top }}
    >
      {children}
    </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] text-white ${
        selected ? "border-[#a695d8] bg-[#a695d8]" : "border-[#3a324a4d] bg-transparent"
      }`}
    >
      {selected ? "✓" : ""}
    </div>
  );
}

function ToggleRow({
  title,
  sub,
  v,
  onChange,
  accent,
}: {
  title: string;
  sub?: string;
  v: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  const tone = accent || "#a695d8";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1">
        <div className="text-[12.5px] font-bold text-[#3a324a]">{title}</div>
        {sub && (
          <div className="mt-px text-[10.5px] text-[#3a324a8c]">{sub}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!v)}
        className="relative h-[26px] w-[44px] flex-shrink-0 rounded-[13px] transition-colors"
        style={{ backgroundColor: v ? tone : "#3a324a4d" }}
      >
        <div
          className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-[left]"
          style={{ left: v ? 20 : 2 }}
        />
      </button>
    </div>
  );
}
