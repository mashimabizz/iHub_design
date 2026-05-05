"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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

type ActionResult = { error?: string } | undefined;
type OshiMutation = () => Promise<ActionResult>;

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
  const [groups, setGroups] = useState<Group[]>(oshiGroups);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setGroups(oshiGroups);
    }
  }, [oshiGroups]);

  function enqueueMutation(
    task: OshiMutation,
    onRollback?: (error: Error) => void,
  ) {
    setMutationError(null);
    pendingMutationsRef.current += 1;

    const run = mutationQueueRef.current.then(async () => {
      const result = await task();
      if (result?.error) {
        throw new Error(result.error);
      }
    });

    const tracked = run
      .catch((error) => {
        const normalized =
          error instanceof Error
            ? error
            : new Error("推し設定の保存に失敗しました");
        onRollback?.(normalized);
        setMutationError(normalized.message);
      })
      .finally(() => {
        pendingMutationsRef.current = Math.max(
          0,
          pendingMutationsRef.current - 1,
        );
        if (pendingMutationsRef.current === 0) {
          router.refresh();
        }
      });

    mutationQueueRef.current = tracked.then(() => undefined);
  }

  return (
    <div className="space-y-3.5">
      {/* 説明バナー */}
      <div className="rounded-xl border border-[#a695d833] bg-[#a695d810] px-3.5 py-3 text-[12px] leading-[1.6] text-[#3a324a]">
        推しを追加すると、マッチング・コレクション・ホームの基準が更新されます。
      </div>
      {mutationError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-red-700">
          {mutationError}
        </div>
      )}

      {/* グループ一覧 */}
      {groups.length === 0 ? (
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
        groups.map((g) => (
          <GroupCard
            key={g.groupId}
            group={g}
            setGroups={setGroups}
            enqueueMutation={enqueueMutation}
          />
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
  setGroups,
  enqueueMutation,
}: {
  group: Group;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  enqueueMutation: (
    task: OshiMutation,
    onRollback?: (error: Error) => void,
  ) => void;
}) {
  const [showAddChars, setShowAddChars] = useState(false);

  function handleRemoveGroup() {
    if (
      !confirm(
        `「${group.groupName}」を推しリストから削除しますか？\n（メンバー指定もすべて解除されます）`,
      )
    )
      return;

    let previousIndex = 0;
    const snapshot = group;
    setGroups((prev) => {
      previousIndex = Math.max(
        0,
        prev.findIndex((g) => g.groupId === group.groupId),
      );
      return prev.filter((g) => g.groupId !== group.groupId);
    });

    enqueueMutation(
      () => removeOshiGroup(group.groupId),
      () => {
        setGroups((prev) => {
          if (prev.some((g) => g.groupId === snapshot.groupId)) return prev;
          const next = [...prev];
          next.splice(previousIndex, 0, snapshot);
          return next;
        });
      },
    );
  }

  function handleRemoveMember(characterId: string) {
    const member = group.members.find((m) => m.id === characterId);
    if (!member) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupId !== group.groupId) return g;
        const availableCharacters = g.availableCharacters.some(
          (c) => c.id === member.id,
        )
          ? g.availableCharacters
          : sortCharacters([...g.availableCharacters, member]);
        return {
          ...g,
          members: g.members.filter((m) => m.id !== member.id),
          availableCharacters,
        };
      }),
    );

    enqueueMutation(
      () =>
        removeCharacterFromOshi({
          groupId: group.groupId,
          characterId,
        }),
      () => {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.groupId !== group.groupId) return g;
            return {
              ...g,
              members: g.members.some((m) => m.id === member.id)
                ? g.members
                : [...g.members, member],
              availableCharacters: g.availableCharacters.filter(
                (c) => c.id !== member.id,
              ),
            };
          }),
        );
      },
    );
  }

  function handleAddMember(characterId: string) {
    const character = group.availableCharacters.find(
      (c) => c.id === characterId,
    );
    if (!character) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupId !== group.groupId) return g;
        return {
          ...g,
          members: g.members.some((m) => m.id === character.id)
            ? g.members
            : [...g.members, character],
          availableCharacters: g.availableCharacters.filter(
            (c) => c.id !== character.id,
          ),
        };
      }),
    );

    enqueueMutation(
      () =>
        addCharacterToOshi({
          groupId: group.groupId,
          characterId,
        }),
      () => {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.groupId !== group.groupId) return g;
            const availableCharacters = g.availableCharacters.some(
              (c) => c.id === character.id,
            )
              ? g.availableCharacters
              : sortCharacters([...g.availableCharacters, character]);
            return {
              ...g,
              members: g.members.filter((m) => m.id !== character.id),
              availableCharacters,
            };
          }),
        );
      },
    );
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
          className="rounded-[10px] border border-[#3a324a14] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-[#3a324a8c] transition-all active:scale-[0.97]"
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#a695d814] px-3 py-1 text-[12px] font-bold text-[#a695d8] transition-all active:scale-[0.97]"
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
                      className="rounded-full border border-[#3a324a14] bg-white px-3 py-1 text-[12px] font-bold text-gray-700 transition-all active:scale-[0.97] hover:border-[#a695d8] hover:text-[#a695d8]"
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

function sortCharacters<T extends { name: string }>(characters: T[]): T[] {
  return [...characters].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
