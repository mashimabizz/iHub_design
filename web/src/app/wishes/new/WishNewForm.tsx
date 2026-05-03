"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveWishItem,
  type ExchangeType,
  type WishFlexLevel,
  type WishPriority,
} from "@/app/wishes/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };

// PRIORITIES / FLEX_OPTIONS は iter65.5 で UI から廃止
// iter67.3: exchangeType（同種 / 異種 / 同異種）は wish レベルで必須に復活
const EXCHANGE_OPTIONS: { value: ExchangeType; label: string; sub: string }[] =
  [
    { value: "any", label: "同異種", sub: "どちらでもOK（推奨）" },
    { value: "same_kind", label: "同種のみ", sub: "同じ種別のみ受付" },
    { value: "cross_kind", label: "異種のみ", sub: "別の種別と交換" },
  ];

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
  const [exchangeType, setExchangeType] = useState<ExchangeType>("any");
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
      // 優先度・許容範囲は UI 廃止（DB 列はデフォルト値で埋める）
      // exchangeType は iter67.3 で wish レベル必須に復活
      priority: "second" as WishPriority,
      flexLevel: "exact" as WishFlexLevel,
      exchangeType,
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

      {/* 交換タイプ（iter67.3 復活：wish レベル必須） */}
      <Section label="交換タイプ" hint="自己申告タグ">
        <div className="grid grid-cols-3 gap-1.5">
          {EXCHANGE_OPTIONS.map((opt) => {
            const active = exchangeType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExchangeType(opt.value)}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition-all ${
                  active
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                <span className="text-[12px] font-bold">{opt.label}</span>
                <span
                  className={`mt-0.5 text-[9.5px] leading-tight ${
                    active ? "text-white/85" : "text-gray-500"
                  }`}
                >
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-gray-500">
          「同種」=同じ種別と交換 / 「異種」=別の種別と交換 / 「同異種」=どちらでもOK。
          システムは弾きません（マッチング表示用のタグ）。
        </p>
      </Section>

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
