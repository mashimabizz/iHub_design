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
  /**
   * iter67.3：listing 経由のマッチで、その listing 構造（AND/OR、qty）を
   * UI 側でバッジ・関係図モーダルに使うため伝播
   */
  matchedListings?: MatchedListingInfo[];
};

export type MatchedListingInfo = {
  listingId: string;
  haveLogic: "and" | "or";
  wishLogic: "and" | "or";
  /** マッチに寄与した私の譲（haveIds の subset） */
  matchedHaveIds: string[];
  /** マッチに寄与した相手アイテム（私の wish_ids の subset と対応） */
  matchedTheirInvIds: string[];
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

/**
 * iter67.3：listings は have/wish 両側で複数 + AND/OR をサポート。
 *
 * 旧モデル: inventoryId (single) + wishIds[]
 * 新モデル: haveIds[] + haveQtys[] + haveLogic / wishIds[] + wishQtys[] + wishLogic
 *
 * 制約：have_logic='or' AND wish_logic='or' AND 両側 ≥2 アイテム は禁止（DB CHECK）
 */
export type ListingForMatch = {
  id: string;
  haveIds: string[];
  haveQtys: number[];
  haveLogic: "and" | "or";
  wishIds: string[];
  wishQtys: number[];
  wishLogic: "and" | "or";
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
  myInvById: Map<string, MatchInv>;
  partnerInv: MatchInv[];
  partnerWishes: MatchInv[];
  partner: UserSummary;
}): Match | null {
  const {
    myInventory,
    myWishes,
    myListings,
    myWishById,
    myInvById,
    partnerInv,
    partnerWishes,
    partner,
  } = input;

  /* ─── どの私の譲が listing でカバーされているか ─── */
  const listingsCoveringInv = new Map<string, ListingForMatch[]>();
  for (const l of myListings) {
    for (const hid of l.haveIds) {
      const arr = listingsCoveringInv.get(hid) ?? [];
      arr.push(l);
      listingsCoveringInv.set(hid, arr);
    }
  }

  /* ─── 結果プール ─── */
  const myGivesMap = new Map<string, MatchInv>();
  const theirGivesMap = new Map<string, MatchInv>();
  const matchedListings: MatchedListingInfo[] = [];
  let viaListing = false;

  /* ─── 1. listing 駆動マッチ（譲側＝listing.have、求側＝listing.wish_ids 経由） ─── */
  for (const l of myListings) {
    const lm = evaluateListingMatch(l, myInvById, myWishById, partnerInv);
    if (!lm) continue;
    viaListing = true;
    matchedListings.push({
      listingId: l.id,
      haveLogic: l.haveLogic,
      wishLogic: l.wishLogic,
      matchedHaveIds: lm.matchedHaveIds,
      matchedTheirInvIds: lm.matchedTheirInvIds,
    });
    // 譲 / 受 group に登録
    for (const id of lm.matchedHaveIds) {
      const inv = myInvById.get(id);
      if (inv) myGivesMap.set(inv.id, inv);
    }
    for (const id of lm.matchedTheirInvIds) {
      const inv = partnerInv.find((p) => p.id === id);
      if (inv) theirGivesMap.set(inv.id, inv);
    }
  }

  /* ─── 2. 通常マッチ（listing にカバーされていない譲・求） ─── */

  // forward: 私の譲が相手の wish にヒット（listing 駆動でない譲のみ）
  for (const myInv of myInventory) {
    if (myGivesMap.has(myInv.id)) continue;
    if (listingsCoveringInv.has(myInv.id)) continue; // listing 側でハンドル済み
    for (const theirWish of partnerWishes) {
      if (isMatching(myInv, theirWish)) {
        myGivesMap.set(myInv.id, myInv);
        break;
      }
    }
  }

  // backward: 相手の譲が私の wish にヒット（listing 経由で既出のものは除く）
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
    matchedListings: matchedListings.length > 0 ? matchedListings : undefined,
  };
}

/**
 * 1 listing が相手とマッチするかを判定。
 *
 * 仕様:
 * - have_logic = AND ⇒ haveIds 全件が「相手の wish 群のいずれか」にヒットする必要あり
 * - have_logic = OR  ⇒ haveIds のうち少なくとも 1 件が相手 wish にヒット
 * - wish_logic = AND ⇒ wishIds 全件が「相手の譲群」にヒットする必要あり
 * - wish_logic = OR  ⇒ wishIds のうち少なくとも 1 件が相手 譲 にヒット
 *
 * 「ヒット」= isMatching() 真（goods_type + character/group の一致）
 *
 * 数量 (qty) は MVP では判定に用いない（タグ表示のみ）。実数量は打診で個別調整する想定。
 *
 * 注：相手側にも listing があり得るが、MVP では考慮しない（自分側 listing で完結）。
 *
 * @returns null = マッチ不成立 / { matchedHaveIds, matchedTheirInvIds } = 寄与した ID 群
 */
function evaluateListingMatch(
  listing: ListingForMatch,
  myInvById: Map<string, MatchInv>,
  myWishById: Map<string, MatchInv>,
  partnerInv: MatchInv[],
): { matchedHaveIds: string[]; matchedTheirInvIds: string[] } | null {
  /* ─ have 側評価：自分の譲が相手の wish にヒットするか ─ */
  // partnerWishes は呼び出し側で持つが、ここでは partnerInv を使った逆向きチェックのみ
  // （iter67.3 MVP：listing 経由は私 give→相手 wish の forward 方向は通常マッチで拾う）
  // よって listing.haveLogic は ここでは「全 have が listing.wishIds（相手の対応譲群）と整合」でチェック

  /* ─ wish 側評価：listing.wishIds に対して、相手の譲がどれだけヒットするか ─ */
  const matchedTheirInvByWishId = new Map<string, string[]>(); // wishId → matched theirInv ids
  for (const wid of listing.wishIds) {
    const myWish = myWishById.get(wid);
    if (!myWish) continue;
    const hits = partnerInv
      .filter((p) => isMatching(p, myWish))
      .map((p) => p.id);
    if (hits.length > 0) {
      matchedTheirInvByWishId.set(wid, hits);
    }
  }

  // wish_logic 評価
  const wishMatched =
    listing.wishLogic === "and"
      ? listing.wishIds.every((wid) => matchedTheirInvByWishId.has(wid))
      : matchedTheirInvByWishId.size > 0;

  if (!wishMatched) return null;

  /* ─ have 側：listing が wish 側でマッチしたなら、listing の have すべてが
     trade に出ると見なす（have_logic=AND なら全件、OR なら任意 1 件以上で OK）─ */
  const matchedHaveIds: string[] =
    listing.haveLogic === "and"
      ? listing.haveIds.filter((hid) => myInvById.has(hid))
      : listing.haveIds.filter((hid) => myInvById.has(hid)).slice(0, 1); // OR は最初の 1 件を仮表示

  if (matchedHaveIds.length === 0) return null;

  // 相手側ヒットアイテム集合（重複除去）
  const matchedTheirInvIds = Array.from(
    new Set(Array.from(matchedTheirInvByWishId.values()).flat()),
  );
  return { matchedHaveIds, matchedTheirInvIds };
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
  const myInvById = new Map<string, MatchInv>();
  for (const i of input.myInventory) myInvById.set(i.id, i);

  const matches: Match[] = [];
  for (const p of input.partners) {
    const m = matchPair({
      myInventory: input.myInventory,
      myWishes: input.myWishes,
      myListings: input.myListings,
      myWishById,
      myInvById,
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
