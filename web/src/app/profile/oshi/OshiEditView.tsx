"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  saveCharacterRequest,
  saveOshiRequest,
} from "@/app/onboarding/actions";
import {
  addCharacterToOshi,
  removeCharacterFromOshi,
  removeOshiGroup,
} from "@/app/profile/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Group = {
  groupId: string;
  groupName: string;
  members: { id: string; name: string }[];
  availableCharacters: { id: string; name: string }[];
};

type ActionResult = { error?: string } | undefined;
type OshiMutation = () => Promise<ActionResult>;
type GenreOption = { id: string; name: string };
type OshiRequestKind = "group" | "work" | "solo";
type RequestModalState =
  | { type: "oshi" }
  | { type: "member"; groupId: string; groupName: string };

const REQUEST_KINDS: { value: OshiRequestKind; label: string }[] = [
  { value: "group", label: "グループ" },
  { value: "work", label: "作品" },
  { value: "solo", label: "ソロ" },
];

/**
 * 推し設定編集（モックアップ account-extras.jsx::OshiEdit ベース・案 Z）
 *
 * - グループ削除
 * - メンバー削除（各 chip の ×）
 * - メンバー追加（同グループの未選択キャラを inline 展開）
 * - 「+ 推しを追加」→ /onboarding/oshi?return=profile
 * - 推し / メンバー追加リクエスト（マスタにない）→ 画面内モーダルで送信
 */
export function OshiEditView({
  oshiGroups,
  initialRequestModal = false,
  genreOptions,
}: {
  oshiGroups: Group[];
  initialRequestModal?: boolean;
  genreOptions: GenreOption[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>(oshiGroups);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [requestModal, setRequestModal] = useState<RequestModalState | null>(
    initialRequestModal ? { type: "oshi" } : null,
  );
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setGroups(oshiGroups);
    }
  }, [oshiGroups]);

  useEffect(() => {
    if (initialRequestModal) router.replace("/profile/oshi", { scroll: false });
  }, [initialRequestModal, router]);

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

  function openOshiRequest() {
    setRequestNotice(null);
    setRequestModal({ type: "oshi" });
  }

  function openMemberRequest(group: Pick<Group, "groupId" | "groupName">) {
    setRequestNotice(null);
    setRequestModal({
      type: "member",
      groupId: group.groupId,
      groupName: group.groupName,
    });
  }

  function handleRequestDone(message: string) {
    setRequestModal(null);
    setRequestNotice(message);
    router.refresh();
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
      {requestNotice && (
        <div className="rounded-xl border border-[#a8d4e655] bg-[#a8d4e61a] px-3.5 py-2.5 text-[11.5px] font-semibold leading-relaxed text-[#3a324a]">
          {requestNotice}
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
            + 登録済みの推しを追加 →
          </Link>
          <button
            type="button"
            onClick={openOshiRequest}
            className="mt-2 block w-full font-bold text-[#a695d8]"
          >
            マスタに無い推しを追加リクエスト
          </button>
        </div>
      ) : (
        groups.map((g) => (
          <GroupCard
            key={g.groupId}
            group={g}
            setGroups={setGroups}
            enqueueMutation={enqueueMutation}
            onMemberRequest={openMemberRequest}
          />
        ))
      )}

      {/* + 推しを追加（グループ） */}
      <Link
        href="/onboarding/oshi?return=profile"
        className="block w-full rounded-[14px] border-[1.5px] border-dashed border-[#a695d855] bg-white px-4 py-4 text-center text-[13px] font-bold text-[#a695d8] transition-all active:scale-[0.99]"
      >
        ＋ 登録済みの推しを追加（グループ・作品）
      </Link>
      <button
        type="button"
        onClick={openOshiRequest}
        className="block w-full rounded-[14px] border border-[#3a324a14] bg-white px-4 py-3.5 text-center text-[12.5px] font-bold text-[#a695d8] transition-all active:scale-[0.99]"
      >
        マスタに無い推しを追加リクエスト
      </button>

      {requestModal && (
        <RequestModal
          state={requestModal}
          genres={genreOptions}
          onClose={() => setRequestModal(null)}
          onDone={handleRequestDone}
        />
      )}
    </div>
  );
}

/* ─── Group Card ─────────────────────────────────────────── */

function GroupCard({
  group,
  setGroups,
  enqueueMutation,
  onMemberRequest,
}: {
  group: Group;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  enqueueMutation: (
    task: OshiMutation,
    onRollback?: (error: Error) => void,
  ) => void;
  onMemberRequest: (group: Pick<Group, "groupId" | "groupName">) => void;
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
              <button
                type="button"
                onClick={() => onMemberRequest(group)}
                className="text-[11.5px] font-bold text-[#a695d8]"
              >
                マスタに無いメンバーを追加リクエスト
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Request Modal ─────────────────────────────────────────── */

function RequestModal({
  state,
  genres,
  onClose,
  onDone,
}: {
  state: RequestModalState;
  genres: GenreOption[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState("");
  const [kind, setKind] = useState<OshiRequestKind | "">("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (typeof document === "undefined") return null;

  const isMemberRequest = state.type === "member";
  const title = isMemberRequest
    ? "メンバー追加リクエスト"
    : "推し追加リクエスト";
  const description = isMemberRequest
    ? "マスタに無いメンバー・キャラクターを運営へ送ります。"
    : "マスタに無いグループ・作品・ソロを運営へ送ります。";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(
        isMemberRequest
          ? "メンバー名を入力してください"
          : "推しの名前を入力してください",
      );
      return;
    }

    setPending(true);
    setError(null);
    const result =
      state.type === "member"
        ? await saveCharacterRequest({
            groupId: state.groupId,
            name: trimmed,
            note: note.trim() || undefined,
          })
        : await saveOshiRequest({
            name: trimmed,
            genreId: genreId || undefined,
            kind: kind || undefined,
            note: note.trim() || undefined,
          });

    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }

    onDone(
      isMemberRequest
        ? "メンバー追加リクエストを送信しました。運営確認後に反映されます。"
        : "推し追加リクエストを送信しました。運営確認後に反映されます。",
    );
  }

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] border border-white/80 bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3 shadow-[0_-22px_54px_rgba(58,50,74,0.24)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#3a324a1f]" />
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[16px] font-extrabold text-white">
            +
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-extrabold text-[#3a324a]">
              {title}
            </h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#3a324a99]">
              {description}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#3a324a08] text-[18px] font-bold text-[#3a324a8c] transition-all active:scale-[0.96] disabled:opacity-40"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isMemberRequest && (
            <div className="rounded-xl bg-[#a695d810] px-4 py-3 text-[12px] text-[#3a324a]">
              <span className="font-bold">追加先:</span>{" "}
              <span className="font-extrabold">{state.groupName}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="profile_oshi_request_name"
              className="block text-[13px] font-bold text-gray-900"
            >
              {isMemberRequest
                ? "メンバー / キャラクター名"
                : "推しの名前"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="profile_oshi_request_name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isMemberRequest ? "例: スア" : "例: LUMENA"}
              maxLength={100}
              className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
            />
            <p className="mt-1.5 text-[11px] text-gray-500">
              公式表記の通りに入力してください
            </p>
          </div>

          {!isMemberRequest && (
            <>
              <div>
                <label
                  htmlFor="profile_oshi_request_genre"
                  className="block text-[13px] font-bold text-gray-900"
                >
                  ジャンル <span className="text-gray-500">（任意）</span>
                </label>
                <select
                  id="profile_oshi_request_genre"
                  value={genreId}
                  onChange={(e) => setGenreId(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
                >
                  <option value="">選択しない</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-900">
                  種類 <span className="text-gray-500">（任意）</span>
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {REQUEST_KINDS.map((requestKind) => {
                    const active = kind === requestKind.value;
                    return (
                      <button
                        key={requestKind.value}
                        type="button"
                        onClick={() =>
                          setKind(active ? "" : requestKind.value)
                        }
                        className={`rounded-xl border-[1.5px] border-solid py-2.5 text-[13px] transition-all duration-150 active:scale-[0.97] ${
                          active
                            ? "border-[#a695d8] bg-[#a695d814] font-bold text-gray-900"
                            : "border-[#3a324a14] bg-white font-medium text-gray-900 hover:border-[#3a324a26]"
                        }`}
                      >
                        {requestKind.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="profile_oshi_request_note"
              className="block text-[13px] font-bold text-gray-900"
            >
              メモ <span className="text-gray-500">（任意）</span>
            </label>
            <textarea
              id="profile_oshi_request_note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={
                isMemberRequest
                  ? "本名・別名・公式リンクなど"
                  : "公式サイト URL、別名、補足など"
              }
              maxLength={500}
              className="mt-2 block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
            />
            <p className="mt-1.5 text-[11px] text-gray-500">
              {note.length} / 500 文字
            </p>
          </div>

          <div className="rounded-xl bg-[#a695d810] px-4 py-3 text-[11px] leading-relaxed text-gray-700">
            運営が確認後、既存マスタと一致した場合は紐付け、新規の場合はマスタに追加されます。
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2.5 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="rounded-[14px] border-[1.5px] border-[#a695d855] bg-white px-4 py-[13px] text-sm font-bold text-gray-900 transition-all active:scale-[0.97] disabled:opacity-45"
            >
              閉じる
            </button>
            <PrimaryButton
              type="submit"
              disabled={!name.trim()}
              pending={pending}
              pendingLabel="送信中..."
              className="py-[13px]"
            >
              送信する
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function sortCharacters<T extends { name: string }>(characters: T[]): T[] {
  return [...characters].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
