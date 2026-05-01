"use client";

import { useState } from "react";
import { passwordReset } from "@/app/auth/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export function ResetForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await passwordReset(formData);

    setPending(false);
    if (result?.error) setError(result.error);
    if (result?.fieldErrors) setFieldErrors(result.fieldErrors);
  }

  return (
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
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton
        type="submit"
        pending={pending}
        pendingLabel="送信中..."
      >
        リセットメールを送信
      </PrimaryButton>
    </form>
  );
}
