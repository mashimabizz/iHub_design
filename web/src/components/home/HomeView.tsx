"use client";

import { useEffect, useState, useTransition } from "react";
import { logout } from "@/app/auth/actions";
import { MatchCard, type MockMatchCard } from "./MatchCard";
import {
  disableLocalMode,
  enableLocalMode,
  type LocalModeSettings,
} from "./actions";
import {
  LocalModeSheet,
  type SimpleAW,
  type SimpleItem,
} from "./LocalModeSheet";

const TABS = [
  { id: 0, label: "完全マッチ", count: 3 },
  { id: 1, label: "私の譲が欲しい人", count: 12 },
  { id: 2, label: "私が欲しい譲を持つ人", count: 8 },
  { id: 3, label: "探索", count: 64 },
];

// モックデータ（iter66 で実マッチング演算に置換予定）
const MOCK_CARDS_BY_TAB: Record<number, MockMatchCard[]> = {
  0: [
    {
      id: "m1",
      userName: "ハナ",
      userHandle: "hana_lumi",
      oshiName: "LUMENA",
      memberName: "スア",
      givesLabel: "スア トレカ × 2 / 缶バッジ × 1",
      wantsLabel: "ヒナ アクスタ / 生写真",
      matchType: "complete",
      distance: "横浜アリーナ 周辺 · 15m",
      exchangeType: "any",
    },
    {
      id: "m2",
      userName: "ナナ",
      userHandle: "nana_kpop",
      oshiName: "LUMENA",
      memberName: "スア",
      givesLabel: "ヒナ アクスタ × 1",
      wantsLabel: "スア 生写真",
      matchType: "complete",
      distance: "横浜アリーナ 周辺 · 80m",
      exchangeType: "same_kind",
    },
  ],
  1: [
    {
      id: "m3",
      userName: "ユイ",
      userHandle: "yui_pop",
      oshiName: "LUMENA",
      memberName: "ヒナ",
      givesLabel: "ヒナ トレカ × 3",
      wantsLabel: "（あなたの譲が欲しい）",
      matchType: "they_want_you",
      distance: "横浜アリーナ 周辺 · 200m",
      exchangeType: "cross_kind",
    },
  ],
  2: [
    {
      id: "m4",
      userName: "リオ",
      userHandle: "rio_lumi",
      oshiName: "LUMENA",
      memberName: "リナ",
      givesLabel: "リナ アクスタ",
      wantsLabel: "（あなたが欲しい）",
      matchType: "you_want_them",
      distance: "横浜アリーナ 周辺 · 350m",
      exchangeType: "any",
    },
  ],
  3: [],
};

export function HomeView({
  profile,
  localMode,
  aws,
  carryingItems,
  autoOpenLocalSheet = false,
}: {
  profile: { handle: string; display_name: string } | null;
  localMode: LocalModeSettings | null;
  aws: SimpleAW[];
  carryingItems: SimpleItem[];
  autoOpenLocalSheet?: boolean;
}) {
  const [tab, setTab] = useState(0);
  const cards = MOCK_CARDS_BY_TAB[tab] ?? [];

  // 現地モード state（DB から取得した初期値）
  const [sheetOpen, setSheetOpen] = useState(autoOpenLocalSheet);
  const [pending, startTransition] = useTransition();

  // ?openLocalMode=1 で戻ってきたとき：URL パラメータを掃除しつつシート開く
  useEffect(() => {
    if (autoOpenLocalSheet && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("openLocalMode");
      window.history.replaceState({}, "", url.toString());
    }
  }, [autoOpenLocalSheet]);

  const isLocal = localMode?.enabled ?? false;
  const settings: LocalModeSettings = localMode ?? {
    enabled: false,
    awId: null,
    radiusM: 500,
    selectedCarryingIds: [],
    selectedWishIds: [],
    lastLat: null,
    lastLng: null,
  };

  // 現地モード ON 切替時に GPS 取得
  function handleEnableLocal() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      // Geolocation なくても ON にする（fallback として last_lat/lng を維持）
      startTransition(async () => {
        await enableLocalMode({});
        setSheetOpen(true);
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          await enableLocalMode({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setSheetOpen(true);
        });
      },
      () => {
        // 取得失敗 → 位置情報なしで ON
        startTransition(async () => {
          await enableLocalMode({});
          setSheetOpen(true);
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }

  function handleDisableLocal() {
    startTransition(async () => {
      await disableLocalMode();
    });
  }

  // chosen AW info
  const chosenAW = aws.find((a) => a.id === settings.awId);

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* Sync strip */}
      <div className="flex items-center gap-2 border-b border-[#3a324a14] bg-white px-5 py-2 text-[11px]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          style={{ boxShadow: "0 0 0 3px rgba(224,168,71,0.18)" }}
        />
        <span className="font-medium text-gray-900">オフライン中</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500 tabular-nums">最終同期 3分前</span>
        <div className="flex-1" />
        <span className="text-gray-500 tabular-nums">
          ローカル: マッチ12 / 在庫24
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Title row */}
        <div className="flex items-start justify-between px-5 pb-1.5 pt-4">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-[#a695d8]">
              推し：
              <span
                style={{
                  fontFamily: "var(--font-inter-tight), system-ui",
                  letterSpacing: "0.5px",
                }}
              >
                LUMENA
              </span>
              {" · スア"}
            </div>
            <h1 className="mt-1 text-[26px] font-bold leading-tight text-gray-900">
              マッチング
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white shadow-sm"
              aria-label="検索"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#3a324a"
                strokeWidth="1.4"
              >
                <circle cx="6" cy="6" r="4.5" />
                <path d="M9.5 9.5L13 13" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white shadow-sm"
              aria-label="フィルタ"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#3a324a"
                strokeWidth="1.4"
              >
                <path d="M2 4h10M3.5 7h7M5 10h4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* モード切替 pill */}
        <div className="mx-5 mt-2 flex gap-1 rounded-full bg-[#3a324a0a] p-1">
          <button
            type="button"
            onClick={() => isLocal && handleDisableLocal()}
            disabled={pending}
            className={`flex-1 rounded-full py-2 text-[12px] font-bold transition-all ${
              !isLocal
                ? "bg-white text-[#3a324a] shadow-[0_2px_6px_rgba(58,50,74,0.12)]"
                : "bg-transparent text-[#3a324a8c]"
            } disabled:opacity-50`}
          >
            🌐 広域
            <span className="ml-1 text-[10px] font-semibold">
              {!isLocal ? "（時空無制限）" : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => (isLocal ? setSheetOpen(true) : handleEnableLocal())}
            disabled={pending}
            className={`flex-1 rounded-full py-2 text-[12px] font-bold transition-all ${
              isLocal
                ? "bg-white text-[#3a324a] shadow-[0_2px_6px_rgba(58,50,74,0.12)]"
                : "bg-transparent text-[#3a324a8c]"
            } disabled:opacity-50`}
          >
            📍 現地交換
            <span className="ml-1 text-[10px] font-semibold">
              {isLocal ? "（AW 連動）" : ""}
            </span>
          </button>
        </div>

        {/* 現地モード ON 時のみ：設定サマリ */}
        {isLocal && (
          <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl border border-[#a695d855] bg-[linear-gradient(120deg,#a695d826,#a8d4e630)] px-4 py-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] shadow-[0_4px_10px_rgba(166,149,216,0.33)]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
              >
                <path d="M7.5 1.5C5 1.5 3 3.4 3 5.7c0 3.4 4.5 8 4.5 8s4.5-4.6 4.5-8c0-2.3-2-4.2-4.5-4.2z" />
                <circle cx="7.5" cy="5.7" r="1.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold leading-tight text-gray-900">
                {chosenAW
                  ? chosenAW.venue
                  : "AW 未選択（タップで設定）"}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-gray-600">
                {chosenAW
                  ? `半径 ${chosenAW.radiusM >= 1000 ? `${(chosenAW.radiusM / 1000).toFixed(1)}km` : `${chosenAW.radiusM}m`}（AW 設定値）`
                  : "範囲は AW 設定値を使用"}
                {" · "}
                持参 {settings.selectedCarryingIds.length} 件
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#a695d8] shadow-sm"
            >
              設定
            </button>
          </div>
        )}

        {/* Tab chips */}
        <div className="-mx-5 mt-3.5 flex gap-1.5 overflow-x-auto px-5 pb-2 pt-1 [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.3)]"
                    : "border border-[#3a324a14] bg-white text-gray-900"
                }`}
              >
                {t.label}
                <span
                  className={`tabular-nums ${
                    active ? "text-white/85" : "text-gray-500"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 pt-2">
          {cards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
              {tab === 3
                ? "探索フィードは今後実装します"
                : "現在マッチがありません"}
            </div>
          ) : (
            cards.map((c) => <MatchCard key={c.id} card={c} />)
          )}

          {tab === 0 && cards.length > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-[#3a324a14] bg-white px-4 py-3">
              <div>
                <div className="text-xs font-medium text-gray-900">
                  条件を緩めるとあと
                  <b className="text-[#a695d8]"> 14件</b>
                </div>
                <div className="mt-0.5 text-[10.5px] text-gray-500">
                  断った人 2 名は自動除外中
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#a695d8]">
                見直す →
              </span>
            </div>
          )}

          {profile && (
            <div className="rounded-2xl border border-[#a695d822] bg-white p-4 text-[11px] leading-relaxed text-gray-600">
              <div className="font-bold text-gray-900">
                ようこそ {profile.display_name}（@{profile.handle}）
              </div>
              <div className="mt-1.5">
                マッチング演算は iter66 で実装予定。今は mock data 表示中。
              </div>
              <form action={logout} className="mt-3">
                <button
                  type="submit"
                  className="text-[11px] font-semibold text-gray-500 underline"
                >
                  ログアウト
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 現地モード設定シート */}
      <LocalModeSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={settings}
        aws={aws}
        carryingItems={carryingItems}
      />
    </main>
  );
}
