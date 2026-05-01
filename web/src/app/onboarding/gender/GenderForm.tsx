"use client";

import { useState } from "react";
import { saveGender } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

const OPTIONS: { value: string; label: string }[] = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" },
];

export function GenderForm({ initialValue }: { initialValue?: string | null }) {
  const [selected, setSelected] = useState<string | undefined>(
    initialValue ?? undefined,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selected) {
      setError("性別を選択してください");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveGender(selected);
    // success だと redirect されるのでここには到達しない
    setPending(false);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div className="space-y-2.5">
        {OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-solid px-[18px] py-4 text-sm transition-all duration-150 active:scale-[0.99] ${
                active
                  ? "border-[#a695d8] bg-[#a695d814] font-bold text-gray-900"
                  : "border-[#3a324a14] bg-white font-medium text-gray-900 hover:border-[#3a324a26]"
              }`}
            >
              {/* ラジオ円 */}
              <span
                className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-[1.8px] border-solid ${
                  active
                    ? "border-[#a695d8] bg-[#a695d8]"
                    : "border-[#3a324a14] bg-white"
                }`}
              >
                {active && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-auto pt-6">
        <PrimaryButton
          type="button"
          onClick={handleSubmit}
          disabled={!selected}
          pending={pending}
          pendingLabel="保存中..."
        >
          次へ
        </PrimaryButton>
      </div>
    </div>
  );
}
