"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveArea } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

const AREAS = [
  "東京",
  "神奈川",
  "千葉",
  "埼玉",
  "大阪",
  "愛知",
  "福岡",
  "その他",
];

export function AreaForm({
  initialAreas,
}: {
  initialAreas: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialAreas);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/onboarding/done");
  }, [router]);

  function toggle(area: string) {
    setSelected((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  }

  async function complete(skip: boolean) {
    setPending(true);
    setError(null);
    const result = await saveArea(skip ? [] : selected);
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/onboarding/done");
  }

  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* エリア選択 */}
        <div className="mb-3 text-[12px] font-bold text-gray-900">
          活動エリア（複数選択可）
        </div>
        <div className="flex flex-wrap gap-2 pb-1">
          {AREAS.map((area) => {
            const active = selected.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggle(area)}
                className={`rounded-full border-[1.5px] border-solid px-3.5 py-2 text-[13px] transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "border-[#a695d8] bg-[#a695d814] font-bold text-[#a695d8]"
                    : "border-[#3a324a14] bg-white font-medium text-gray-900 hover:border-[#3a324a26]"
                }`}
              >
                {area}
              </button>
            );
          })}
        </div>

        {/* ヒント */}
        <div className="mt-5 rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12px] leading-relaxed text-gray-700">
          <span className="font-bold">💡 ヒント</span>
          <br />
          AW（合流可能枠）はあとで「プロフ → 自分のAW一覧」から、ライブや物販イベントごとに細かく設定できます。
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-2 pb-1 pt-2">
        <PrimaryButton
          type="button"
          onClick={() => complete(false)}
          pending={pending}
          pendingLabel="保存中..."
        >
          完了
        </PrimaryButton>
        <button
          type="button"
          onClick={() => complete(true)}
          disabled={pending}
          className="mt-2 w-full rounded-xl py-3 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          あとで設定する
        </button>
      </div>
    </div>
  );
}
