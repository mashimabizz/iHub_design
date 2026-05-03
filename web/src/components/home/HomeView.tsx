"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { logout } from "@/app/auth/actions";
import {
  MatchCard,
  type MatchCardData,
  type MatchCardListingInfo,
  type MiniItem,
} from "./MatchCard";
import type { MatchInv } from "@/lib/matching";
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
import { type Match } from "@/lib/matching";

const TABS = [
  { id: 0, label: "完全マッチ" },
  { id: 1, label: "私の譲が欲しい人" },
  { id: 2, label: "私が欲しい譲を持つ人" },
  { id: 3, label: "探索" },
];

// メンバー名 / グループ名 → hue (色相) ハッシュ
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function toMini(inv: MatchInv): MiniItem {
  const label = inv.characterName ?? inv.groupName ?? inv.title ?? "?";
  return {
    id: inv.id,
    label,
    goodsTypeName: inv.goodsTypeName,
    photoUrl: inv.photoUrl,
    hue: nameToHue(label),
  };
}

/** Match を MatchCard 用データに変換（iter67.6: partner listings 対応 / iter67.8: 在庫情報） */
function matchToCard(
  m: Match,
  myInvById: Map<string, MatchInv>,
  myWishById: Map<string, MatchInv>,
  partnersInvById: Map<string, MatchInv>,
  partnersWishById: Map<string, MatchInv>,
  myInventoryQty: Record<string, number>,
): MatchCardData {
  /**
   * iter67.8：listing 情報を hydrate する際、commitments 情報も計算
   *
   * @param isMyListing 自分が listing オーナーか
   */
  const hydrate = (
    listings: typeof m.myMatchedListings,
    haveLookup: Map<string, MatchInv>,
    wishLookup: Map<string, MatchInv>,
    isMyListing: boolean,
  ): MatchCardListingInfo[] | undefined =>
    listings?.map((ml) => {
      const haves = ml.haveIds.map((id, i) => {
        const inv = haveLookup.get(id);
        const item: MiniItem = inv
          ? toMini(inv)
          : { id, label: "?", goodsTypeName: null, photoUrl: null, hue: 0 };
        return {
          item,
          qty: ml.haveQtys[i] ?? 1,
          matched: ml.matchedHaveIds.includes(id),
        };
      });
      const options = ml.options.map((opt) => ({
        id: opt.id,
        position: opt.position,
        logic: opt.logic,
        exchangeType: opt.exchangeType,
        isCashOffer: opt.isCashOffer,
        cashAmount: opt.cashAmount,
        matched: opt.matched,
        wishes: opt.wishIds.map((id, i) => {
          const inv = wishLookup.get(id);
          const item: MiniItem = inv
            ? toMini(inv)
            : { id, label: "?", goodsTypeName: null, photoUrl: null, hue: 0 };
          return {
            item,
            qty: opt.wishQtys[i] ?? 1,
          };
        }),
        /**
         * 私が追加で出す必要があるアイテム：
         *  - my listing：[]（perOptionMyCommitment 側）
         *  - partner listing：option.matchedTheirInvIds × wishQtys
         *    （wishQtys[i] が「相手が要求する数」なので、私が出すべき数）
         *
         * 注：matchedTheirInvIds は wish_ids から派生した相手側 hit。
         *     partner listing context では wish_ids に対応するのは私の inv なので、
         *     wish_ids[i] と wishQtys[i] のペアで「i 番目 wish 用に必要な qty」が分かる
         */
        myAdditionalCommitments: isMyListing
          ? []
          : opt.matchedTheirInvIds.map((id) => ({
              itemId: id,
              // wishQtys は wish_ids 順に対応。同じ id が複数の wish にヒットする場合は
              // 最初に見つかった wish の qty を使う（簡略化）
              qty: (() => {
                for (let i = 0; i < opt.wishIds.length; i++) {
                  const myWishItem = wishLookup.get(opt.wishIds[i]);
                  const myInvItem = myInvById.get(id);
                  if (
                    myWishItem &&
                    myInvItem &&
                    myWishItem.goodsTypeId === myInvItem.goodsTypeId
                  ) {
                    return opt.wishQtys[i] ?? 1;
                  }
                }
                return 1;
              })(),
            })),
      }));

      // listing 全体の per-option commitment (my listing の haves)
      const perOptionMyCommitment = isMyListing
        ? ml.haveIds.map((id, i) => ({
            itemId: id,
            qty: ml.haveQtys[i] ?? 1,
          }))
        : [];

      return {
        listingId: ml.listingId,
        haveLogic: ml.haveLogic,
        haves,
        options,
        isMyListing,
        perOptionMyCommitment,
      };
    });

  const myMatched = hydrate(m.myMatchedListings, myInvById, myWishById, true);
  const partnerMatched = hydrate(
    m.partnerMatchedListings,
    partnersInvById,
    partnersWishById,
    false,
  );

  // バッジ判定：listing 経由マッチで AND があれば 'set'、それ以外は 'any'
  const allListings = [
    ...(m.myMatchedListings ?? []),
    ...(m.partnerMatchedListings ?? []),
  ];
  const hasAnd = allListings.some(
    (ml) =>
      ml.haveLogic === "and" ||
      ml.options.some((o) => o.matched && o.logic === "and"),
  );
  const listingBadge: MatchCardData["listingBadge"] = m.viaListing
    ? hasAnd
      ? "set"
      : "any"
    : null;

  // 定価交換選択肢（cash_offer）が含まれているか（iter67.6 サブバッジ用）
  const hasCashOffer = allListings.some((ml) =>
    ml.options.some((o) => o.isCashOffer),
  );

  // 距離テキスト（現地モード ON 時のみ）
  let distanceText: string | undefined;
  if (typeof m.distanceMeters === "number") {
    const d = m.distanceMeters;
    distanceText =
      d < 1000 ? `約 ${Math.round(d)}m` : `約 ${(d / 1000).toFixed(1)}km`;
  }

  return {
    id: `match-${m.partner.id}`,
    partnerId: m.partner.id,
    userName: m.partner.displayName || m.partner.handle,
    userHandle: m.partner.handle,
    myGives: m.myGives.map(toMini),
    theirGives: m.theirGives.map(toMini),
    matchType: m.matchType,
    distance: m.partner.primaryArea || "広域",
    exchangeType: "any",
    listingBadge,
    hasCashOffer,
    myMatchedListings: myMatched,
    partnerMatchedListings: partnerMatched,
    bothSidesListingMatch: m.bothSidesListingMatch,
    distanceText,
    myInventoryQty,
  };
}

export function HomeView({
  profile,
  localMode,
  currentAW,
  carryingItems,
  autoOpenLocalSheet = false,
  matches,
  myInventory,
  myWishes,
  partnersInventory,
  partnersWishes,
  myInventoryQty,
}: {
  profile: { handle: string; display_name: string } | null;
  localMode: LocalModeSettings | null;
  currentAW: SimpleAW | null;
  carryingItems: SimpleItem[];
  autoOpenLocalSheet?: boolean;
  matches: Match[];
  myInventory: MatchInv[];
  myWishes: MatchInv[];
  /** 全パートナーの inv フラット（モーダル描画時の lookup 用、iter67.6） */
  partnersInventory: MatchInv[];
  partnersWishes: MatchInv[];
  /** 自分の inv id → quantity（在庫オーバーチェック用、iter67.8） */
  myInventoryQty: Record<string, number>;
}) {
  const [tab, setTab] = useState(0);

  // 4 タブにマッチを振り分け
  const cardsByTab = useMemo(() => {
    const myInvById = new Map(myInventory.map((i) => [i.id, i]));
    const myWishById = new Map(myWishes.map((w) => [w.id, w]));
    const partnersInvById = new Map(partnersInventory.map((i) => [i.id, i]));
    const partnersWishById = new Map(partnersWishes.map((w) => [w.id, w]));
    const all = matches.map((m) =>
      matchToCard(
        m,
        myInvById,
        myWishById,
        partnersInvById,
        partnersWishById,
        myInventoryQty,
      ),
    );
    return {
      0: all.filter((c) => c.matchType === "complete"),
      1: all.filter((c) => c.matchType === "they_want_you"),
      2: all.filter((c) => c.matchType === "you_want_them"),
      3: all, // 探索: 全部
    } as Record<number, MatchCardData[]>;
  }, [
    matches,
    myInventory,
    myWishes,
    partnersInventory,
    partnersWishes,
    myInventoryQty,
  ]);
  const cards = cardsByTab[tab] ?? [];

  const tabCounts = useMemo(
    () => ({
      0: cardsByTab[0]?.length ?? 0,
      1: cardsByTab[1]?.length ?? 0,
      2: cardsByTab[2]?.length ?? 0,
      3: cardsByTab[3]?.length ?? 0,
    }),
    [cardsByTab],
  );

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
  const chosenAW = currentAW;

  return (
    <main className="relative flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* モード切替・適用中のローディングオーバーレイ */}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_10px_30px_rgba(58,50,74,0.25)]">
            <span className="block h-5 w-5 animate-spin rounded-full border-[3px] border-[#a695d8] border-t-transparent" />
            <span className="text-[13px] font-bold text-[#3a324a]">
              マッチング条件を更新中…
            </span>
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Title row */}
        <div className="flex items-start justify-between px-5 pb-1.5 pt-4">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-gray-900">
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
                  {tabCounts[t.id as 0 | 1 | 2 | 3] ?? 0}
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
        currentAW={currentAW}
        carryingItems={carryingItems}
      />
    </main>
  );
}
