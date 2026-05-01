import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventoryNewForm } from "./InventoryNewForm";
import { HeaderBack } from "@/components/auth/HeaderBack";

export const metadata = {
  title: "在庫を追加 — iHub",
};

/**
 * 在庫追加画面（最小実装）
 *
 * - ユーザーの user_oshi に登録されている group/character のみ選択可
 * - グッズ種別は goods_types_master 全件
 * - 写真は後の iter で Supabase Storage 対応
 */
export default async function InventoryNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 並列取得：自分の推し（user_oshi）+ それに紐づくキャラ + グッズ種別
  const [
    { data: userOshi },
    { data: characters },
    { data: goodsTypes },
  ] = await Promise.all([
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

  // 重複排除した group 一覧
  const groupMap = new Map<string, { id: string; name: string }>();
  for (const o of userOshi ?? []) {
    if (!o.group_id) continue;
    const grp = Array.isArray(o.group) ? o.group[0] : o.group;
    if (grp && !groupMap.has(grp.id)) {
      groupMap.set(grp.id, { id: grp.id, name: grp.name });
    }
  }
  const groups = Array.from(groupMap.values());

  // 自分の推しグループに紐づくキャラのみ
  const groupIds = new Set(groups.map((g) => g.id));
  const filteredCharacters = (characters ?? [])
    .filter((c) => c.group_id && groupIds.has(c.group_id))
    .map((c) => ({ id: c.id, name: c.name, group_id: c.group_id! }));

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="在庫を追加" backHref="/inventory" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <p className="mb-5 text-xs leading-relaxed text-gray-500">
          譲るグッズ・求めるグッズを登録します。
          <br />
          推し（グループ・メンバー）を選択して登録してください。
        </p>
        <InventoryNewForm
          groups={groups}
          characters={filteredCharacters}
          goodsTypes={goodsTypes ?? []}
        />
      </div>
    </main>
  );
}
