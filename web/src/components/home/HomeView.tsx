"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
// iter134: ホーム画面のログアウト撤去に伴い logout import 不要
import { MatchDetailModal } from "./MatchDetailModal";
import {
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

/**
 * iter114: 2 つのタグ id 配列の Jaccard 類似度（0.0〜1.0）
 *
 * - 完全に同じタグ集合 = 1.0
 * - 重複タグ無し = 0.0
 * - 片方タグ無し = 0.0（共通要素ゼロのため）
 *
 * 関係図で「wish のタグと候補のタグがどれだけ一致するか」のスコア。
 * 高いほど類似 → 候補リストの上位に並べる。
 */
function jaccardScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersect = 0;
  for (const x of setA) if (setB.has(x)) intersect++;
  const union = setA.size + setB.size - intersect;
  return union > 0 ? intersect / union : 0;
}

/** Match を MatchCard 用データに変換（iter67.6: partner listings 対応 / iter67.8: 在庫情報） */
function matchToCard(
  m: Match,
  myInvById: Map<string, MatchInv>,
  myWishById: Map<string, MatchInv>,
  partnersInvById: Map<string, MatchInv>,
  partnersWishById: Map<string, MatchInv>,
  myInventoryQty: Record<string, number>,
  tagsByInvId: Record<string, string[]>,
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
      // iter104: 候補（相手側 inv）lookup
      //   my listing なら相手の inv（partnersInvById）から候補を引く
      //   partner listing なら私の inv（myInvById）から候補を引く
      const candidateLookup = isMyListing ? partnersInvById : myInvById;

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
          // iter104: この wish にヒットした候補（相手側 inv）を hydrate
          // iter114: タグ Jaccard 類似度の高い候補を上位に並べる
          const wishHits = opt.matchedHitsByWish.find((h) => h.wishId === id);
          const wishTags = tagsByInvId[id] ?? [];
          const candidates = (wishHits?.theirInvIds ?? [])
            .map((cid) => {
              const cinv = candidateLookup.get(cid);
              const candTags = tagsByInvId[cid] ?? [];
              return {
                item: cinv
                  ? toMini(cinv)
                  : {
                      id: cid,
                      label: "?",
                      goodsTypeName: null,
                      photoUrl: null,
                      hue: 0,
                    },
                qty: 1, // 候補側の qty は表示上 1 件で OK（在庫数は別途）
                _score: jaccardScore(wishTags, candTags),
              };
            })
            // タグ類似度（Jaccard）降順、同点は元の順
            .sort((a, b) => b._score - a._score)
            // 表示型に合わせて _score を落とす
            .map(({ item, qty }) => ({ item, qty }));
          return {
            item,
            qty: opt.wishQtys[i] ?? 1,
            candidates,
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
    userAvatarUrl: m.partner.avatarUrl,
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
    listingMatchKind: m.listingMatchKind,
    distanceText,
    localAvailable: m.localMatch === true,
    myInventoryQty,
  };
}

type CandidatePriority = 0 | 1 | 2;

type WishShelfCandidate = {
  key: string;
  card: MatchCardData;
  item: MiniItem;
  priority: CandidatePriority;
  local: boolean;
};

type WishShelfRow = {
  key: string;
  characterLabel: string;
  goodsTypeName: string;
  candidates: WishShelfCandidate[];
  bestPriority: CandidatePriority;
  localCount: number;
};

function getCandidatePriority(card: MatchCardData): CandidatePriority {
  const hasMyListing = !!card.myMatchedListings?.length;
  const hasPartnerListing = !!card.partnerMatchedListings?.length;
  if (hasMyListing && hasPartnerListing) return 0;
  if (hasMyListing || hasPartnerListing) return 1;
  return 2;
}

function getPriorityLabel(priority: CandidatePriority): string {
  if (priority === 0) return "双方条件";
  if (priority === 1) return "条件一致";
  return "通常候補";
}

function getPriorityClass(priority: CandidatePriority): string {
  if (priority === 0) return "bg-[#a695d8] text-white";
  if (priority === 1) return "bg-[#a8d4e633] text-[#5c8da8]";
  return "bg-[#f3c5d433] text-[#b66f87]";
}

function buildWishShelves(cards: MatchCardData[]): WishShelfRow[] {
  const sortedCards = [...cards].sort((a, b) => {
    const byPriority = getCandidatePriority(a) - getCandidatePriority(b);
    if (byPriority !== 0) return byPriority;
    const byLocal = Number(b.localAvailable === true) - Number(a.localAvailable === true);
    if (byLocal !== 0) return byLocal;
    return a.userHandle.localeCompare(b.userHandle, "ja");
  });

  const rows = new Map<string, WishShelfRow>();
  const seen = new Set<string>();

  for (const card of sortedCards) {
    const priority = getCandidatePriority(card);
    for (const item of card.theirGives) {
      const candidateKey = `${card.partnerId}:${item.id}`;
      if (seen.has(candidateKey)) continue;
      seen.add(candidateKey);

      const goodsTypeName = item.goodsTypeName ?? "グッズ";
      const rowKey = `${item.label}::${goodsTypeName}`;
      let row = rows.get(rowKey);
      if (!row) {
        row = {
          key: rowKey,
          characterLabel: item.label,
          goodsTypeName,
          candidates: [],
          bestPriority: priority,
          localCount: 0,
        };
        rows.set(rowKey, row);
      }

      const local = card.localAvailable === true;
      row.candidates.push({
        key: candidateKey,
        card,
        item,
        priority,
        local,
      });
      row.bestPriority = Math.min(row.bestPriority, priority) as CandidatePriority;
      if (local) row.localCount += 1;
    }
  }

  const result = [...rows.values()];
  for (const row of result) {
    row.candidates.sort((a, b) => {
      const byPriority = a.priority - b.priority;
      if (byPriority !== 0) return byPriority;
      const byLocal = Number(b.local) - Number(a.local);
      if (byLocal !== 0) return byLocal;
      return a.card.userHandle.localeCompare(b.card.userHandle, "ja");
    });
  }

  return result.sort((a, b) => {
    const byPriority = a.bestPriority - b.bestPriority;
    if (byPriority !== 0) return byPriority;
    const byLocalCount = b.localCount - a.localCount;
    if (byLocalCount !== 0) return byLocalCount;
    const byCount = b.candidates.length - a.candidates.length;
    if (byCount !== 0) return byCount;
    return a.characterLabel.localeCompare(b.characterLabel, "ja");
  });
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
  tagsByInvId,
  unreadNotificationCount = 0,
  isNationalView = false,
}: {
  profile: {
    handle: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
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
  /** iter114: inventory_id → tag_id[]（候補のタグ類似度ソート用） */
  tagsByInvId: Record<string, string[]>;
  /** iter92: 通知の未読数（ホームヘッダーのベルバッジ用） */
  unreadNotificationCount?: number;
  /** iter142: ?view=national の URL flag。現地モード ON でも全国一覧を表示 */
  isNationalView?: boolean;
}) {
  const [selectedCandidate, setSelectedCandidate] =
    useState<WishShelfCandidate | null>(null);

  const allCards = useMemo(() => {
    const myInvById = new Map(myInventory.map((i) => [i.id, i]));
    const myWishById = new Map(myWishes.map((w) => [w.id, w]));
    const partnersInvById = new Map(partnersInventory.map((i) => [i.id, i]));
    const partnersWishById = new Map(partnersWishes.map((w) => [w.id, w]));
    return matches.map((m) =>
      matchToCard(
        m,
        myInvById,
        myWishById,
        partnersInvById,
        partnersWishById,
        myInventoryQty,
        tagsByInvId,
      ),
    );
  }, [
    matches,
    myInventory,
    myWishes,
    partnersInventory,
    partnersWishes,
    myInventoryQty,
    tagsByInvId,
  ]);
  const wishShelves = useMemo(() => buildWishShelves(allCards), [allCards]);
  const totalCandidateCount = useMemo(
    () => wishShelves.reduce((sum, row) => sum + row.candidates.length, 0),
    [wishShelves],
  );
  const localCandidateCount = useMemo(
    () => wishShelves.reduce((sum, row) => sum + row.localCount, 0),
    [wishShelves],
  );

  // 現地モード state（DB から取得した初期値）
  const [sheetOpen, setSheetOpen] = useState(autoOpenLocalSheet);
  /** iter133: 現地交換モード OFF 確認ダイアログ */
  const [showOffConfirm, setShowOffConfirm] = useState(false);
  /**
   * iter129: 現地モード ON で開いた直後の sheet で、ユーザーが apply せず
   * close した場合に「全国」へ戻すための追跡フラグ
   * - handleEnableLocal で true にする
   * - sheet の onApplied で false にする
   * - sheet の onClose で「true のままなら disable して revert」
   */
  const [needsRevertOnClose, setNeedsRevertOnClose] = useState(false);
  const [pending, startTransition] = useTransition();
  // iter142: pill toggle で view 切替（DB は触らない）
  const router = useRouter();

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

  /**
   * iter140: AW が既に保存済の状態での即時再 ON
   * - sheet を開かない、GPS も取らない
   * - DB の enabled フラグだけ立てる（iter136 で AW は保持されている）
   */
  function handleQuickReenable() {
    startTransition(async () => {
      await enableLocalMode({});
    });
  }

  // 現地モード ON 切替時に GPS 取得
  function handleEnableLocal() {
    setNeedsRevertOnClose(true); // iter129: apply せずに閉じたら revert
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

  // iter142: handleDisableLocal は撤廃（pill から DB を切り替えなくなったため）
  //   真の OFF は ConfirmOffDialog onConfirm 内でインラインで disableLocalMode を呼ぶ

  // chosen AW info
  const chosenAW = currentAW;

  return (
    <main className="relative flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* iter130: 現地交換モード時の ambient glow（画面縁をふわっと光らせる） */}
      {isLocal && <div aria-hidden="true" className="local-mode-glow" />}

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
          <div className="flex items-center gap-2">
            {/* iter133 + iter140: 現地交換モードのトグル chip
                - isLocal=true：ON 表示、タップ → OFF 確認
                - isLocal=false：AW config が残っている場合 OFF 表示、タップで再 ON
                - AW がそもそも無い場合は非表示（初回はピル経由でセットアップ） */}
            {(isLocal || !!currentAW) && (
              <button
                type="button"
                onClick={() => {
                  if (isLocal) {
                    setShowOffConfirm(true);
                  } else {
                    // AW あり + isLocal=false → 即時再 ON（sheet 不要、iter140）
                    handleQuickReenable();
                  }
                }}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3 shadow-sm transition-colors ${
                  isLocal
                    ? "border-[#a695d855] bg-[#a695d80a] active:bg-[#a695d814]"
                    : "border-[#3a324a14] bg-white active:bg-[#3a324a08]"
                }`}
                aria-label={
                  isLocal
                    ? "現地交換モードを OFF にする"
                    : "現地交換モードを再開する"
                }
              >
                <span
                  className={`text-[11px] font-extrabold tracking-[0.3px] ${
                    isLocal ? "text-[#a695d8]" : "text-[#3a324a8c]"
                  }`}
                >
                  📍 現地交換モード
                </span>
                {/* トグルアイコン */}
                <span
                  aria-hidden="true"
                  className={`flex h-3.5 w-6 items-center rounded-full px-0.5 ${
                    isLocal ? "bg-[#a695d8]" : "bg-[#3a324a14]"
                  }`}
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full bg-white ${
                      isLocal ? "ml-auto" : ""
                    }`}
                  />
                </span>
              </button>
            )}
            <Link
              href="/search"
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
            </Link>
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white shadow-sm"
              aria-label="通知"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="#3a324a"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 6a4 4 0 018 0v3l1 2H2.5l1-2V6z" />
                <path d="M6 13.5a1.5 1.5 0 003 0" />
              </svg>
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#d9826b] px-1 text-[9px] font-extrabold tabular-nums text-white">
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* モード切替 pill
            iter142: pill は「view 切替」のみで DB を変えない。
            - 全国：?view=national にして AW フィルタを外す（現地モードは裏で ON のまま）
            - 現地：?view=national を外して AW フィルタを戻す
            真の OFF（DB 切替）は、上の chip タップ（確認ダイアログ）or 時間切れの 2 通りだけ。
            初回セットアップ時のみ handleEnableLocal で sheet を開く。 */}
        <div className="mx-5 mt-2 flex gap-1 rounded-full bg-[#3a324a0a] p-1">
          <button
            type="button"
            onClick={() => {
              if (!isNationalView) {
                router.push("/?view=national");
              }
            }}
            disabled={pending}
            className={`flex-1 rounded-full py-2 text-[12px] font-bold transition-all ${
              !isLocal || isNationalView
                ? "bg-white text-[#3a324a] shadow-[0_2px_6px_rgba(58,50,74,0.12)]"
                : "bg-transparent text-[#3a324a8c]"
            } disabled:opacity-50`}
          >
            🌐 全国交換モード
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLocal) {
                if (isNationalView) {
                  // 全国 view を見ていた状態 → 現地 view に戻す
                  router.push("/");
                } else {
                  // 既に現地 view → sheet を開いて設定変更
                  setSheetOpen(true);
                }
              } else if (currentAW) {
                // iter142.1: AW 設定済 + 現地 OFF → 即時 ON（chip と同じ挙動）
                //   sheet を開かない・revert flag も立てない
                handleQuickReenable();
              } else {
                // 初回セットアップ（AW 未設定 → sheet 必須）
                handleEnableLocal();
              }
            }}
            disabled={pending}
            className={`flex-1 rounded-full py-2 text-[12px] font-bold transition-all ${
              isLocal && !isNationalView
                ? "bg-white text-[#3a324a] shadow-[0_2px_6px_rgba(58,50,74,0.12)]"
                : "bg-transparent text-[#3a324a8c]"
            } disabled:opacity-50`}
          >
            📍 今すぐ現地交換モード
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
                  : "交換場所／時間／グッズを選択（タップ）"}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-gray-600">
                {chosenAW
                  ? `半径 ${chosenAW.radiusM >= 1000 ? `${(chosenAW.radiusM / 1000).toFixed(1)}km` : `${chosenAW.radiusM}m`}`
                  : "範囲は設定値を使用"}
                {" · "}
                持参 {settings.selectedCarryingIds.length} 件
              </div>
              {/* iter133: 時間帯と残り時間表示 */}
              {chosenAW && (
                <ActiveAWTimeRow
                  startAt={chosenAW.startAt}
                  endAt={chosenAW.endAt}
                />
              )}
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

        <section className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex items-end justify-between px-5">
            <div>
              <div className="text-[14px] font-extrabold tracking-[0.2px] text-gray-900">
                Wishに届いた譲
              </div>
              <div className="mt-0.5 text-[10.5px] font-medium text-gray-500">
                キャラ×種別ごとに候補を整理
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {localCandidateCount > 0 && (
                <span className="rounded-full bg-[#a695d8] px-2.5 py-1 text-[10px] font-extrabold tabular-nums text-white shadow-[0_3px_10px_rgba(166,149,216,0.28)]">
                  現地 {localCandidateCount}
                </span>
              )}
              <span className="rounded-full bg-[#3a324a0a] px-2.5 py-1 text-[10px] font-extrabold tabular-nums text-[#3a324a8c]">
                {totalCandidateCount}件
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
            {wishShelves.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white px-5 py-10 text-center">
                <div className="text-[13px] font-bold text-[#3a324a]">
                  現在マッチがありません
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-[#3a324a8c]">
                  Wish と譲の条件が重なると、ここに候補が並びます。
                </div>
              </div>
            ) : (
              wishShelves.map((row, idx) => (
                <WishShelfRowView
                  key={row.key}
                  row={row}
                  delayMs={idx * 55}
                  onSelect={setSelectedCandidate}
                />
              ))
            )}

            {/* iter134: ようこそ表示・ログアウトはホーム画面から撤廃
                （ログアウトは /profile に集約済） */}
          </div>
        </section>
      </div>

      {selectedCandidate && (
        <MatchDetailModal
          partnerHandle={selectedCandidate.card.userHandle}
          partnerId={selectedCandidate.card.partnerId}
          partnerAvatarUrl={selectedCandidate.card.userAvatarUrl}
          myAvatarUrl={profile?.avatar_url ?? null}
          myListings={selectedCandidate.card.myMatchedListings ?? []}
          partnerListings={selectedCandidate.card.partnerMatchedListings ?? []}
          myInventoryQty={selectedCandidate.card.myInventoryQty ?? {}}
          simpleReceives={[selectedCandidate.item]}
          simpleGives={selectedCandidate.card.myGives}
          simpleProposeHref={buildSimpleProposeHref(selectedCandidate)}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* 現地モード設定シート（iter129: apply 無しで close したら全国へ revert） */}
      <LocalModeSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          if (needsRevertOnClose) {
            // 適用せずに閉じた → 全国モードに戻す
            startTransition(async () => {
              await disableLocalMode();
            });
          }
          setNeedsRevertOnClose(false);
        }}
        onApplied={() => {
          // 適用成功 → revert フラグをクリア（モード ON で確定）
          setNeedsRevertOnClose(false);
        }}
        initial={settings}
        currentAW={currentAW}
        carryingItems={carryingItems}
      />

      {/* iter133: 現地交換モード OFF 確認ダイアログ */}
      {showOffConfirm && (
        <ConfirmOffDialog
          onCancel={() => setShowOffConfirm(false)}
          onConfirm={() => {
            setShowOffConfirm(false);
            // iter142: 真の OFF（DB enabled=false）+ ?view=national を外す
            startTransition(async () => {
              await disableLocalMode();
              if (isNationalView) {
                router.push("/");
              }
            });
          }}
        />
      )}
    </main>
  );
}

function buildSimpleProposeHref(candidate: WishShelfCandidate): string {
  const params = new URLSearchParams();
  params.set("matchType", candidate.card.matchType);
  params.set("receives", candidate.item.id);
  if (candidate.card.myGives.length > 0) {
    params.set("gives", candidate.card.myGives.map((i) => i.id).join(","));
  }
  return `/propose/${candidate.card.partnerId}?${params.toString()}`;
}

function WishShelfRowView({
  row,
  delayMs,
  onSelect,
}: {
  row: WishShelfRow;
  delayMs: number;
  onSelect: (candidate: WishShelfCandidate) => void;
}) {
  return (
    <section
      className="animate-section-fade-down rounded-[18px] border border-[#3a324a10] bg-white py-3 shadow-[0_6px_18px_rgba(58,50,74,0.06)]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3 px-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[14px] font-extrabold leading-tight text-[#3a324a]">
              {row.characterLabel}
            </h2>
            <span className="flex-shrink-0 text-[11px] font-bold text-[#3a324a66]">
              × {row.goodsTypeName}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-bold text-[#3a324a73]">
            <span>{getPriorityLabel(row.bestPriority)}</span>
            <span className="text-[#3a324a33]">/</span>
            <span className="tabular-nums">候補 {row.candidates.length}件</span>
            {row.localCount > 0 && (
              <>
                <span className="text-[#3a324a33]">/</span>
                <span className="tabular-nums text-[#a695d8]">
                  現地 {row.localCount}件
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-1 text-[9.5px] font-extrabold ${getPriorityClass(
            row.bestPriority,
          )}`}
        >
          {getPriorityLabel(row.bestPriority)}
        </span>
      </div>

      <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-8 pb-1.5 pt-1 [&::-webkit-scrollbar]:hidden">
        {row.candidates.map((candidate) => (
          <WishShelfTile
            key={candidate.key}
            candidate={candidate}
            onSelect={() => onSelect(candidate)}
          />
        ))}
      </div>
    </section>
  );
}

function WishShelfTile({
  candidate,
  onSelect,
}: {
  candidate: WishShelfCandidate;
  onSelect: () => void;
}) {
  const item = candidate.item;
  const hasPhoto = !!item.photoUrl;
  const fallbackBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 78%) 6px 12px)`;
  const handle =
    candidate.card.userHandle.length > 11
      ? `${candidate.card.userHandle.slice(0, 10)}…`
      : candidate.card.userHandle;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-[88px] flex-shrink-0 text-left active:scale-[0.97]"
      aria-label={`${item.label}の候補を開く`}
    >
      <div
        className="relative h-[112px] w-[88px] overflow-hidden rounded-[13px] border border-[#3a324a12] bg-[#f4f1f7] shadow-[0_5px_14px_rgba(58,50,74,0.12)] transition-transform duration-150 group-hover:-translate-y-0.5"
        style={{ background: hasPhoto ? "#3a324a" : fallbackBg }}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl!}
            alt={item.label}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[26px] font-extrabold text-white/95 drop-shadow">
            {item.label[0] ?? "?"}
          </span>
        )}
        {candidate.local && (
          <span className="absolute left-1 top-1 rounded-full bg-[#a695d8] px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_2px_8px_rgba(166,149,216,0.35)]">
            LIVE
          </span>
        )}
      </div>
      <div className="mt-1.5 min-w-0">
        <span
          className={`inline-flex max-w-full rounded-full px-1.5 py-[2px] text-[8.5px] font-extrabold ${getPriorityClass(
            candidate.priority,
          )}`}
        >
          {getPriorityLabel(candidate.priority)}
        </span>
        <div className="mt-1 truncate text-[10px] font-bold text-[#3a324a]">
          @{handle}
        </div>
        <div className="mt-0.5 truncate text-[9.5px] text-[#3a324a80]">
          {candidate.card.distanceText ?? candidate.card.distance}
        </div>
      </div>
    </button>
  );
}

/* ─── iter133: AW の時間帯 + 残り時間表示 ─── */

function ActiveAWTimeRow({
  startAt,
  endAt,
}: {
  startAt: string;
  endAt: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  // 1 分ごとに残り時間を更新
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(startAt);
  const end = new Date(endAt);
  const hh = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const remainMs = end.getTime() - now;
  const beforeStart = now < start.getTime();

  let remainText: string;
  if (beforeStart) {
    const minsToStart = Math.max(0, Math.floor((start.getTime() - now) / 60000));
    if (minsToStart >= 60) {
      remainText = `あと ${Math.floor(minsToStart / 60)}h ${minsToStart % 60}m で開始`;
    } else {
      remainText = `あと ${minsToStart} 分で開始`;
    }
  } else if (remainMs > 0) {
    const mins = Math.floor(remainMs / 60000);
    if (mins >= 60) {
      remainText = `あと ${Math.floor(mins / 60)}h ${mins % 60}m で終了`;
    } else {
      remainText = `あと ${mins} 分で終了`;
    }
  } else {
    remainText = "終了済み";
  }

  return (
    <div className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-[#a695d8]">
      <span>🕒</span>
      <span className="font-bold">
        {hh(start)} - {hh(end)}
      </span>
      <span className="text-[#3a324a8c]">·</span>
      <span className={remainMs > 0 ? "font-extrabold" : ""}>{remainText}</span>
    </div>
  );
}

/* ─── iter133: 現地交換モード OFF 確認ダイアログ ─── */

function ConfirmOffDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[18px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">📍</span>
            <span className="text-[14px] font-extrabold text-[#3a324a]">
              現地交換モードを OFF にしますか？
            </span>
          </div>
          <div className="mt-2 text-[11.5px] leading-relaxed text-[#3a324a8c]">
            全国交換モードに切り替わります。設定した場所・時間・持参グッズは
            保存されたまま、いつでも再開できます。
          </div>
        </div>
        <div className="flex gap-2 border-t border-[#3a324a08] bg-[#fbf9fc] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[10px] border border-[#3a324a14] bg-white py-2.5 text-[12px] font-extrabold text-[#3a324a]"
          >
            このまま続ける
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[10px] bg-[#3a324a] py-2.5 text-[12px] font-extrabold text-white shadow-[0_2px_6px_rgba(58,50,74,0.25)]"
          >
            OFF にする
          </button>
        </div>
      </div>
    </div>
  );
}
