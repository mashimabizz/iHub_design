"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

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

      {/* Google ログイン */}
      <div className="mt-5">
        <GoogleAuthButton label="Googleでログイン" />
      </div>
    </>
  );
}
