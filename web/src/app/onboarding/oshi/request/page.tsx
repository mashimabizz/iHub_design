import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./RequestForm";
import { HeaderBack } from "@/components/auth/HeaderBack";

export const metadata = {
  title: "推し追加リクエスト — iHub",
};

/**
 * 推し追加リクエスト画面
 *
 * - マスタに無い推しを運営にリクエスト
 * - 名前 / ジャンル / 種類 / メモ を入力
 * - 送信後 oshi_requests に挿入 → /onboarding/oshi に戻る
 * - 推し選択画面でその後「審査中」アイテムとして表示
 */
export default async function OshiRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: genres } = await supabase
    .from("genres_master")
    .select("id, name")
    .order("display_order", { ascending: true });

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc]">
      <HeaderBack
        title="推し追加リクエスト"
        backHref="/onboarding/oshi"
      />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-6">
        <h2 className="text-[22px] font-extrabold leading-tight text-gray-900">
          推しが見つからない？
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          運営に追加リクエストを送ります。
          <br />
          審査の上、マスタに登録 or 既存の推しに紐付けます。
        </p>
        <RequestForm genres={genres ?? []} />
      </div>
    </main>
  );
}
