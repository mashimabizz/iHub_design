import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { HeaderBack } from "@/components/auth/HeaderBack";
import { IHubLogo } from "@/components/auth/IHubLogo";

export const metadata = {
  title: "ログイン — iHub",
};

export default async function LoginPage() {
  // 既ログインなら / へ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="flex flex-1 flex-col bg-[#fafafa]">
      <HeaderBack title="ログイン" backHref="/" />
      <div className="mx-auto w-full max-w-md flex-1 px-5 pb-8 pt-8">
        {/* iHub ロゴ + おかえりなさい */}
        <div className="mb-7 flex flex-col items-center">
          <IHubLogo size={60} />
          <p className="mt-3.5 text-xs text-gray-500">おかえりなさい</p>
        </div>

        <LoginForm />

        {/* 新規登録誘導 */}
        <div className="mt-6 text-center text-[13px] text-gray-500">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-bold text-purple-600 hover:text-purple-700"
          >
            新規登録
          </Link>
        </div>
      </div>
    </main>
  );
}
