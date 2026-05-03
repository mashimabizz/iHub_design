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
  searchParams: Promise<{ matchType?: string }>;
};

export default async function ProposePage({ params, searchParams }: Props) {
  const { partnerId } = await params;
  const { matchType: matchTypeRaw } = await searchParams;

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
  ]);

  if (!partner) notFound();

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

  return (
    <ProposeFlow
      partner={{
        id: partner.id,
        handle: partner.handle,
        displayName: partner.display_name,
        primaryArea: partner.primary_area,
      }}
      myInv={myInvWithFlag}
      theirInv={theirInvWithFlag}
      matchType={matchType}
    />
  );
}
