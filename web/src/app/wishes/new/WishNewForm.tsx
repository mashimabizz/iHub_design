"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveWishItem,
  type WishFlexLevel,
  type WishPriority,
} from "@/app/wishes/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };

// PRIORITIES / FLEX_OPTIONS は iter65.5 で UI から廃止
// EXCHANGE_OPTIONS も iter65.6 で wish レベルから廃止（個別募集の方で設定）

export function WishNewForm({
  groups,
  characters,
  goodsTypes,
}: {
  groups: Master[];
  characters: CharacterMaster[];
  goodsTypes: Master[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState<string>("");
  const [characterId, setCharacterId] = useState<string>("");
  const [goodsTypeId, setGoodsTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 「その他」種別のとき手動でタイトル入力、それ以外は auto-title
  const selectedGoodsType = goodsTypes.find((g) => g.id === goodsTypeId);
  const isOther = selectedGoodsType?.name === "その他";

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedCharacter = characters.find((c) => c.id === characterId);

  useEffect(() => {
    router.prefetch("/wishes");
  }, [router]);

  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );

  useEffect(() => {
    setCharacterId("");
  }, [groupId]);

  async function handleSubmit() {
    if (!goodsTypeId) {
      setError("グッズ種別を選択してください");
      return;
    }
    if (!groupId && !characterId) {
      setError("推しのグループまたはメンバーを選択してください");
      return;
    }
    // タイトルは「その他」のとき必須、それ以外は自動生成
    let finalTitle = title.trim();
    if (isOther) {
      if (!finalTitle) {
        setError("タイトルを入力してください（その他選択時は必須）");
        return;
      }
    } else if (!finalTitle) {
      const name =
        selectedCharacter?.name ?? selectedGroup?.name ?? "";
      finalTitle = `${name} ${selectedGoodsType?.name ?? ""}`.trim();
    }

    setPending(true);
    setError(null);
    const result = await saveWishItem({
      groupId: groupId || undefined,
      characterId: characterId || undefined,
      goodsTypeId,
      title: finalTitle,
      // 優先度・許容範囲・交換タイプは UI 廃止（DB 列はデフォルト値で埋める）
      priority: "second" as WishPriority,
      flexLevel: "exact" as WishFlexLevel,
      exchangeType: "any",
      note: note.trim() || undefined,
      quantity,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/wishes");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* 推し */}
      <Section label="推し">
        <div className="space-y-2.5">
          <Field label="グループ" required>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            >
              <option value="">選択してください</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          {filteredCharacters.length > 0 && (
            <Field label="メンバー" hint="（任意）">
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
              >
                <option value="">指定なし</option>
                {filteredCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Section>

      {/* グッズ */}
      <Section label="グッズ">
        <div className="space-y-2.5">
          <Field label="種別" required>
            <select
              value={goodsTypeId}
              onChange={(e) => setGoodsTypeId(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            >
              <option value="">選択してください</option>
              {goodsTypes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          {/* タイトルは「その他」種別のときのみ入力。それ以外は自動生成 */}
          {isOther && (
            <Field label="タイトル" required>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 公式ステッカー"
                maxLength={100}
                className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
              />
            </Field>
          )}

          <Field label="数量">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 active:scale-[0.95] disabled:opacity-40"
              >
                −
              </button>
              <div className="flex h-11 min-w-[60px] items-center justify-center rounded-xl border border-[#3a324a14] bg-white px-4 text-base font-bold tabular-nums text-gray-900">
                {quantity}
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 active:scale-[0.95]"
              >
                +
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* 優先度・許容範囲・交換タイプは wish レベルでは廃止（iter65.5/65.6）。
          交換タイプは個別募集（listings）作成時のみ設定。 */}

      {/* メモ */}
      <Section label="メモ" hint={`${note.length} / 200`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="例: 4/27 横アリで取引できる人優先"
          maxLength={200}
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="登録中...">
        ウィッシュを登録
      </PrimaryButton>
    </form>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-gray-500">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 block text-sm font-bold text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && (
          <span className="ml-1 text-[11px] font-medium text-gray-500">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
