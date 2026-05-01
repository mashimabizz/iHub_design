"use client";

import { useState } from "react";
import { resendVerification } from "@/app/auth/actions";

export function ResendButton({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleResend}
        disabled={pending}
        className="w-full rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-bold text-purple-700 transition-all hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "送信中..." : "📧 認証メールを再送する"}
      </button>
      {message && (
        <p className="mt-2 text-xs text-green-700">{message}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
