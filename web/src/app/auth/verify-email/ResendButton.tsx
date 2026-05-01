"use client";

import { useEffect, useState } from "react";
import { resendVerification } from "@/app/auth/actions";
import { Spinner } from "@/components/auth/Spinner";

const COOLDOWN_SECONDS = 60;

/**
 * 認証メール再送ボタン（モックアップ AOSecondaryButton 準拠）
 * - 60秒のクールダウン付き
 * - 初期値は initialCooldown で指定可能（resend 直後は60秒）
 */
export function ResendButton({
  email,
  initialCooldown = 0,
}: {
  email: string;
  initialCooldown?: number;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    setPending(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    const result = await resendVerification(formData);

    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setMessage("確認メールを再送しました");
      setCooldown(COOLDOWN_SECONDS);
    }
  }

  const disabled = pending || cooldown > 0;

  return (
    <div>
      <button
        type="button"
        onClick={handleResend}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-bold text-purple-600 transition-all duration-150 hover:bg-purple-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Spinner size={16} />
            <span>送信中...</span>
          </>
        ) : cooldown > 0 ? (
          <span>再送信する（あと {cooldown} 秒）</span>
        ) : (
          <span>再送信する</span>
        )}
      </button>
      {message && (
        <p className="mt-2 text-xs text-emerald-600">{message}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
