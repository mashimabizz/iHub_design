"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAW } from "@/app/aw/actions";

/**
 * モックアップ aw-edit.jsx AWEditEventLed (276-571) 準拠。
 *
 * 構成:
 *   1. SheetHeader（× / 登録中 / クリア + タイトル）
 *   2. イベント — 選択済みカード（4/27 / LUMENA WORLD TOUR DAY 2）
 *      未選択時は近日イベントのリスト + 「+ イベントを追加」
 *   3. 位置と範囲 — MiniMap（自動派生）+ 半径スライダー
 *      - 「現在地を使う」「📍 ピン調整」ボタン
 *   4. 時間ウィンドウ — タブ（プリセット / 手動調整 / いま）
 *      - プリセットモード: 4 つの開演前後プリセットカード
 *      - now-chips
 *   5. 現地交換の希望 — マルチ選択チェックボックス
 *   6. 運用オプション — エクスプレス + クローズ時間
 *   7. Visibility note
 *   8. Bottom CTA: 「X告知も」+ 「保存して有効化」
 */

// 近日のモックイベント（実装は後続 iter で master 化）
type MockEvent = {
  id: string;
  d: string;
  date: string;
  name: string;
  venue: string;
  showTime: string; // "開演 18:00"
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  dayOffset: number;
};

const MOCK_EVENTS: MockEvent[] = [
  {
    id: "lumena",
    d: "今日",
    date: "4/27",
    name: "LUMENA WORLD TOUR DAY 2",
    venue: "横浜アリーナ",
    showTime: "開演 18:00",
    startH: 18,
    startM: 0,
    endH: 21,
    endM: 30,
    dayOffset: 0,
  },
  {
    id: "star",
    d: "今日",
    date: "4/27",
    name: "STAR Fan Meeting",
    venue: "横浜BUNTAI",
    showTime: "開演 19:00",
    startH: 19,
    startM: 0,
    endH: 21,
    endM: 0,
    dayOffset: 0,
  },
  {
    id: "aurora",
    d: "明日",
    date: "4/28",
    name: "AURORA POP-UP STORE",
    venue: "横浜駅西口",
    showTime: "11:00 - 20:00",
    startH: 11,
    startM: 0,
    endH: 20,
    endM: 0,
    dayOffset: 1,
  },
];

type Preset = {
  id: string;
  label: string;
  range: string;
  badge?: string;
  computeStart: (ev: MockEvent) => Date;
  computeEnd: (ev: MockEvent) => Date;
};

function eventDate(ev: MockEvent, h: number, m: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + ev.dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function buildPresets(ev: MockEvent | null): Preset[] {
  if (!ev) return [];
  const sH = ev.startH;
  const sM = ev.startM;
  const eH = ev.endH;
  const eM = ev.endM;
  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const minus = (h: number, m: number, mins: number) => {
    const d = new Date();
    d.setHours(h, m - mins, 0, 0);
    return [d.getHours(), d.getMinutes()] as const;
  };
  const plus = (h: number, m: number, mins: number) => {
    const d = new Date();
    d.setHours(h, m + mins, 0, 0);
    return [d.getHours(), d.getMinutes()] as const;
  };
  const [pre30H, pre30M] = minus(sH, sM, 30);
  const [post30H, post30M] = plus(sH, sM, 30);
  const [pre60H, pre60M] = minus(sH, sM, 60);
  const [post60H, post60M] = plus(eH, eM, 60);
  const [endPlus30H, endPlus30M] = plus(eH, eM, 30);
  const [endPlus60H, endPlus60M] = plus(eH, eM, 60);

  return [
    {
      id: "p1",
      label: "開演前後30分",
      range: `${fmt(pre30H, pre30M)} 〜 ${fmt(post30H, post30M)}`,
      badge: "推奨",
      computeStart: (e) => eventDate(e, pre30H, pre30M),
      computeEnd: (e) => eventDate(e, post30H, post30M),
    },
    {
      id: "p2",
      label: "開演前30分のみ",
      range: `${fmt(pre30H, pre30M)} 〜 ${fmt(sH, sM)}`,
      computeStart: (e) => eventDate(e, pre30H, pre30M),
      computeEnd: (e) => eventDate(e, sH, sM),
    },
    {
      id: "p3",
      label: "開演前後60分",
      range: `${fmt(pre60H, pre60M)} 〜 ${fmt(post60H, post60M)}`,
      badge: "ロング",
      computeStart: (e) => eventDate(e, pre60H, pre60M),
      computeEnd: (e) => eventDate(e, post60H, post60M),
    },
    {
      id: "p4",
      label: "終演後のみ",
      range: `${fmt(endPlus30H, endPlus30M)} 〜 ${fmt(endPlus60H, endPlus60M)}`,
      computeStart: (e) => eventDate(e, endPlus30H, endPlus30M),
      computeEnd: (e) => eventDate(e, endPlus60H, endPlus60M),
    },
  ];
}

const MEETING_OPTS = [
  { id: "near", l: "会場近くで手渡し希望" },
  { id: "mobile", l: "動けます（相手の場所もOK）" },
  {
    id: "landmark",
    l: "ランドマーク指定でやりとり",
    sub: "トイレ前 / ドリンクコーナー / 関係者口",
  },
  { id: "onsite", l: "現地オンリー（郵送交換不可）" },
];

function isoToLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function EventLedForm() {
  const router = useRouter();

  const [eventIdx, setEventIdx] = useState<number | null>(0); // モック: 既定で 1 件目
  const [customName, setCustomName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [radiusM, setRadiusM] = useState(500);
  const [timeMode, setTimeMode] = useState<"preset" | "manual" | "now">(
    "preset",
  );
  const [presetIdx, setPresetIdx] = useState(0);
  const [meeting, setMeeting] = useState<string[]>(["near", "mobile"]);
  const [express, setExpress] = useState(true);
  const [closeBefore, setCloseBefore] = useState(15);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // manual mode datetime values
  const [manualStart, setManualStart] = useState(() => {
    const d = new Date();
    return isoToLocal(d.toISOString());
  });
  const [manualEnd, setManualEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return isoToLocal(d.toISOString());
  });

  useEffect(() => {
    router.prefetch("/aw");
  }, [router]);

  const chosenEvent = eventIdx === null ? null : MOCK_EVENTS[eventIdx] ?? null;
  const presets = useMemo(() => buildPresets(chosenEvent), [chosenEvent]);

  const radiusLabel = useMemo(
    () => (radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)}km` : `${radiusM}m`),
    [radiusM],
  );

  function toggleMeeting(id: string) {
    setMeeting((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    setError(null);
    const eventName = chosenEvent?.name || customName.trim();
    const venue = chosenEvent?.venue || "";

    if (!eventName) {
      setError("イベント名を入力してください");
      return;
    }
    if (!venue) {
      setError("会場が未指定です（イベント変更で再選択してください）");
      return;
    }

    let startISO: string;
    let endISO: string;

    if (timeMode === "preset" && chosenEvent) {
      const p = presets[presetIdx];
      if (!p) {
        setError("プリセットを選択してください");
        return;
      }
      startISO = p.computeStart(chosenEvent).toISOString();
      endISO = p.computeEnd(chosenEvent).toISOString();
    } else if (timeMode === "now") {
      startISO = new Date().toISOString();
      endISO = new Date(Date.now() + 60 * 60_000).toISOString();
    } else {
      startISO = new Date(manualStart).toISOString();
      endISO = new Date(manualEnd).toISOString();
    }

    if (new Date(endISO) <= new Date(startISO)) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }

    setPending(true);
    const result = await saveAW({
      venue,
      eventName,
      eventless: false,
      startAt: isoToLocal(startISO),
      endAt: isoToLocal(endISO),
      radiusM,
      note: meeting.length ? `現地: ${meeting.join(", ")}` : undefined,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/aw");
  }

  return (
    <main className="relative flex min-h-screen flex-1 flex-col bg-[#fbf9fc] text-[#3a324a]">
      {/* ─── Sheet Header ─────────────────────────────────────── */}
      <div className="border-b-[0.5px] border-[#3a324a14] bg-white px-3.5 py-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <Link
            href="/aw/new"
            aria-label="閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-[#3a324a14] bg-white"
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
          <div className="text-[11px] font-semibold text-[#3a324a8c]">
            登録中
          </div>
          <button
            type="button"
            onClick={() => {
              setEventIdx(null);
              setCustomName("");
              setMeeting([]);
            }}
            className="bg-transparent text-xs text-[#3a324a8c]"
          >
            クリア
          </button>
        </div>
        <div className="text-[17px] font-extrabold tracking-[0.3px]">
          AW（合流可能枠）を作成
        </div>
        <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
          🎤 イベントから埋める — 時間・場所をワンタップ補完（ショートカット）
        </div>
      </div>

      {/* ─── Body ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-[120px] pt-3.5">
        {/* イベント */}
        <FLabel>
          イベント <span className="text-[#a695d8]">*</span>
        </FLabel>

        {chosenEvent && !showPicker && (
          <div className="flex items-center gap-3 rounded-2xl border-[0.5px] border-[#a695d855] bg-[linear-gradient(120deg,#a695d822,#a8d4e622)] p-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[12px] font-extrabold tracking-[0.5px] text-white shadow-[0_4px_10px_#a695d840]">
              {chosenEvent.date}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-[#3a324a]">
                {chosenEvent.name}
              </div>
              <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
                {chosenEvent.venue} · {chosenEvent.showTime}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-[7px] py-0.5 text-[9.5px] font-bold text-[#a695d8]">
                <span className="h-1 w-1 rounded-full bg-[#a695d8]" />
                マスタ登録済
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="bg-transparent text-[11px] font-bold text-[#a695d8]"
            >
              変更
            </button>
          </div>
        )}

        {(showPicker || !chosenEvent) && (
          <div className="flex flex-col gap-1.5">
            {MOCK_EVENTS.map((e, i) => {
              const sel = eventIdx === i;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setEventIdx(i);
                    setShowPicker(false);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-[11px] text-left transition-all ${
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
                      {e.venue} · {e.showTime}
                    </div>
                  </div>
                  <Radio selected={sel} />
                </button>
              );
            })}
            <div className="mt-1 flex items-center gap-2 rounded-xl border-[0.5px] border-[#3a324a14] bg-white p-2.5">
              <svg width="11" height="11" viewBox="0 0 11 11" className="flex-shrink-0">
                <path
                  d="M5.5 1v9M1 5.5h9"
                  stroke="#a695d8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="イベントを追加（リストにない）"
                maxLength={100}
                className="min-w-0 flex-1 border-0 bg-transparent text-[12px] font-semibold text-[#3a324a] focus:outline-none"
              />
            </div>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10.5px] text-[#3a324a8c]">
          <span>近日のイベントから選択</span>
          {!showPicker && chosenEvent && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="bg-transparent font-bold text-[#a695d8]"
            >
              + イベントを追加
            </button>
          )}
        </div>

        {/* 位置と範囲 */}
        <FLabel top={18}>位置と範囲</FLabel>
        <div className="overflow-hidden rounded-2xl border-[0.5px] border-[#3a324a14] bg-white">
          {/* MiniMap */}
          <MiniMap
            radiusM={radiusM}
            venue={chosenEvent?.venue || customName || "（会場未設定）"}
          />
          <div className="flex items-center gap-2 px-3 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-[#3a324a0f] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a324a]"
            >
              <svg width="11" height="11" viewBox="0 0 11 11">
                <circle cx="5.5" cy="5.5" r="1.4" fill="#a695d8" />
                <circle
                  cx="5.5"
                  cy="5.5"
                  r="4.5"
                  stroke="#a695d8"
                  strokeWidth="0.8"
                  fill="none"
                />
              </svg>
              現在地を使う
            </button>
            <button
              type="button"
              className="rounded-full bg-[#3a324a0f] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a324a]"
            >
              📍 ピン調整
            </button>
            <div className="flex-1" />
            <span className="text-[10px] text-[#3a324a8c]">キャッシュ済</span>
          </div>
          <div className="px-3.5 pb-3.5 pt-1">
            <div className="mb-1.5 flex items-baseline justify-between text-[11px] font-semibold text-[#3a324a8c]">
              <span>半径</span>
              <span className="text-sm font-extrabold tabular-nums text-[#a695d8]">
                {radiusLabel}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={2000}
              step={100}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="block h-1 w-full"
              style={{ accentColor: "#a695d8" }}
            />
            <div className="mt-1 flex justify-between text-[9.5px] tabular-nums text-[#3a324a4d]">
              <span>200m</span>
              <span>500m</span>
              <span>1km</span>
              <span>2km</span>
            </div>
          </div>
        </div>

        {/* 時間ウィンドウ */}
        <FLabel top={18}>時間ウィンドウ</FLabel>
        <div className="mb-2.5 flex gap-1 rounded-[10px] bg-[#3a324a0f] p-[3px]">
          {[
            { id: "preset" as const, l: "プリセット" },
            { id: "manual" as const, l: "手動調整" },
            { id: "now" as const, l: "いま" },
          ].map((o) => {
            const sel = timeMode === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setTimeMode(o.id)}
                className={`h-[30px] flex-1 rounded-lg text-[11.5px] transition-all ${
                  sel
                    ? "bg-white font-bold text-[#a695d8] shadow-[0_1px_3px_rgba(58,50,74,0.1)]"
                    : "bg-transparent font-medium text-[#3a324a8c]"
                }`}
              >
                {o.l}
              </button>
            );
          })}
        </div>

        {timeMode === "preset" && presets.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3">
            {presets.map((p, i) => {
              const sel = presetIdx === i;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetIdx(i)}
                  className={`flex items-center rounded-[11px] px-3 py-2.5 text-left transition-all ${
                    sel
                      ? "border-[1.5px] border-[#a695d8] bg-[#a695d81c]"
                      : "border-[0.5px] border-[#3a324a14] bg-transparent"
                  }`}
                >
                  <div className="flex-1">
                    <div
                      className={`flex items-center gap-1.5 text-[12.5px] font-bold ${
                        sel ? "text-[#a695d8]" : "text-[#3a324a]"
                      }`}
                    >
                      {p.label}
                      {p.badge && (
                        <span
                          className={`rounded-[4px] px-1.5 py-px text-[9px] font-bold ${
                            sel
                              ? "bg-[#a695d8] text-white"
                              : "bg-[#3a324a0f] text-[#3a324a8c]"
                          }`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="mt-px text-[10.5px] tabular-nums text-[#3a324a8c]">
                      {p.range}
                    </div>
                  </div>
                  <Radio selected={sel} />
                </button>
              );
            })}
          </div>
        )}

        {timeMode === "manual" && (
          <div className="rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3">
            <div className="mb-1 text-[11px] font-bold text-[#3a324a8c]">
              開始
            </div>
            <input
              type="datetime-local"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              className="block w-full rounded-[10px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[13px] text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
            />
            <div className="mb-1 mt-2 text-[11px] font-bold text-[#3a324a8c]">
              終了
            </div>
            <input
              type="datetime-local"
              value={manualEnd}
              onChange={(e) => setManualEnd(e.target.value)}
              className="block w-full rounded-[10px] border-[0.5px] border-[#3a324a14] bg-white px-3 py-2 text-[13px] text-[#3a324a] focus:border-[#a695d8] focus:outline-none"
            />
          </div>
        )}

        {timeMode === "now" && (
          <div className="rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3 text-[12px] text-[#3a324a8c]">
            開始: いま — 終了: 1 時間後
          </div>
        )}

        {/* 現地交換の希望 */}
        <FLabel top={18}>現地交換の希望</FLabel>
        <div className="flex flex-col gap-1.5">
          {MEETING_OPTS.map((o) => {
            const sel = meeting.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleMeeting(o.id)}
                className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                  sel
                    ? "border-[1.5px] border-[#a695d8] bg-[#a695d814]"
                    : "border-[0.5px] border-[#3a324a14] bg-white"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded text-[10px] text-white ${
                    sel
                      ? "border-[1.5px] border-[#a695d8] bg-[#a695d8]"
                      : "border-[1.5px] border-[#3a324a4d] bg-transparent"
                  }`}
                >
                  {sel ? "✓" : ""}
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-[#3a324a]">
                    {o.l}
                  </div>
                  {o.sub && (
                    <div className="mt-0.5 text-[10px] text-[#3a324a8c]">
                      {o.sub}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 運用オプション */}
        <FLabel top={18}>運用オプション</FLabel>
        <div className="rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white p-3">
          <ToggleRow
            title="「今すぐ交換」エクスプレス"
            sub="5分以内に合流可能 — 完全マッチに即時通知"
            v={express}
            onChange={setExpress}
            accent="#f3c5d4"
          />
          <div className="my-2 h-px bg-[#3a324a14]" />
          <div className="mb-1.5">
            <div className="text-[12.5px] font-bold text-[#3a324a]">
              クローズ時間（自動促進送信）
            </div>
            <div className="mt-px text-[10.5px] text-[#3a324a8c]">
              AW終了 {closeBefore}分前に進行中の取引へ「もうすぐ終了」自動送信
            </div>
          </div>
          <div className="flex gap-1.5">
            {[10, 15, 20, 30].map((m) => {
              const sel = closeBefore === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCloseBefore(m)}
                  className={`flex-1 rounded-lg py-[7px] text-[11.5px] font-bold tabular-nums transition-all ${
                    sel
                      ? "bg-[#a695d8] text-white"
                      : "bg-[#3a324a0f] text-[#3a324a]"
                  }`}
                >
                  {m}分前
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibility note */}
        <div className="mt-3.5 flex items-start gap-2 rounded-[10px] bg-[#3a324a0f] px-3 py-2.5 text-[11px] leading-[1.5] text-[#3a324a8c]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            className="mt-px flex-shrink-0"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="#3a324a8c" strokeWidth="1" fill="none" />
            <path
              d="M6.5 4v3M6.5 8.5v.5"
              stroke="#3a324a8c"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            このAWは<b className="text-[#3a324a]">すべてのユーザーに公開</b>されます。
            <br />
            保存と同時に <b className="text-[#3a324a]">マッチを再計算</b> し、ホームに即反映。
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* ─── Bottom CTA ──────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t-[0.5px] border-[#a695d822] bg-white/96 px-[18px] pb-[30px] pt-3 backdrop-blur-xl">
        <button
          type="button"
          className="inline-flex h-12 items-center gap-1.5 rounded-[14px] border-[0.5px] border-[#3a324a14] bg-white px-3.5 text-[13px] font-semibold text-[#3a324a]"
        >
          <span className="font-extrabold" style={{ fontFamily: '"Inter Tight", sans-serif' }}>
            X
          </span>
          告知も
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="h-12 flex-1 rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[14.5px] font-bold tracking-[0.4px] text-white shadow-[0_6px_16px_#a695d850] transition-all disabled:opacity-60"
        >
          {pending ? "保存中…" : "保存して有効化"}
        </button>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

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
        selected
          ? "border-[#a695d8] bg-[#a695d8]"
          : "border-[#3a324a4d] bg-transparent"
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
        className="relative h-[26px] w-[44px] flex-shrink-0 rounded-[13px]"
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

function MiniMap({ radiusM, venue }: { radiusM: number; venue: string }) {
  const r = Math.min(60, 12 + radiusM / 30);
  const radiusLabel = radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)}km` : `${radiusM}m`;
  return (
    <div
      className="relative h-[150px] overflow-hidden"
      style={{
        background:
          "repeating-linear-gradient(45deg, #a8d4e61a 0 8px, #a8d4e628 8px 14px)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 240 150"
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        <path
          d="M0 90 Q60 75 120 95 T240 80"
          stroke="#fff"
          strokeWidth="7"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M70 0 L110 150"
          stroke="#fff"
          strokeWidth="5"
          fill="none"
          opacity="0.55"
        />
        <path
          d="M180 0 L150 150"
          stroke="#fff"
          strokeWidth="3"
          fill="none"
          opacity="0.4"
        />
      </svg>
      {/* venue label */}
      <div className="absolute left-[70px] top-9 rounded-md bg-white/90 px-2 py-[3px] text-[9.5px] font-bold">
        {venue}
      </div>
      {/* radius circle */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#a695d8] bg-[#a695d826] shadow-[0_0_0_1px_#a695d866]"
        style={{ width: r * 2.2, height: r * 2.2 }}
      />
      {/* pin */}
      <div className="absolute left-1/2 top-1/2 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#a695d8] shadow-[0_0_0_4px_#fff,0_4px_10px_#a695d855]">
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
      {/* radius label */}
      <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold tabular-nums text-white backdrop-blur-md">
        半径 {radiusLabel}
      </div>
    </div>
  );
}
