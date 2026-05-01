import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { IHubLogo } from "@/components/auth/IHubLogo";
import { PrimaryLinkButton } from "@/components/auth/PrimaryButton";

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
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  // フォールバック：認証エラーが root に飛んできた場合
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン → Welcome 画面（モックアップ AOWelcome 準拠）
  if (!user) {
    return <WelcomeView />;
  }

  // ログイン中 → 暫定ホーム（Phase 1 で本実装予定）
  let profile: { handle: string; display_name: string } | null = null;
  const { data } = await supabase
    .from("users")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();
  profile = data;

  return <ProvisionalHomeView profile={profile} />;
}

// ──────────────────────────────────────────────
// Welcome 画面（未ログイン時）
// ──────────────────────────────────────────────
function WelcomeView() {
  return (
    <main className="flex flex-1 flex-col bg-[linear-gradient(180deg,#a695d822_0%,#a8d4e614_45%,#ffffff_100%)] px-7 pb-8 pt-20">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* 中央：ロゴ + タイトル + キャッチコピー */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <IHubLogo size={88} />
          <h1 className="mt-6 text-[34px] font-extrabold tracking-wide text-gray-900">
            iHub
          </h1>
          <p className="mt-2.5 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
            グッズ交換を、
            <br />
            現地で、もっと簡単に。
          </p>
        </div>

        {/* 下部：CTA */}
        <div>
          <PrimaryLinkButton href="/signup">
            メールアドレスで新規登録
          </PrimaryLinkButton>
          <button
            type="button"
            disabled
            title="準備中"
            className="relative mt-2.5 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-[14px] border-[1.5px] border-solid border-[#a695d855] bg-white px-4 py-[13px] text-sm font-bold text-gray-900 transition-all duration-150 hover:bg-[#a695d80d] hover:border-[#a695d899] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            Googleで新規登録
          </button>
          <div className="mt-5 text-center text-[13px] text-gray-500">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-bold text-purple-600 hover:text-purple-700"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────
// 暫定ホーム（ログイン後・Phase 1 で本実装予定）
// ──────────────────────────────────────────────
function ProvisionalHomeView({
  profile,
}: {
  profile: { handle: string; display_name: string } | null;
}) {
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

        {profile && (
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
            <div className="mt-1 text-lg font-bold text-green-600">✓ 接続</div>
            <div className="mt-1 text-xs text-gray-500">正常</div>
          </div>
        </div>

        <div className="mt-12 text-xs text-gray-400">
          設計：iter55 まで完了 ／ 実装：Phase 0b 進行中
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
