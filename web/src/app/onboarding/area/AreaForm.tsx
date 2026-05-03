"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveArea } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

/**
 * iter95: 都道府県をセレクト形式に変更（複数選択可）
 *
 * 1. 北海道〜沖縄までの 47 都道府県をブロック分けで表示
 * 2. グッズ交換打診の参考情報として使われる旨を明記
 * 3. AW（合流可能枠）は廃止済みのためヒント文言から削除
 */

const PREFECTURE_GROUPS: { region: string; prefs: string[] }[] = [
  { region: "北海道・東北", prefs: ["北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島"] },
  { region: "関東", prefs: ["東京", "神奈川", "千葉", "埼玉", "茨城", "栃木", "群馬"] },
  { region: "甲信越・北陸", prefs: ["新潟", "富山", "石川", "福井", "山梨", "長野"] },
  { region: "東海", prefs: ["静岡", "愛知", "岐阜", "三重"] },
  { region: "近畿", prefs: ["大阪", "兵庫", "京都", "滋賀", "奈良", "和歌山"] },
  { region: "中国", prefs: ["岡山", "広島", "山口", "鳥取", "島根"] },
  { region: "四国", prefs: ["徳島", "香川", "愛媛", "高知"] },
  { region: "九州・沖縄", prefs: ["福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"] },
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
        {/* 説明（参考情報の旨） */}
        <div className="mb-3 rounded-[12px] border border-[#a8d4e655] bg-[#a8d4e60a] px-3 py-2.5 text-[11.5px] leading-[1.6] text-[#3a324a]">
          <b>📍 主な活動エリア（複数選択可）</b>
          <br />
          普段グッズ交換ができる地域を選択してください。
          <br />
          ここで選んだエリアは、<b>グッズ交換の打診時に相手の参考情報</b>として表示されます。
          <br />
          <span className="text-[10.5px] text-[#3a324a8c]">
            ※ 後からプロフィール編集で変更できます。
          </span>
        </div>

        {/* 都道府県（地域別グループ） */}
        <div className="space-y-3">
          {PREFECTURE_GROUPS.map((g) => (
            <div key={g.region}>
              <div className="mb-1.5 px-1 text-[10.5px] font-bold tracking-[0.4px] text-[#3a324a8c]">
                {g.region}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.prefs.map((pref) => {
                  const active = selected.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => toggle(pref)}
                      className={`rounded-full border-[1.5px] border-solid px-3 py-1.5 text-[12px] transition-all duration-150 active:scale-[0.97] ${
                        active
                          ? "border-[#a695d8] bg-[#a695d814] font-bold text-[#a695d8]"
                          : "border-[#3a324a14] bg-white font-medium text-[#3a324a]"
                      }`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1.5 px-1 text-[10.5px] text-[#3a324a8c]">
          選択中：
          <b className="text-[#a695d8]">
            {selected.length === 0 ? "—" : `${selected.length} 件`}
          </b>
          {selected.length > 0 && (
            <span className="ml-1.5">{selected.join(" / ")}</span>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-3 pb-1 pt-2">
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
