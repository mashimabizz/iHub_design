import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposeFlow, type ProposeInv } from "./ProposeFlow";

export const metadata = {
  title: "打診 — iHub",
};

type GoodsRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  character_id: string | null;
  goods_type_id: string | null;
  title: string;
  photo_urls: string[] | null;
  quantity: number;
  group: { name: string } | { name: string }[] | null;
  character: { name: string } | { name: string }[] | null;
  goods_type: { name: string } | { name: string }[] | null;
};

function pickName(
  v: { name: string } | { name: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0]?.name ?? null : v.name;
}

function toInv(r: GoodsRow): ProposeInv | null {
  if (!r.goods_type_id) return null;
  return {
    id: r.id,
    title: r.title,
    quantity: r.quantity,
    photoUrl: (r.photo_urls && r.photo_urls[0]) ?? null,
    groupId: r.group_id,
    characterId: r.character_id,
    goodsTypeId: r.goods_type_id,
    groupName: pickName(r.group),
    characterName: pickName(r.character),
    goodsTypeName: pickName(r.goods_type),
  };
}

type Props = {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{
    matchType?: string;
    /** iter67.7: 関係図モーダルから打診開始した時の listing id */
    listing?: string;
    /** iter67.7: その listing の選択肢 position（1〜5） */
    option?: string;
  }>;
};

export default async function ProposePage({ params, searchParams }: Props) {
  const { partnerId } = await params;
  const {
    matchType: matchTypeRaw,
    listing: listingIdRaw,
    option: optionRaw,
  } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === partnerId) redirect("/");

  const goodsSelect =
    "id, user_id, group_id, character_id, goods_type_id, title, photo_urls, quantity, group:groups_master(name), character:characters_master(name), goods_type:goods_types_master(name)";

  const [
    { data: partner },
    { data: myInvRaw },
    { data: theirInvRaw },
    { data: myWishesRaw },
    { data: theirWishesRaw },
    { data: partnerLocalMode },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, handle, display_name, primary_area")
      .eq("id", partnerId)
      .maybeSingle(),
    supabase
      .from("goods_inventory")
      .select(goodsSelect)
      .eq("user_id", user.id)
      .eq("kind", "for_trade")
      .eq("status", "active"),
    supabase
      .from("goods_inventory")
      .select(goodsSelect)
      .eq("user_id", partnerId)
      .eq("kind", "for_trade")
      .eq("status", "active"),
    supabase
      .from("goods_inventory")
      .select(goodsSelect)
      .eq("user_id", user.id)
      .eq("kind", "wanted")
      .neq("status", "archived"),
    supabase
      .from("goods_inventory")
      .select(goodsSelect)
      .eq("user_id", partnerId)
      .eq("kind", "wanted")
      .neq("status", "archived"),
    // 相手の現地モード設定（enabled & aw_id）
    supabase
      .from("user_local_mode_settings")
      .select("enabled, aw_id, last_lat, last_lng")
      .eq("user_id", partnerId)
      .maybeSingle(),
  ]);

  if (!partner) notFound();

  // 相手の現地モード AW（venue/座標/時間帯）を取得
  let partnerAW: {
    venue: string;
    centerLat: number | null;
    centerLng: number | null;
    startAt: string;
    endAt: string;
  } | null = null;
  if (partnerLocalMode?.enabled && partnerLocalMode.aw_id) {
    const { data: aw } = await supabase
      .from("activity_windows")
      .select("venue, center_lat, center_lng, start_at, end_at")
      .eq("id", partnerLocalMode.aw_id)
      .maybeSingle();
    if (aw) {
      partnerAW = {
        venue: aw.venue,
        centerLat: aw.center_lat,
        centerLng: aw.center_lng,
        startAt: aw.start_at,
        endAt: aw.end_at,
      };
    }
  }

  const myInv = ((myInvRaw as GoodsRow[]) ?? [])
    .map(toInv)
    .filter((x): x is ProposeInv => !!x);
  const theirInv = ((theirInvRaw as GoodsRow[]) ?? [])
    .map(toInv)
    .filter((x): x is ProposeInv => !!x);
  const myWishes = ((myWishesRaw as GoodsRow[]) ?? [])
    .map(toInv)
    .filter((x): x is ProposeInv => !!x);
  const theirWishes = ((theirWishesRaw as GoodsRow[]) ?? [])
    .map(toInv)
    .filter((x): x is ProposeInv => !!x);

  // wish 一致 pre-check 用：相手の wish にヒットする自分の譲、自分の wish にヒットする相手の譲
  function isHit(my: ProposeInv, theirs: ProposeInv): boolean {
    if (my.goodsTypeId !== theirs.goodsTypeId) return false;
    if (my.characterId && theirs.characterId)
      return my.characterId === theirs.characterId;
    if (!my.groupId || !theirs.groupId) return false;
    return my.groupId === theirs.groupId;
  }
  const myInvWithFlag = myInv.map((m) => ({
    ...m,
    wishMatch: theirWishes.some((w) => isHit(m, w)),
  }));
  const theirInvWithFlag = theirInv.map((t) => ({
    ...t,
    wishMatch: myWishes.some((w) => isHit(t, w)),
  }));

  const matchType: "perfect" | "forward" | "backward" =
    matchTypeRaw === "they_want_you"
      ? "forward"
      : matchTypeRaw === "you_want_them"
        ? "backward"
        : matchTypeRaw === "complete" || matchTypeRaw === "perfect"
          ? "perfect"
          : "perfect";

  /* ─ iter67.7：listing / option 経由打診の初期値プリフィル ─ */
  type Initial = {
    senderHaveIds: string[];
    senderHaveQtys: number[];
    receiverHaveIds: string[];
    receiverHaveQtys: number[];
    cashOffer?: { amount: number };
    listingId?: string;
  } | null;
  let initial: Initial = null;

  if (listingIdRaw && optionRaw) {
    const optionPos = parseInt(optionRaw, 10);
    if (Number.isFinite(optionPos) && optionPos >= 1 && optionPos <= 5) {
      // listing と該当 option を fetch（自分の listing or 相手の listing を区別せず両方試す）
      const [{ data: listingRow }, { data: optionRow }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, user_id, have_ids, have_qtys, status")
          .eq("id", listingIdRaw)
          .maybeSingle(),
        supabase
          .from("listing_wish_options")
          .select(
            "id, listing_id, position, wish_ids, wish_qtys, is_cash_offer, cash_amount",
          )
          .eq("listing_id", listingIdRaw)
          .eq("position", optionPos)
          .maybeSingle(),
      ]);

      if (listingRow && optionRow) {
        const isMyListing = listingRow.user_id === user.id;
        const haveIds = (listingRow.have_ids as string[]) ?? [];
        const haveQtys = (listingRow.have_qtys as number[]) ?? [];
        const wishIds = (optionRow.wish_ids as string[]) ?? [];
        const wishQtys = (optionRow.wish_qtys as number[]) ?? [];

        if (isMyListing) {
          // 自分の listing: senderHave = listing.haves、receiverHave = option.wishes に対応する相手の譲
          const matchedTheirIds: string[] = [];
          const matchedTheirQtys: number[] = [];
          for (let i = 0; i < wishIds.length; i++) {
            const myWish = myWishes.find((w) => w.id === wishIds[i]);
            if (!myWish) continue;
            const partnerHits = theirInvWithFlag.filter((t) => {
              if (t.goodsTypeId !== myWish.goodsTypeId) return false;
              if (myWish.characterId && t.characterId)
                return myWish.characterId === t.characterId;
              return (
                !!myWish.groupId &&
                !!t.groupId &&
                myWish.groupId === t.groupId
              );
            });
            for (const h of partnerHits) {
              if (!matchedTheirIds.includes(h.id)) {
                matchedTheirIds.push(h.id);
                matchedTheirQtys.push(wishQtys[i] ?? 1);
              }
            }
          }
          if (optionRow.is_cash_offer) {
            initial = {
              senderHaveIds: haveIds,
              senderHaveQtys: haveQtys,
              receiverHaveIds: [],
              receiverHaveQtys: [],
              cashOffer: { amount: optionRow.cash_amount as number },
              listingId: listingRow.id,
            };
          } else {
            initial = {
              senderHaveIds: haveIds,
              senderHaveQtys: haveQtys,
              receiverHaveIds: matchedTheirIds,
              receiverHaveQtys: matchedTheirQtys,
              listingId: listingRow.id,
            };
          }
        } else if (listingRow.user_id === partnerId) {
          // 相手の listing: senderHave = option.wishes に対応する **私の譲**、receiverHave = listing.haves（相手側）
          const matchedMyIds: string[] = [];
          const matchedMyQtys: number[] = [];
          for (let i = 0; i < wishIds.length; i++) {
            const theirWish = theirWishes.find((w) => w.id === wishIds[i]);
            if (!theirWish) continue;
            const myHits = myInvWithFlag.filter((m) => {
              if (m.goodsTypeId !== theirWish.goodsTypeId) return false;
              if (theirWish.characterId && m.characterId)
                return theirWish.characterId === m.characterId;
              return (
                !!theirWish.groupId &&
                !!m.groupId &&
                theirWish.groupId === m.groupId
              );
            });
            for (const h of myHits) {
              if (!matchedMyIds.includes(h.id)) {
                matchedMyIds.push(h.id);
                matchedMyQtys.push(wishQtys[i] ?? 1);
              }
            }
          }
          if (optionRow.is_cash_offer) {
            // 相手 listing の cash 選択肢：相手が金銭を求めている = 私が金銭を出して相手の haves を受け取る
            // 私の譲 = 金銭、私が受け取る = 相手の haves（listing.have_ids）
            initial = {
              senderHaveIds: [],
              senderHaveQtys: [],
              receiverHaveIds: haveIds,
              receiverHaveQtys: haveQtys,
              cashOffer: { amount: optionRow.cash_amount as number },
              listingId: listingRow.id,
            };
          } else {
            initial = {
              senderHaveIds: matchedMyIds,
              senderHaveQtys: matchedMyQtys,
              receiverHaveIds: haveIds,
              receiverHaveQtys: haveQtys,
              listingId: listingRow.id,
            };
          }
        }
      }
    }
  }

  return (
    <ProposeFlow
      partner={{
        id: partner.id,
        handle: partner.handle,
        displayName: partner.display_name,
        primaryArea: partner.primary_area,
        localModeEnabled: !!partnerLocalMode?.enabled,
        localModeAW: partnerAW,
      }}
      myInv={myInvWithFlag}
      theirInv={theirInvWithFlag}
      matchType={matchType}
      initial={initial ?? undefined}
    />
  );
}
