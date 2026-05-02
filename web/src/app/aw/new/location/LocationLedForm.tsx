"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { saveAW } from "@/app/aw/actions";

/**
 * モックアップ aw-edit.jsx AWEditLocationLed (693-998) 準拠 +
 * Leaflet/OSM の本物の地図 + Geolocation/Nominatim 検索を実装。
 *
 * 構成:
 *   1. 上部 Map（react-leaflet + OSM タイル + ドラッグ可能ピン + radius circle）
 *      - 上部ヘッダー: × / 検索バー（Nominatim） / 現在地ボタン
 *   2. ボトムシート
 *      - 半径スライダー
 *      - 会場名（手動 or pin から自動取得）
 *      - イベント選択（mock 3件 + イベントなし）
 *      - 有効時間チップ + 詳細編集
 *      - 今すぐ交換 / 動けます トグル
 *   3. CTA: 「有効化」
 */

// SSR で window を参照するため動的に読み込む（ssr: false）
const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#a8d4e61a] text-xs text-[#3a324a8c]">
      地図を読み込み中…
    </div>
  ),
});

// ─── Nominatim 検索結果 ─────────────────────────────────────
type Place = {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address?: {
    leisure?: string;
    amenity?: string;
    building?: string;
    shop?: string;
    tourism?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
  };
};

/** Nominatim address から会場名相当のラベルを抽出 */
function labelFromAddress(p: Place): string {
  const a = p.address ?? {};
  // 建物名・施設名・ランドマーク的なものを優先
  return (
    a.leisure ||
    a.amenity ||
    a.tourism ||
    a.building ||
    a.shop ||
    a.road ||
    a.neighbourhood ||
    a.quarter ||
    a.suburb ||
    a.city_district ||
    a.city ||
    a.town ||
    a.village ||
    p.display_name.split(",")[0] ||
    "場所"
  );
}

// 近日のモックイベント
type MockEvent = {
  id: string;
  d: string;
  date: string;
  name: string;
  venue: string;
  startISO: () => string;
  endISO: () => string;
};

const MOCK_EVENTS: MockEvent[] = [
  {
    id: "lumena",
    d: "今日",
    date: "4/27",
    name: "LUMENA WORLD TOUR DAY 2",
    venue: "横浜アリーナ",
    startISO: () => atTime(18, 0),
    endISO: () => atTime(21, 30),
  },
  {
    id: "star",
    d: "今日",
    date: "4/27",
    name: "STAR Fan Meeting",
    venue: "横浜BUNTAI",
    startISO: () => atTime(19, 0),
    endISO: () => atTime(21, 0),
  },
  {
    id: "aurora",
    d: "明日",
    date: "4/28",
    name: "AURORA POP-UP STORE",
    venue: "横浜駅西口",
    startISO: () => atTime(11, 0, 1),
    endISO: () => atTime(20, 0, 1),
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
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function isoToLocalDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// fallback: 渋谷駅
const FALLBACK_CENTER: [number, number] = [35.6595, 139.7005];

export function LocationLedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("return");
  const destAfterSave =
    returnTo === "local-mode" ? "/?openLocalMode=1" : "/aw";

  // ─── 地図状態 ─────────────────────────────────────────────
  const [center, setCenter] = useState<[number, number]>(FALLBACK_CENTER);
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // ─── 検索 ─────────────────────────────────────────────────
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // ─── フォーム値 ───────────────────────────────────────────
  const [venue, setVenue] = useState("");
  const [venueAutoFilled, setVenueAutoFilled] = useState(false); // 自動入力かユーザー入力か
  const [radiusM, setRadiusM] = useState(500);
  const [eventIdx, setEventIdx] = useState<number | null>(null);
  const [startAt, setStartAt] = useState(() => new Date().toISOString());
  const [endAt, setEndAt] = useState(() => plusMinutes(120));
  const [activeChip, setActiveChip] = useState<string>("now");
  const [express, setExpress] = useState(true);
  const [mobile, setMobile] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    router.prefetch(destAfterSave);
  }, [router, destAfterSave]);

  // ─── 初回 Geolocation ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setGeolocating(false);
      },
      (err) => {
        // permission denied 等は無視 → fallback 中心のまま
        setGeoError(err.message);
        setGeolocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // ─── 検索（debounce） ────────────────────────────────────
  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as Place[] | { error: string };
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowResults(true);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  // ─── pin 移動時の reverse geocoding（venue 自動入力） ────
  useEffect(() => {
    // ユーザーが手で入力した venue は触らない
    if (!venueAutoFilled && venue.trim()) return;
    if (typeof window === "undefined") return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?lat=${center[0]}&lon=${center[1]}`,
          { signal: ctrl.signal },
        );
        const data = (await res.json()) as Place;
        if (data && (data.display_name || data.address)) {
          const label = labelFromAddress(data);
          setVenue(label);
          setVenueAutoFilled(true);
        }
      } catch {
        // ignore
      }
    }, 600);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [center, venueAutoFilled, venue]);

  const radiusLabel = useMemo(
    () =>
      radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)}km` : `${radiusM}m`,
    [radiusM],
  );

  const chosenEvent = eventIdx === null ? null : MOCK_EVENTS[eventIdx] ?? null;

  const applyChip = useCallback((chip: string) => {
    setActiveChip(chip);
    const now = new Date();
    let s = now.getTime();
    let e = s + 120 * 60_000;
    if (chip === "min15") {
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
    setVenueAutoFilled(false);
    setStartAt(ev.startISO());
    setEndAt(ev.endISO());
    setActiveChip("");
  }

  function pickSearchResult(p: Place) {
    const lat = parseFloat(p.lat);
    const lon = parseFloat(p.lon);
    if (isFinite(lat) && isFinite(lon)) {
      setCenter([lat, lon]);
      setVenue(labelFromAddress(p));
      setVenueAutoFilled(false); // 検索で選んだなら手動扱い
      setShowResults(false);
      setSearchQ("");
    }
  }

  function useCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("この端末では位置情報が利用できません");
      return;
    }
    setGeolocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setVenueAutoFilled(true); // 自動入力許可
        setGeolocating(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? "位置情報の利用が拒否されました（ブラウザ設定で許可してください）"
            : "位置情報を取得できませんでした",
        );
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleCenterChange(lat: number, lng: number) {
    setCenter([lat, lng]);
    // pin を動かしたら venue は再度自動入力させる
    setVenueAutoFilled(true);
  }

  async function handleSubmit() {
    setError(null);
    if (!venue.trim()) {
      setError("会場名を入力してください");
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
      centerLat: center[0],
      centerLng: center[1],
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push(destAfterSave);
  }

  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#fbf9fc] text-[#3a324a]">
      {/* ─── Map Area (360px) ────────────────────────────────────── */}
      <div className="relative h-[360px] flex-shrink-0 overflow-hidden">
        <MapPicker
          center={center}
          radiusM={radiusM}
          onCenterChange={handleCenterChange}
          className="absolute inset-0"
        />

        {/* Top sheet header overlay (地図の上に乗る) */}
        <div className="absolute inset-x-0 top-0 z-[1000] flex items-start gap-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0))] px-3.5 py-2.5">
          <Link
            href="/aw/new"
            aria-label="戻る"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[0.5px] border-[#3a324a14] bg-white shadow-[0_2px_6px_rgba(58,50,74,0.1)]"
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

          <div className="relative flex-1">
            <div className="flex w-full items-center gap-1.5 rounded-full border-[0.5px] border-[#3a324a14] bg-white px-3 py-[7px] shadow-[0_2px_6px_rgba(58,50,74,0.1)]">
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                className="flex-shrink-0"
              >
                <circle
                  cx="5"
                  cy="5"
                  r="3.5"
                  stroke="#3a324a"
                  strokeWidth="1.4"
                  fill="none"
                />
                <path
                  d="M8 8l2.5 2.5"
                  stroke="#3a324a"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length && setShowResults(true)}
                placeholder="会場・場所を検索"
                className="min-w-0 flex-1 border-0 bg-transparent text-[12px] font-bold text-[#3a324a] placeholder:font-bold placeholder:text-[#3a324a8c] focus:outline-none"
              />
              {searching && (
                <span className="text-[10px] text-[#3a324a8c]">検索中…</span>
              )}
            </div>

            {/* 検索結果ドロップダウン */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute inset-x-0 top-full z-[1100] mt-1 max-h-[260px] overflow-y-auto rounded-xl border-[0.5px] border-[#3a324a14] bg-white shadow-[0_8px_20px_rgba(58,50,74,0.18)]">
                {searchResults.map((p, i) => {
                  const label = labelFromAddress(p);
                  const sub = p.display_name;
                  return (
                    <button
                      key={`${p.lat},${p.lon}-${i}`}
                      type="button"
                      onClick={() => pickSearchResult(p)}
                      className="flex w-full items-start gap-2 border-b-[0.5px] border-[#3a324a08] px-3 py-2.5 text-left last:border-0 hover:bg-[#a695d80f]"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <path
                          d="M7 1.5c-2.8 0-4.5 2-4.5 4.5 0 3 4.5 6.5 4.5 6.5s4.5-3.5 4.5-6.5c0-2.5-1.7-4.5-4.5-4.5z"
                          stroke="#a695d8"
                          strokeWidth="1.4"
                          fill="none"
                        />
                        <circle
                          cx="7"
                          cy="6"
                          r="1.5"
                          stroke="#a695d8"
                          strokeWidth="1.4"
                          fill="none"
                        />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-bold text-[#3a324a]">
                          {label}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-[#3a324a8c]">
                          {sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geolocating}
            aria-label="現在地"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[0.5px] border-[#3a324a14] bg-white shadow-[0_2px_6px_rgba(58,50,74,0.1)] disabled:opacity-60"
          >
            {geolocating ? (
              <span className="block h-3 w-3 animate-spin rounded-full border-2 border-[#a695d8] border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="2" fill="#a695d8" />
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="#a695d8"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Geolocation error toast */}
        {geoError && (
          <div className="absolute inset-x-3.5 top-[60px] z-[1000] rounded-lg bg-black/70 px-3 py-1.5 text-[10.5px] text-white backdrop-blur-md">
            {geoError}
          </div>
        )}

        {/* radius bubble — 地図上に表示 */}
        <div className="pointer-events-none absolute right-[18px] top-[60px] z-[900] rounded-full bg-[#a695d8] px-2.5 py-[5px] text-[11px] font-extrabold tabular-nums tracking-[0.5px] text-white shadow-[0_4px_10px_#a695d855]">
          {radiusLabel}
        </div>
      </div>

      {/* ─── Bottom Sheet ────────────────────────────────────────── */}
      <div className="relative -mt-5 flex-1 overflow-y-auto rounded-t-[22px] bg-white px-4 pb-[120px] pt-2.5 shadow-[0_-10px_30px_rgba(58,50,74,0.12)]">
        {/* drag handle */}
        <div className="mx-auto mb-3 h-1 w-9 rounded-sm bg-[#3a324a4d]" />

        {/* Radius slider */}
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

        {/* 会場名 */}
        <FLabel top={16}>
          会場 / エリア名 <span className="text-[#a695d8]">*</span>
        </FLabel>
        <input
          type="text"
          value={venue}
          onChange={(e) => {
            setVenue(e.target.value);
            setVenueAutoFilled(false);
          }}
          placeholder="例: 渋谷駅周辺・横浜アリーナ"
          maxLength={100}
          className="block w-full rounded-xl border-[0.5px] border-[#3a324a14] bg-white px-3.5 py-2.5 text-[14px] font-semibold text-[#3a324a] placeholder:font-medium placeholder:text-[#3a324a4d] focus:border-[#a695d8] focus:outline-none"
        />
        <p className="mt-1 px-1 text-[10px] text-[#3a324a8c]">
          {venueAutoFilled
            ? "📍 ピン位置から自動取得（編集可）"
            : "ピンを動かす or 検索すると自動入力されます"}
        </p>

        {/* Events nearby */}
        <FLabel top={16}>
          このエリアの近日イベント{" "}
          <span className="font-semibold text-[#3a324a4d]">
            (任意・加点要素)
          </span>
        </FLabel>
        <div className="flex flex-col gap-1.5">
          {/* イベントなしオプション */}
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
                <circle
                  cx="9"
                  cy="9"
                  r="6"
                  stroke="#fff"
                  strokeWidth="1.4"
                  fill="none"
                />
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
                場所×時間だけでマッチング
              </div>
            </div>
            <Radio selected={eventIdx === null} />
          </button>

          {MOCK_EVENTS.map((e, i) => {
            const sel = eventIdx === i;
            return (
              <button
                key={e.id}
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
                    {e.venue}
                  </div>
                </div>
                <Radio selected={sel} />
              </button>
            );
          })}
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
            {chosenEvent
              ? "(イベント終了)"
              : `(${Math.round(
                  (new Date(endAt).getTime() - new Date(startAt).getTime()) /
                    60000,
                )}分間)`}
          </span>
        </div>

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
