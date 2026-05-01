"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMembers } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export type Section = {
  oshiId: string; // user_oshi.id
  groupId: string | null;
  oshiRequestId: string | null; // 審査中グループの場合
  groupName: string;
  isPendingRequest: boolean; // 審査中の推しか
  members: { id: string; name: string }[];
  pendingMembers: { id: string; name: string; isMine: boolean }[];
};

type Selection = {
  isBox: boolean;
  memberIds: string[]; // characters_master.id
  requestIds: string[]; // character_requests.id
};

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
      [oshiId]: { isBox: true, memberIds: [], requestIds: [] },
    }));
  }

  function toggleMember(oshiId: string, memberId: string) {
    setSelections((prev) => {
      const cur = prev[oshiId] ?? {
        isBox: false,
        memberIds: [],
        requestIds: [],
      };
      const memberIds = cur.memberIds.includes(memberId)
        ? cur.memberIds.filter((id) => id !== memberId)
        : [...cur.memberIds, memberId];
      return {
        ...prev,
        [oshiId]: { isBox: false, memberIds, requestIds: cur.requestIds },
      };
    });
  }

  function toggleRequest(oshiId: string, requestId: string) {
    setSelections((prev) => {
      const cur = prev[oshiId] ?? {
        isBox: false,
        memberIds: [],
        requestIds: [],
      };
      const requestIds = cur.requestIds.includes(requestId)
        ? cur.requestIds.filter((id) => id !== requestId)
        : [...cur.requestIds, requestId];
      return {
        ...prev,
        [oshiId]: { isBox: false, memberIds: cur.memberIds, requestIds },
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
            isBox:
              !section.isPendingRequest &&
              section.members.length === 0 &&
              section.pendingMembers.length === 0,
            memberIds: [],
            requestIds: [],
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
                // 審査中グループ: メンバーマスタは無いが、character_requests で
                // メンバーをリクエスト可。他人のリクエストも選択可。
                <>
                  <div className="mb-2 rounded-xl bg-[#a695d810] px-3.5 py-2 text-[11px] leading-relaxed text-gray-700">
                    審査中グループのため、新規メンバーは
                    <strong>追加リクエスト</strong>でしか登録できません。
                    グループ承認時に正式マスタへ自動移行します。
                  </div>

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

                  {/* 審査中メンバーチップのみ */}
                  {section.pendingMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#3a324a14] px-4 py-3 text-[11px] text-gray-500">
                      まだメンバーリクエストはありません。下から追加できます。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {section.pendingMembers.map((m) => {
                        const active = sel.requestIds.includes(m.id);
                        const memLatin = isLatin(m.name);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              toggleRequest(section.oshiId, m.id)
                            }
                            title={
                              m.isMine
                                ? "あなたが申請・審査中"
                                : "他のユーザーが申請・審査中"
                            }
                            className={`rounded-full border-[1.5px] border-dashed px-3.5 py-1.5 text-[12px] transition-all duration-150 active:scale-[0.97] ${
                              active
                                ? "border-[#a695d8] bg-[#a695d814] font-bold text-[#a695d8]"
                                : "border-[#a695d855] bg-white font-medium text-gray-700 hover:border-[#a695d8]"
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
                            🕐 {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* メンバー追加リクエストリンク */}
                  {section.oshiRequestId && (
                    <Link
                      href={`/onboarding/members/request?oshiRequestId=${section.oshiRequestId}`}
                      className="mt-2 inline-block text-[11px] font-medium text-[#a695d8] hover:text-[#8b78c4]"
                    >
                      + メンバー追加リクエスト
                    </Link>
                  )}
                </>
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
                  {section.members.length === 0 &&
                  section.pendingMembers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#3a324a14] px-4 py-3 text-[11px] text-gray-500">
                      メンバーデータ準備中（箱推し or 下のリクエストで追加）
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {section.members.map((m) => {
                        const active = sel.memberIds.includes(m.id);
                        const memLatin = isLatin(m.name);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              toggleMember(section.oshiId, m.id)
                            }
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

                      {/* 審査中メンバー */}
                      {section.pendingMembers.map((m) => {
                        const active = sel.requestIds.includes(m.id);
                        const memLatin = isLatin(m.name);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              toggleRequest(section.oshiId, m.id)
                            }
                            title={
                              m.isMine
                                ? "あなたが申請・審査中"
                                : "他のユーザーが申請・審査中"
                            }
                            className={`rounded-full border-[1.5px] border-dashed px-3.5 py-1.5 text-[12px] transition-all duration-150 active:scale-[0.97] ${
                              active
                                ? "border-[#a695d8] bg-[#a695d814] font-bold text-[#a695d8]"
                                : "border-[#a695d855] bg-white font-medium text-gray-700 hover:border-[#a695d8]"
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
                            🕐 {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* メンバー追加リクエストリンク */}
                  {section.groupId && (
                    <Link
                      href={`/onboarding/members/request?groupId=${section.groupId}`}
                      className="mt-2 inline-block text-[11px] font-medium text-[#a695d8] hover:text-[#8b78c4]"
                    >
                      + メンバーが見つからない？運営に追加リクエスト
                    </Link>
                  )}
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
