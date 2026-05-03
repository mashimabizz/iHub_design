"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCharacterToOshi,
  removeCharacterFromOshi,
  removeOshiGroup,
} from "@/app/profile/actions";

type Group = {
  groupId: string;
  groupName: string;
  members: { id: string; name: string }[];
  availableCharacters: { id: string; name: string }[];
};

/**
 * 推し設定編集（モックアップ account-extras.jsx::OshiEdit ベース・案 Z）
 *
 * - グループ削除
 * - メンバー削除（各 chip の ×）
 * - メンバー追加（同グループの未選択キャラを inline 展開）
 * - 「+ 推しを追加」→ /onboarding/oshi?return=profile
 * - メンバー追加リクエスト（マスタにない）→ /onboarding/members/request?groupId=...&return=profile
 */
export function OshiEditView({ oshiGroups }: { oshiGroups: Group[] }) {
  const router = useRouter();

  return (
    <div className="space-y-3.5">
      {/* 説明バナー */}
      <div className="rounded-xl border border-[#a695d833] bg-[#a695d810] px-3.5 py-3 text-[12px] leading-[1.6] text-[#3a324a]">
        推しを追加すると、マッチング・コレクション・ホームの基準が更新されます。
      </div>

      {/* グループ一覧 */}
      {oshiGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-8 text-center text-[12px] text-[#3a324a8c]">
          推しがまだ設定されていません
          <br />
          <Link
            href="/onboarding/oshi?return=profile"
            className="mt-2 inline-block font-bold text-[#a695d8]"
          >
            + 推しを追加 →
          </Link>
        </div>
      ) : (
        oshiGroups.map((g) => (
          <GroupCard key={g.groupId} group={g} router={router} />
        ))
      )}

      {/* + 推しを追加（グループ） */}
      <Link
        href="/onboarding/oshi?return=profile"
        className="block w-full rounded-[14px] border-[1.5px] border-dashed border-[#a695d855] bg-white px-4 py-4 text-center text-[13px] font-bold text-[#a695d8] transition-all active:scale-[0.99]"
      >
        ＋ 推しを追加（グループ・作品）
      </Link>
    </div>
  );
}

/* ─── Group Card ─────────────────────────────────────────── */

function GroupCard({
  group,
  router,
}: {
  group: Group;
  router: ReturnType<typeof useRouter>;
}) {
  const [pending, startTransition] = useTransition();
  const [showAddChars, setShowAddChars] = useState(false);

  function handleRemoveGroup() {
    if (
      !confirm(
        `「${group.groupName}」を推しリストから削除しますか？\n（メンバー指定もすべて解除されます）`,
      )
    )
      return;
    startTransition(async () => {
      const r = await removeOshiGroup(group.groupId);
      if (r?.error) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemoveMember(characterId: string) {
    startTransition(async () => {
      const r = await removeCharacterFromOshi({
        groupId: group.groupId,
        characterId,
      });
      if (r?.error) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddMember(characterId: string) {
    startTransition(async () => {
      const r = await addCharacterToOshi({
        groupId: group.groupId,
        characterId,
      });
      if (r?.error) {
        alert(r.error);
        return;
      }
      // パネルは開いたまま。router.refresh で候補から該当キャラが消えるので
      // 続けて他のキャラも選べる。すべて追加し終わると候補空 → 案内表示。
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#3a324a0f] bg-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 border-b border-[#3a324a0f] px-4 py-3.5">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[14px] font-extrabold text-white"
          style={{ fontFamily: '"Inter Tight", system-ui' }}
        >
          {group.groupName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-[14px] font-bold text-gray-900">
            {group.groupName}
          </div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            {group.members.length === 0
              ? "箱推し（メンバー指定なし）"
              : `推しメンバー ${group.members.length}人`}
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemoveGroup}
          disabled={pending}
          className="rounded-[10px] border border-[#3a324a14] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-[#3a324a8c] disabled:opacity-50"
        >
          削除
        </button>
      </div>

      {/* 推しメンバー chip 群 */}
      <div className="px-4 py-3">
        <div className="mb-1.5 text-[11px] font-bold text-[#3a324a8c]">
          推しメンバー・推しキャラ ({group.members.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {group.members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleRemoveMember(m.id)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#a695d814] px-3 py-1 text-[12px] font-bold text-[#a695d8] disabled:opacity-50"
              title="タップで削除"
            >
              {m.name}
              <span className="text-[14px] leading-none text-[#3a324a8c]">×</span>
            </button>
          ))}

          {/* + 追加 chip */}
          <button
            type="button"
            onClick={() => setShowAddChars((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#3a324a30] bg-transparent px-3 py-1 text-[12px] font-medium text-[#3a324a8c]"
          >
            {showAddChars ? "閉じる" : "+ 追加"}
          </button>
        </div>

        {/* メンバー追加 inline */}
        {showAddChars && (
          <div className="mt-3 rounded-xl border border-[#3a324a0f] bg-[#fbf9fc] p-3">
            {group.availableCharacters.length === 0 ? (
              <div className="text-[11.5px] text-[#3a324a8c]">
                追加可能なメンバーがマスタにありません。
              </div>
            ) : (
              <>
                <div className="mb-1.5 text-[11px] font-bold text-[#3a324a8c]">
                  追加できるメンバー
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.availableCharacters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddMember(c.id)}
                      disabled={pending}
                      className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-gray-700 transition-all active:scale-[0.97] disabled:opacity-50 border border-[#3a324a14] hover:border-[#a695d8] hover:text-[#a695d8]"
                    >
                      + {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 border-t border-[#3a324a0f] pt-2.5 text-center">
              <Link
                href={`/onboarding/members/request?groupId=${group.groupId}&return=profile`}
                className="text-[11.5px] font-bold text-[#a695d8]"
              >
                マスタに無いメンバーを追加リクエスト →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
