"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMembers } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export type Section = {
  oshiId: string; // user_oshi.id
  groupId: string | null;
  groupName: string;
  isPendingRequest: boolean; // 審査中の推しか
  members: { id: string; name: string }[];
};

type Selection = { isBox: boolean; memberIds: string[] };

function isLatin(name: string): boolean {
  return /^[A-Za-z0-9\s\-_!&]+$/.test(name);
}

export function MembersForm({
  sections,
  initialSelections,
}: {
  sections: Section[];
  initialSelections: Record<string, Selection>;
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, Selection>>(
    initialSelections,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/onboarding/area");
  }, [router]);

  function setBox(oshiId: string) {
    setSelections((prev) => ({
      ...prev,
      [oshiId]: { isBox: true, memberIds: [] },
    }));
  }

  function toggleMember(oshiId: string, memberId: string) {
    setSelections((prev) => {
      const cur = prev[oshiId] ?? { isBox: false, memberIds: [] };
      const memberIds = cur.memberIds.includes(memberId)
        ? cur.memberIds.filter((id) => id !== memberId)
        : [...cur.memberIds, memberId];
      return {
        ...prev,
        [oshiId]: { isBox: false, memberIds },
      };
    });
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const result = await saveMembers(selections);
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/onboarding/area");
  }

  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        {sections.map((section) => {
          const sel = selections[section.oshiId] ?? {
            isBox: !section.isPendingRequest && section.members.length === 0,
            memberIds: [],
          };
          const latin = isLatin(section.groupName);

          return (
            <div key={section.oshiId}>
              {/* グループ名 */}
              <div
                className="mb-2.5 text-sm font-extrabold text-gray-900"
                style={
                  latin
                    ? {
                        fontFamily: "var(--font-inter-tight), system-ui",
                        letterSpacing: "0.3px",
                      }
                    : undefined
                }
              >
                {section.groupName}
                {section.isPendingRequest && (
                  <span className="ml-2 rounded-full bg-[#a695d822] px-1.5 py-0.5 text-[9px] font-bold text-[#a695d8]">
                    審査中
                  </span>
                )}
              </div>

              {section.isPendingRequest ? (
                <div className="rounded-xl border border-dashed border-[#3a324a14] px-4 py-3 text-[11px] text-gray-500">
                  承認後にメンバー選択ができるようになります
                </div>
              ) : section.members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#3a324a14] px-4 py-3 text-[11px] text-gray-500">
                  メンバーデータ準備中（箱推しとして登録されます）
                </div>
              ) : (
                <>
                  {/* 箱推しチップ */}
                  <button
                    type="button"
                    onClick={() => setBox(section.oshiId)}
                    className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-solid px-3 py-2.5 text-[12px] font-bold transition-all duration-150 active:scale-[0.98] ${
                      sel.isBox
                        ? "border-[#a695d8] bg-[#a695d814] text-gray-900"
                        : "border-[#3a324a14] bg-white text-gray-700 hover:border-[#3a324a26]"
                    }`}
                  >
                    {sel.isBox && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        fill="none"
                        stroke="#a695d8"
                        strokeWidth="2"
                      >
                        <path d="M2 5.5l2.5 2.5L9 3" strokeLinecap="round" />
                      </svg>
                    )}
                    箱推し（メンバー全員）
                  </button>

                  {/* メンバーチップ */}
                  <div className="flex flex-wrap gap-1.5">
                    {section.members.map((m) => {
                      const active = sel.memberIds.includes(m.id);
                      const memLatin = isLatin(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMember(section.oshiId, m.id)}
                          className={`rounded-full border-[1.5px] border-solid px-3.5 py-1.5 text-[12px] transition-all duration-150 active:scale-[0.97] ${
                            active
                              ? "border-[#a695d8] bg-[#a695d8] font-bold text-white"
                              : "border-[#3a324a14] bg-white font-medium text-gray-900 hover:border-[#3a324a26]"
                          }`}
                          style={
                            memLatin
                              ? {
                                  fontFamily:
                                    "var(--font-inter-tight), system-ui",
                                  letterSpacing: "0.2px",
                                }
                              : undefined
                          }
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {sections.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#3a324a14] py-6 text-center text-xs text-gray-500">
            推しが選択されていません。前の画面に戻って選択してください。
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-2 pb-1 pt-2">
        <PrimaryButton
          type="button"
          onClick={handleSubmit}
          pending={pending}
          pendingLabel="保存中..."
        >
          次へ
        </PrimaryButton>
      </div>
    </div>
  );
}
