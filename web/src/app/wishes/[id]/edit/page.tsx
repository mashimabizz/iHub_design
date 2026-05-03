import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeaderBack } from "@/components/auth/HeaderBack";
import {
  WishNewForm,
  type WishFormInitial,
} from "@/app/wishes/new/WishNewForm";

export const metadata = {
  title: "ウィッシュを編集 — iHub",
};

export default async function WishEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 編集対象 wish + マスタを並列取得
  const [
    { data: wish },
    { data: userOshi },
    { data: characters },
    { data: goodsTypes },
  ] = await Promise.all([
    supabase
      .from("goods_inventory")
      .select(
        "id, user_id, kind, group_id, character_id, goods_type_id, title, description, quantity",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("kind", "wanted")
      .maybeSingle(),
    supabase
      .from("user_oshi")
      .select("group_id, group:groups_master(id, name)")
      .eq("user_id", user.id)
      .not("group_id", "is", null),
    supabase
      .from("characters_master")
      .select("id, name, group_id")
      .order("display_order", { ascending: true }),
    supabase
      .from("goods_types_master")
      .select("id, name")
      .order("display_order", { ascending: true }),
  ]);

  if (!wish) notFound();

  // 自分の推し group をプライマリに、その他の groups も dropdown 候補として表示
  const groupMap = new Map<string, { id: string; name: string }>();
  for (const o of userOshi ?? []) {
    if (!o.group_id) continue;
    const grp = Array.isArray(o.group) ? o.group[0] : o.group;
    if (grp && !groupMap.has(grp.id)) {
      groupMap.set(grp.id, { id: grp.id, name: grp.name });
    }
  }
  // 編集対象 wish の group が user_oshi に無い場合（過去設定）は別途追加
  if (wish.group_id && !groupMap.has(wish.group_id as string)) {
    const { data: extraGroup } = await supabase
      .from("groups_master")
      .select("id, name")
      .eq("id", wish.group_id)
      .maybeSingle();
    if (extraGroup) {
      groupMap.set(extraGroup.id as string, {
        id: extraGroup.id as string,
        name: extraGroup.name as string,
      });
    }
  }
  const groups = Array.from(groupMap.values());

  const groupIds = new Set(groups.map((g) => g.id));
  const filteredCharacters = (characters ?? [])
    .filter((c) => c.group_id && groupIds.has(c.group_id))
    .map((c) => ({ id: c.id, name: c.name, group_id: c.group_id! }));

  const initial: WishFormInitial = {
    groupId: (wish.group_id as string | null) ?? "",
    characterId: (wish.character_id as string | null) ?? "",
    goodsTypeId: (wish.goods_type_id as string | null) ?? "",
    title: (wish.title as string) ?? "",
    quantity: (wish.quantity as number) ?? 1,
    note: (wish.description as string | null) ?? "",
  };

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="ウィッシュを編集" backHref="/wishes" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <p className="mb-5 text-[12px] leading-relaxed text-[#3a324a8c]">
          作品名／グループ・キャラ・種別・個数・メモを編集できます。
        </p>
        <WishNewForm
          groups={groups}
          characters={filteredCharacters}
          goodsTypes={goodsTypes ?? []}
          mode="edit"
          wishId={wish.id as string}
          initial={initial}
        />
      </div>
    </main>
  );
}
