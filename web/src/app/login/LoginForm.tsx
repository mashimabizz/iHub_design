"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const result = await login(formData);

    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-bold text-gray-900"
          >
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="example@email.com"
            className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-bold text-gray-900"
          >
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="パスワードを入力"
            className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
          />
        </div>

        <div className="-mt-2 text-right">
          <Link
            href="/password-reset"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700"
          >
            パスワードを忘れた方
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <PrimaryButton
          type="submit"
          pending={pending}
          pendingLabel="ログイン中..."
        >
          ログイン
        </PrimaryButton>
      </form>

      {/* または divider（モックアップ準拠） */}
      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] text-gray-500">または</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Google ログイン（OAuth は後日実装・現時点は disabled） */}
      <button
        type="button"
        disabled
        title="準備中"
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-all duration-150 hover:bg-gray-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleIcon />
        Googleでログイン
      </button>
    </>
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
