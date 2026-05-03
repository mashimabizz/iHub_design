import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { UserProfileView, type UserProfileData } from "./UserProfileView";

export const metadata = {
  title: "ユーザーのプロフィール — iHub",
};

export default async function UserPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();
  if (!me) redirect("/login");
  // 自分のプロフは /profile へ
  if (me.id === id) redirect("/profile");

  const { data: user } = await supabase
    .from("users")
    .select("id, handle, display_name, avatar_url, primary_area, account_status")
    .eq("id", id)
    .maybeSingle();
  if (!user) notFound();
  if (
    user.account_status === "deleted" ||
    user.account_status === "suspended"
  ) {
    notFound();
  }

  // 評価サマリ + 最新コメント
  const { data: evals } = await supabase
    .from("user_evaluations")
    .select("stars, comment, created_at, rater_id")
    .eq("ratee_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const stars = (evals ?? []).map((e) => e.stars as number);
  const ratingAvg =
    stars.length > 0 ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
  const ratingCount = stars.length;

  // 評価コメントの rater handle を fetch
  const raterIds = Array.from(
    new Set((evals ?? []).map((e) => e.rater_id as string)),
  );
  const handlesById = new Map<string, string>();
  if (raterIds.length > 0) {
    const { data: rs } = await supabase
      .from("users")
      .select("id, handle")
      .in("id", raterIds);
    if (rs) {
      for (const r of rs) handlesById.set(r.id as string, r.handle as string);
    }
  }
  const recentComments = (evals ?? [])
    .filter(
      (e): e is typeof e & { comment: string } =>
        typeof e.comment === "string" && (e.comment as string).trim().length > 0,
    )
    .slice(0, 5)
    .map((e) => ({
      stars: e.stars as number,
      comment: e.comment as string,
      createdAt: e.created_at as string,
      raterHandle: handlesById.get(e.rater_id as string) ?? "?",
    }));

  // 取引完了数
  const { count: completedCount } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .or(`sender_id.eq.${id},receiver_id.eq.${id}`)
    .eq("status", "completed");

  // 公開中の listings 数 + サマリ（最大 5 件）
  const { data: listings } = await supabase
    .from("listings")
    .select("id, have_group_id, have_goods_type_id, created_at")
    .eq("user_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);
  const listingIds = (listings ?? []).map((l) => l.id as string);

  // listings の wish_options も拾って簡易ラベル化
  const wishOptionsByListing = new Map<
    string,
    { groupName: string | null; goodsTypeName: string | null }[]
  >();
  if (listingIds.length > 0) {
    const { data: opts } = await supabase
      .from("listing_wish_options")
      .select(
        "listing_id, position, wish_group_id, wish_goods_type_id, is_cash_offer, group:groups_master!listing_wish_options_wish_group_id_fkey(name), goods_type:goods_types_master!listing_wish_options_wish_goods_type_id_fkey(name)",
      )
      .in("listing_id", listingIds)
      .order("position", { ascending: true });
    if (opts) {
      for (const o of opts) {
        const arr = wishOptionsByListing.get(o.listing_id as string) ?? [];
        const grp = Array.isArray(o.group) ? o.group[0] : o.group;
        const gt = Array.isArray(o.goods_type) ? o.goods_type[0] : o.goods_type;
        arr.push({
          groupName: (grp?.name as string | undefined) ?? null,
          goodsTypeName: (gt?.name as string | undefined) ?? null,
        });
        wishOptionsByListing.set(o.listing_id as string, arr);
      }
    }
  }

  // groups / goods_types を listings の have_group_id 等のため別途取得
  const groupIds = new Set<string>();
  const typeIds = new Set<string>();
  for (const l of listings ?? []) {
    if (l.have_group_id) groupIds.add(l.have_group_id as string);
    if (l.have_goods_type_id) typeIds.add(l.have_goods_type_id as string);
  }
  const groupNameById = new Map<string, string>();
  const typeNameById = new Map<string, string>();
  if (groupIds.size > 0) {
    const { data } = await supabase
      .from("groups_master")
      .select("id, name")
      .in("id", Array.from(groupIds));
    if (data) for (const g of data) groupNameById.set(g.id as string, g.name as string);
  }
  if (typeIds.size > 0) {
    const { data } = await supabase
      .from("goods_types_master")
      .select("id, name")
      .in("id", Array.from(typeIds));
    if (data) for (const g of data) typeNameById.set(g.id as string, g.name as string);
  }

  // 自分側の wish が partner inv に hit するかは、シンプルに当画面ではスキップ
  // （マッチカード経由で来る場合は既にマッチが評価済）

  const profile: UserProfileData = {
    id: user.id as string,
    handle: user.handle as string,
    displayName: user.display_name as string,
    avatarUrl: (user.avatar_url as string | null) ?? null,
    primaryArea: (user.primary_area as string | null) ?? null,
    ratingAvg,
    ratingCount,
    completedTradeCount: completedCount ?? 0,
    activeListingsCount: (listings ?? []).length,
    activeListingsPreview: (listings ?? []).map((l) => ({
      id: l.id as string,
      haveGroupName: l.have_group_id
        ? groupNameById.get(l.have_group_id as string) ?? null
        : null,
      haveGoodsTypeName: l.have_goods_type_id
        ? typeNameById.get(l.have_goods_type_id as string) ?? null
        : null,
      wishOptions: wishOptionsByListing.get(l.id as string) ?? [],
    })),
    recentComments,
  };

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title={`@${user.handle}`} sub="プロフィール" backHref="/" />
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-12 pt-3">
        <UserProfileView profile={profile} />
      </div>
    </main>
  );
}
