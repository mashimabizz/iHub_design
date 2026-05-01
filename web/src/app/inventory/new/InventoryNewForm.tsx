"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInventoryItem } from "@/app/inventory/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };

const CONDITIONS: {
  value: "sealed" | "mint" | "good" | "fair" | "poor";
  label: string;
}[] = [
  { value: "sealed", label: "未開封" },
  { value: "mint", label: "極美" },
  { value: "good", label: "良好" },
  { value: "fair", label: "普通" },
  { value: "poor", label: "難あり" },
];

export function InventoryNewForm({
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
  const [series, setSeries] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<
    "sealed" | "mint" | "good" | "fair" | "poor"
  >("good");
  const [quantity, setQuantity] = useState(1);
  const [startCarrying, setStartCarrying] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/inventory");
  }, [router]);

  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );

  useEffect(() => {
    setCharacterId("");
  }, [groupId]);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!goodsTypeId) {
      setError("グッズ種別を選択してください");
      return;
    }
    if (!groupId && !characterId) {
      setError("推しのグループまたはメンバーを選択してください");
      return;
    }

    setPending(true);
    setError(null);
    const result = await saveInventoryItem({
      groupId: groupId || undefined,
      characterId: characterId || undefined,
      goodsTypeId,
      title: title.trim(),
      series: series.trim() || undefined,
      description: description.trim() || undefined,
      condition,
      quantity,
      startCarrying,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/inventory");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* 写真エリア（プレースホルダ・後で Supabase Storage 対応） */}
      <button
        type="button"
        disabled
        className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#a695d855] bg-[linear-gradient(120deg,#a695d810,#a8d4e610)] text-[#a695d8]"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          stroke="#a695d8"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="6" width="22" height="18" rx="2" />
          <circle cx="14" cy="15" r="4" />
          <path d="M9 6l2-3h6l2 3" />
        </svg>
        <span className="text-[12px] font-bold">写真を追加</span>
        <span className="text-[10px] text-gray-500">準備中（後実装）</span>
      </button>

      {/* セクション: 推し */}
      <Section title="推し">
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
            <Field label="メンバー" hint="（任意・空 = 箱推し / 共通）">
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

      {/* セクション: グッズ */}
      <Section title="グッズ">
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

          <Field label="タイトル" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: スア トレカ（カムバ盤）"
              maxLength={100}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>

          <Field label="シリーズ・弾名" hint="（任意）">
            <input
              type="text"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="例: WORLD TOUR / 5th Mini / 公式"
              maxLength={80}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {/* セクション: 状態 */}
      <Section title="状態">
        <div className="space-y-2.5">
          <Field label="コンディション">
            <div className="grid grid-cols-5 gap-1.5">
              {CONDITIONS.map((c) => {
                const active = condition === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondition(c.value)}
                    className={`rounded-xl border-[1.5px] border-solid py-2 text-[11px] transition-all duration-150 active:scale-[0.97] ${
                      active
                        ? "border-[#a695d8] bg-[#a695d814] font-bold text-gray-900"
                        : "border-[#3a324a14] bg-white font-medium text-gray-700"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="数量">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 transition-all active:scale-[0.95] disabled:opacity-40"
              >
                −
              </button>
              <div className="flex h-11 min-w-[60px] items-center justify-center rounded-xl border border-[#3a324a14] bg-white px-4 text-base font-bold tabular-nums text-gray-900">
                {quantity}
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                disabled={quantity >= 999}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 transition-all active:scale-[0.95] disabled:opacity-40"
              >
                +
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* セクション: メモ */}
      <Section title="メモ">
        <Field label="説明" hint="（任意）">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="状態の補足、入手経路、シリアル番号など"
            maxLength={1000}
            className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-gray-500">
            {description.length} / 1000 文字
          </p>
        </Field>
      </Section>

      {/* 持参モード */}
      <label className="flex items-start gap-2.5 rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12.5px]">
        <input
          type="checkbox"
          checked={startCarrying}
          onChange={(e) => setStartCarrying(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#a695d8] focus:ring-[#a695d8]"
        />
        <div className="flex-1">
          <span className="font-bold text-gray-900">🎒 今日から持参中にする</span>
          <span className="ml-1 text-gray-600">
            （会場で交換可能な状態にする）
          </span>
        </div>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="登録中...">
        登録する
      </PrimaryButton>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
        {title}
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
        {hint && <span className="ml-1 text-[11px] font-medium text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
