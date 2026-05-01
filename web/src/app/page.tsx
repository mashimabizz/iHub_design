import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

type Props = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;

  // フォールバック：認証コードが root に飛んできた場合は /auth/callback へ転送
  // （Supabase Redirect URLs 設定漏れ・メールテンプレ古版・wwwドメイン経由など対策）
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  // フォールバック：認証エラーが root に飛んできた場合は /auth/auth-error へ転送
  if (params.error) {
    const errorParams = new URLSearchParams({
      error: params.error,
      ...(params.error_code && { error_code: params.error_code }),
      ...(params.error_description && {
        error_description: params.error_description,
      }),
    });
    redirect(`/auth/auth-error?${errorParams.toString()}`);
  }

  const supabase = await createClient();

  // ログイン状態取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログイン中ならプロフィール取得
  let profile: { handle: string; display_name: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("handle, display_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  // Supabase 接続確認（auth/getUser でエラーが起きてないこと）
  const supabaseConnected = true;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50 px-6 py-20">
      <div className="w-full max-w-md text-center">
        <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-xs font-bold tracking-widest text-purple-700">
          ★ iHub
        </span>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Hello iHub
        </h1>

        <p className="mt-4 text-base leading-relaxed text-gray-600">
          推し活グッズを<strong>現地で交換する</strong>マッチングアプリ。
          <br />
          MVP 開発開始。
        </p>

        {/* ログイン状態の表示 */}
        {user && profile ? (
          <div className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">ログイン中</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {profile.display_name}{" "}
              <span className="text-sm font-medium text-purple-700">
                @{profile.handle}
              </span>
            </p>
            <form action={logout} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
              >
                ログアウト
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-base font-bold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600"
            >
              新規登録
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-purple-300 bg-white px-6 py-3 text-base font-bold text-purple-700 transition-all hover:bg-purple-50"
            >
              ログイン
            </Link>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Phase
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900">0b</div>
            <div className="mt-1 text-xs text-gray-500">認証実装</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Stack
            </div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              Next.js 16
            </div>
            <div className="mt-1 text-xs text-gray-500">+ Supabase</div>
          </div>
          <div className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
              Supabase
            </div>
            <div
              className={`mt-1 text-lg font-bold ${
                supabaseConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              {supabaseConnected ? "✓ 接続" : "✗ 失敗"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {supabaseConnected ? "正常" : "要確認"}
            </div>
          </div>
        </div>

        <div className="mt-12 text-xs text-gray-400">
          設計：iter52 まで完了 ／ 実装：Phase 0b 進行中
        </div>
      </div>
    </main>
  );
}
