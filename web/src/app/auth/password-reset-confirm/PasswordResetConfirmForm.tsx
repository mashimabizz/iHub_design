"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setNewPassword } from "@/app/auth/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

// パスワード強度判定（signup と同じロジック）
function getPasswordStrength(pw: string): {
  level: number;
  label: string;
  color: string;
  textColor: string;
} {
  if (!pw)
    return { level: 0, label: "", color: "bg-gray-200", textColor: "" };
  if (pw.length < 8)
    return {
      level: 1,
      label: "弱い",
      color: "bg-red-400",
      textColor: "text-red-500",
    };

  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^a-zA-Z\d]/.test(pw);

  if (hasLetter && hasDigit && hasSymbol && pw.length >= 12)
    return {
      level: 4,
      label: "最強",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    };
  if (hasLetter && hasDigit)
    return {
      level: 3,
      label: "強い",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    };
  if (hasLetter || hasDigit)
    return {
      level: 2,
      label: "普通",
      color: "bg-yellow-400",
      textColor: "text-yellow-600",
    };
  return {
    level: 1,
    label: "弱い",
    color: "bg-red-400",
    textColor: "text-red-500",
  };
}

export function PasswordResetConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  const strength = getPasswordStrength(password);
  const passwordsMatch =
    passwordConfirm === "" || password === passwordConfirm;
  const canSubmit =
    password.length >= 8 && password === passwordConfirm;

  async function handleSubmit() {
    if (!passwordsMatch) {
      setFieldErrors({ password_confirm: "パスワードが一致しません" });
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});

    const result = await setNewPassword(password);

    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    if (result?.fieldErrors) {
      setPending(false);
      setFieldErrors(result.fieldErrors);
      return;
    }

    // 成功 → ログイン画面へ（成功メッセージ付き）
    router.push("/login?password_reset=success");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-4"
    >
      {/* 新しいパスワード */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-bold text-gray-900"
        >
          新しいパスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          placeholder="8文字以上、英数字混在"
          className="mt-2 block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
        />
        {/* 強度メーター */}
        <div className="mt-2 flex items-center gap-1 pl-0.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded transition-colors ${
                i <= strength.level ? strength.color : "bg-gray-200"
              }`}
            />
          ))}
          {strength.label && (
            <span
              className={`ml-2 text-[10px] font-semibold ${strength.textColor}`}
            >
              {strength.label}
            </span>
          )}
        </div>
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {/* 新しいパスワード（確認） */}
      <div>
        <label
          htmlFor="password_confirm"
          className="block text-sm font-bold text-gray-900"
        >
          新しいパスワード（確認）
        </label>
        <input
          id="password_confirm"
          name="password_confirm"
          type="password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="もう一度入力"
          className={`mt-2 block w-full rounded-xl border bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 ${
            passwordsMatch
              ? "border-gray-200 focus:border-purple-400 focus:ring-purple-300"
              : "border-red-300 focus:border-red-400 focus:ring-red-300"
          }`}
        />
        {!passwordsMatch && (
          <p className="mt-1 text-xs text-red-600">
            パスワードが一致しません
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton
        type="submit"
        disabled={!canSubmit}
        pending={pending}
        pendingLabel="変更中..."
      >
        パスワードを変更する
      </PrimaryButton>
    </form>
  );
}
