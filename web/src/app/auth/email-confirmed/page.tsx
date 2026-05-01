import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "認証完了 — iHub",
};

/**
 * メール認証完了画面（モックアップ AOEmailConfirmed 準拠）
 *
 * - 認証直後にここに到達
 * - onboarding 完了済ユーザーが何かの拍子に来たら / へ自動転送
 * - 「プロフィール設定へ進む」で /onboarding/gender に進む
 */
export default async function EmailConfirmedPage() {
  // 未ログインなら /login へ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // onboarding 完了済（gender 設定済）ならホームへ自動転送
  const { data: profile } = await supabase
    .from("users")
    .select("gender")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.gender) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col bg-gradient-to-b from-purple-100/50 via-sky-50/30 to-white px-7 py-16">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* 中央コンテンツ */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* 大きい円 + チェック（モックアップ：紫→水色グラデ + 影） */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-sky-300 shadow-xl shadow-purple-300/50">
            <svg
              width="50"
              height="50"
              viewBox="0 0 50 50"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
            >
              <path
                d="M14 26l8 8 16-18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-gray-900">
            認証完了！
          </h1>
          <p className="mt-2.5 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
            メールアドレスの認証が完了しました。
            <br />
            続けてプロフィールを設定しましょう。
          </p>
        </div>

        {/* 進むボタン */}
        <div>
          <Link
            href="/onboarding/gender"
            className="block w-full rounded-xl bg-gradient-to-r from-purple-400 to-pink-300 px-4 py-3.5 text-center text-base font-bold text-white shadow-md transition-all hover:from-purple-500 hover:to-pink-400"
          >
            プロフィール設定へ進む
          </Link>
        </div>
      </div>
    </main>
  );
}
