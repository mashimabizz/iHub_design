import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptureFlow } from "./CaptureFlow";
import { HeaderBack } from "@/components/auth/HeaderBack";

export const metadata = {
  title: "グッズを登録 — iHub",
};

/**
 * グッズ登録フロー（撮影 → 切り抜き → ラベリング）
 *
 * - Step 1: 共通選択（グループ + グッズ種別）
 * - Step 2: 撮影 / 写真選択 → Supabase Storage にアップロード
 * - Step 3: 切り抜き（次の iter で実装）
 * - Step 4: ラベリング（キャラ・タイトル等を個別設定 / 一括登録）
 */
export default async function InventoryNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 並列取得
  const [{ data: userOshi }, { data: goodsTypes }] = await Promise.all([
    supabase
      .from("user_oshi")
      .select("group_id, group:groups_master(id, name)")
      .eq("user_id", user.id)
      .not("group_id", "is", null),
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

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack title="グッズを登録" backHref="/inventory" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <CaptureFlow
          groups={groups}
          goodsTypes={goodsTypes ?? []}
          userId={user.id}
        />
      </div>
    </main>
  );
}
