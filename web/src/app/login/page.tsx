import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

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
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-xs font-bold tracking-widest text-purple-700">
              ★ iHub
            </span>
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900">
            ログイン
          </h1>
        </div>

        <div className="mt-8 rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-bold text-purple-700 hover:text-purple-900"
          >
            新規登録
          </Link>
        </p>
      </div>
    </main>
  );
}
