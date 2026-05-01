import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./RequestForm";
import { HeaderBack } from "@/components/auth/HeaderBack";

export const metadata = {
  title: "メンバー追加リクエスト — iHub",
};

type Props = {
  searchParams: Promise<{ groupId?: string }>;
};

/**
 * メンバー追加リクエスト画面
 *
 * - クエリパラメータ groupId で対象グループを指定
 * - 名前 / メモ を入力 → character_requests に挿入
 * - 送信後 /onboarding/members に戻る
 */
export default async function CharacterRequestPage({ searchParams }: Props) {
  const params = await searchParams;
  const groupId = params.groupId;
  if (!groupId) redirect("/onboarding/members");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // グループ情報を取得
  const { data: group } = await supabase
    .from("groups_master")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) redirect("/onboarding/members");

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack
        title="メンバー追加リクエスト"
        backHref="/onboarding/members"
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <h2 className="text-[22px] font-extrabold leading-tight text-gray-900">
          メンバーを追加リクエスト
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          公式メンバーが見つからない場合、運営に追加リクエストを送ります。
          <br />
          審査の上、マスタに登録されます。
        </p>
        <RequestForm groupId={group.id} groupName={group.name} />
      </div>
    </main>
  );
}
