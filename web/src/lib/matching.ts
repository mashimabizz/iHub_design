/**
 * iHub マッチング演算（純関数）
 *
 * 仕様: notes/18_matching_v2_design.md
 *
 * MVP のスコープ:
 * - 完全マッチ / 片方向マッチ（forward / backward）
 * - 個別募集（listings）の優先: 譲 X に listing があれば、その listing.wish_ids
 *   群でしかマッチしない（通常 wish より優先）
 * - 同種 / 異種 / どちらでも は **タグ表示のみ**、判定には使わない（§A-1）
 * - 時空交差は呼び出し側で別途フィルタ（mode=local の時）
 */

export type MatchInv = {
  id: string;
  userId: string;
  groupId: string | null;
  characterId: string | null;
  characterRequestId: string | null;
  goodsTypeId: string;
  title: string;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  exchangeType: "same_kind" | "cross_kind" | "any";
};

export type UserSummary = {
  id: string;
  handle: string;
  displayName: string;
  primaryArea: string | null;
};

export type Match = {
  partner: UserSummary;
  matchType: "complete" | "they_want_you" | "you_want_them";
  /** 私が出す譲 = 相手の wish にヒットしたもの */
  myGives: MatchInv[];
  /** 相手の譲 = 私の wish にヒットしたもの */
  theirGives: MatchInv[];
  /** 個別募集経由のマッチか */
  viaListing: boolean;
};

/**
 * 1 アイテム同士のマッチ判定。
 *
 * - 同じ goods_type_id が必須
 * - キャラ指定がある場合は character_id 一致必須
 * - キャラ指定がない場合は group_id 一致でマッチ（箱推し的）
 */
export function isMatching(my: MatchInv, theirs: MatchInv): boolean {
  if (my.goodsTypeId !== theirs.goodsTypeId) return false;
  if (my.characterId && theirs.characterId) {
    return my.characterId === theirs.characterId;
  }
  // どちらかキャラ未指定 → group_id で判定（共に group_id 必須）
  if (!my.groupId || !theirs.groupId) return false;
  return my.groupId === theirs.groupId;
}

export type ListingForMatch = {
  inventoryId: string;
  wishIds: string[]; // listings.wish_ids
};

/**
 * 私 × 1 パートナー の組合せに対してマッチを 1 つ計算。
 *
 * @param myInventory 私の譲 (kind=for_trade, status=active)
 * @param myWishes    私の wish (kind=wanted, status=active)
 * @param myListings  私の active な listings（譲 X → wish_ids 配列）
 * @param myWishById  私の wish を id で引く Map（listings の wish_ids 解決用）
 * @param partnerInv  相手の譲
 * @param partnerWishes 相手の wish
 * @param partner   相手の UserSummary
 */
export function matchPair(input: {
  myInventory: MatchInv[];
  myWishes: MatchInv[];
  myListings: ListingForMatch[];
  myWishById: Map<string, MatchInv>;
  partnerInv: MatchInv[];
  partnerWishes: MatchInv[];
  partner: UserSummary;
}): Match | null {
  const {
    myInventory,
    myWishes,
    myListings,
    myWishById,
    partnerInv,
    partnerWishes,
    partner,
  } = input;

  // 譲アイテム ID → 関連 listing の wish_ids を Map 化
  const listingByInvId = new Map<string, string[]>();
  for (const l of myListings) {
    listingByInvId.set(l.inventoryId, l.wishIds);
  }

  let viaListing = false;

  // ─── forward: 私の譲 X が相手の wish Y にヒット ───
  const myGivesMap = new Map<string, MatchInv>();
  for (const myInv of myInventory) {
    for (const theirWish of partnerWishes) {
      if (isMatching(myInv, theirWish)) {
        myGivesMap.set(myInv.id, myInv);
        break;
      }
    }
  }

  // ─── backward: 相手の譲 Y が私の wish にヒット ───
  // listing がある譲 X については、その listing.wish_ids を使う（通常 wish より優先）
  const theirGivesMap = new Map<string, MatchInv>();

  // listing 経由のマッチを優先計算
  for (const myInv of myInventory) {
    const wishIds = listingByInvId.get(myInv.id);
    if (!wishIds) continue;
    const relevantWishes = wishIds
      .map((wid) => myWishById.get(wid))
      .filter((w): w is MatchInv => !!w);
    for (const theirInv of partnerInv) {
      for (const myWish of relevantWishes) {
        if (isMatching(theirInv, myWish)) {
          theirGivesMap.set(theirInv.id, theirInv);
          viaListing = true;
          break;
        }
      }
    }
  }

  // 通常 wish マッチ（listing にカバーされていない譲 + 通常 wish）
  // listing が一つも無い場合は myWishes 全件、ある場合でも追加検査
  for (const theirInv of partnerInv) {
    if (theirGivesMap.has(theirInv.id)) continue;
    for (const myWish of myWishes) {
      if (isMatching(theirInv, myWish)) {
        theirGivesMap.set(theirInv.id, theirInv);
        break;
      }
    }
  }

  if (myGivesMap.size === 0 && theirGivesMap.size === 0) return null;

  let matchType: Match["matchType"];
  if (myGivesMap.size > 0 && theirGivesMap.size > 0) {
    matchType = "complete";
  } else if (myGivesMap.size > 0) {
    matchType = "they_want_you";
  } else {
    matchType = "you_want_them";
  }

  return {
    partner,
    matchType,
    myGives: Array.from(myGivesMap.values()),
    theirGives: Array.from(theirGivesMap.values()),
    viaListing,
  };
}

/**
 * 全パートナーに対してマッチを計算し、ソート済み配列を返す。
 *
 * ソート: complete > they_want_you = you_want_them
 *         同タイプ内では viaListing 優先
 */
export function computeAllMatches(input: {
  myInventory: MatchInv[];
  myWishes: MatchInv[];
  myListings: ListingForMatch[];
  partners: Array<{
    user: UserSummary;
    inventory: MatchInv[];
    wishes: MatchInv[];
  }>;
}): Match[] {
  const myWishById = new Map<string, MatchInv>();
  for (const w of input.myWishes) myWishById.set(w.id, w);

  const matches: Match[] = [];
  for (const p of input.partners) {
    const m = matchPair({
      myInventory: input.myInventory,
      myWishes: input.myWishes,
      myListings: input.myListings,
      myWishById,
      partnerInv: p.inventory,
      partnerWishes: p.wishes,
      partner: p.user,
    });
    if (m) matches.push(m);
  }

  // ソート
  const order = { complete: 0, they_want_you: 1, you_want_them: 2 } as const;
  matches.sort((a, b) => {
    const oa = order[a.matchType];
    const ob = order[b.matchType];
    if (oa !== ob) return oa - ob;
    // listing 優先
    if (a.viaListing !== b.viaListing) return a.viaListing ? -1 : 1;
    return 0;
  });

  return matches;
}

/**
 * UI ラベル生成（マッチカードの「譲・受」に使う）。
 *
 * 例: "スア トレカ / ヒナ 缶バッジ +2"
 */
export function buildLabel(items: MatchInv[]): string {
  if (items.length === 0) return "—";
  const labels = items.slice(0, 3).map((it) =>
    `${it.characterName ?? it.groupName ?? "?"} ${it.goodsTypeName ?? ""}`.trim(),
  );
  const main = labels.join(" / ");
  return items.length > 3 ? `${main} +${items.length - 3}` : main;
}

/**
 * 2 点間の距離（メートル）— Haversine 公式
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // 地球半径 m
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * AW の時空交差判定: 時間帯が重なる + 距離が radius 内
 */
export function awsOverlap(
  myAW: {
    startAt: string;
    endAt: string;
    centerLat: number | null;
    centerLng: number | null;
    radiusM: number;
  },
  theirAW: {
    startAt: string;
    endAt: string;
    centerLat: number | null;
    centerLng: number | null;
    radiusM: number;
  },
): boolean {
  // 時間
  const myStart = new Date(myAW.startAt).getTime();
  const myEnd = new Date(myAW.endAt).getTime();
  const theirStart = new Date(theirAW.startAt).getTime();
  const theirEnd = new Date(theirAW.endAt).getTime();
  if (myEnd < theirStart || theirEnd < myStart) return false;

  // 空間（座標がなければ時間だけ重なれば OK と扱う）
  if (
    myAW.centerLat === null ||
    myAW.centerLng === null ||
    theirAW.centerLat === null ||
    theirAW.centerLng === null
  ) {
    return true;
  }
  const dist = haversineMeters(
    myAW.centerLat,
    myAW.centerLng,
    theirAW.centerLat,
    theirAW.centerLng,
  );
  // 双方の半径合計内なら交差
  return dist <= myAW.radiusM + theirAW.radiusM;
}
