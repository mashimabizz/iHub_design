"use client";

import { useState } from "react";
import { signup } from "@/app/auth/actions";

export function SignUpForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await signup(formData);

    setPending(false);
    if (result?.error) setError(result.error);
    if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
  }

  return (
    <form action={onSubmit} className="space-y-5">
      {/* 表示名 */}
      <div>
        <label
          htmlFor="display_name"
          className="block text-sm font-bold text-gray-900"
        >
          表示名
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={50}
          placeholder="ハナ"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {fieldErrors.display_name && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.display_name}</p>
        )}
      </div>

      {/* ハンドル */}
      <div>
        <label
          htmlFor="handle"
          className="block text-sm font-bold text-gray-900"
        >
          ハンドル名（@xxx）
        </label>
        <div className="mt-1 flex rounded-lg border border-gray-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
          <span className="inline-flex items-center pl-3 pr-1 text-gray-500">
            @
          </span>
          <input
            id="handle"
            name="handle"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            placeholder="hana_lumi"
            className="block w-full rounded-r-lg px-1 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          英小文字・数字・アンダースコア、3〜20文字
        </p>
        {fieldErrors.handle && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.handle}</p>
        )}
      </div>

      {/* メール */}
      <div>
        <label htmlFor="email" className="block text-sm font-bold text-gray-900">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      {/* パスワード */}
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
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <p className="mt-1 text-xs text-gray-500">8文字以上</p>
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {/* 利用規約同意 */}
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="accepted_terms"
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-gray-700">
            <a
              href="/terms"
              target="_blank"
              className="text-purple-700 underline hover:text-purple-900"
            >
              利用規約
            </a>
            と
            <a
              href="/privacy"
              target="_blank"
              className="text-purple-700 underline hover:text-purple-900"
            >
              プライバシーポリシー
            </a>
            に同意します
          </span>
        </label>
        {fieldErrors.accepted_terms && (
          <p className="mt-1 text-xs text-red-600">
            {fieldErrors.accepted_terms}
          </p>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-base font-bold text-white shadow-md transition-all hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "登録中..." : "アカウント作成"}
      </button>
    </form>
  );
}
