"use client";

import { useState, useTransition } from "react";
import { signInWithGoogle } from "@/app/auth/actions";
import { Spinner } from "./Spinner";

/**
 * Google OAuth ログイン/サインアップボタン（共通）
 *
 * - signInWithOAuth → Google 認証画面に redirect
 * - 戻り URL は /auth/callback で session 化
 * - 初回ログイン時 trigger handle_new_user() で user_xxxxxxxx 形式の handle を自動付与
 */
export function GoogleAuthButton({
  label,
  className = "",
}: {
  /** 「Googleで新規登録」 or 「Googleでログイン」など */
  label: string;
  /** 追加 className（margin 等） */
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-[14px] border-[1.5px] border-solid border-[#a695d855] bg-white px-4 py-[13px] text-sm font-bold text-gray-900 transition-all duration-150 hover:bg-[#a695d80d] hover:border-[#a695d899] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {pending ? (
          <>
            <Spinner size={18} />
            <span>Google に接続中...</span>
          </>
        ) : (
          <>
            <GoogleIcon />
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
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
