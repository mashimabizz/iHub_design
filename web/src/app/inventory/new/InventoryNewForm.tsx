"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveInventoryItem } from "@/app/inventory/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };

const CONDITIONS: { value: "sealed" | "mint" | "good" | "fair" | "poor"; label: string }[] = [
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
  const [kind, setKind] = useState<"for_trade" | "wanted">("for_trade");
  const [groupId, setGroupId] = useState<string>("");
  const [characterId, setCharacterId] = useState<string>("");
  const [goodsTypeId, setGoodsTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<
    "sealed" | "mint" | "good" | "fair" | "poor" | ""
  >("good");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/inventory");
  }, [router]);

  // 選択中グループに紐づくキャラクター
  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );

  // グループを変えたら character を reset
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
      setError("グループまたはメンバーを選択してください");
      return;
    }

    setPending(true);
    setError(null);
    const result = await saveInventoryItem({
      kind,
      groupId: groupId || undefined,
      characterId: characterId || undefined,
      goodsTypeId,
      title: title.trim(),
      description: description.trim() || undefined,
      condition: kind === "for_trade" && condition ? condition : undefined,
      quantity,
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
      className="space-y-4"
    >
      {/* 譲/求める */}
      <div>
        <label className="block text-sm font-bold text-gray-900">
          種別 <span className="text-red-500">*</span>
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["for_trade", "wanted"] as const).map((k) => {
            const active = kind === k;
            const label = k === "for_trade" ? "譲（出す）" : "求める（受）";
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl border-[1.5px] border-solid py-2.5 text-[13px] transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "border-[#a695d8] bg-[#a695d814] font-bold text-gray-900"
                    : "border-[#3a324a14] bg-white font-medium text-gray-900"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* グループ */}
      <div>
        <label htmlFor="group" className="block text-sm font-bold text-gray-900">
          グループ <span className="text-red-500">*</span>
        </label>
        <select
          id="group"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
        >
          <option value="">選択してください</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-gray-500">
          推し選択で登録したグループから選べます
        </p>
      </div>

      {/* メンバー（任意） */}
      {filteredCharacters.length > 0 && (
        <div>
          <label
            htmlFor="character"
            className="block text-sm font-bold text-gray-900"
          >
            メンバー <span className="text-gray-500">（任意・空 = 箱推し / 共通）</span>
          </label>
          <select
            id="character"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
          >
            <option value="">指定なし</option>
            {filteredCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* グッズ種別 */}
      <div>
        <label
          htmlFor="goods_type"
          className="block text-sm font-bold text-gray-900"
        >
          グッズ種別 <span className="text-red-500">*</span>
        </label>
        <select
          id="goods_type"
          value={goodsTypeId}
          onChange={(e) => setGoodsTypeId(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
        >
          <option value="">選択してください</option>
          {goodsTypes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-bold text-gray-900">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: スア トレカ（カムバ盤）"
          maxLength={100}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </div>

      {/* コンディション（譲のみ） */}
      {kind === "for_trade" && (
        <div>
          <label className="block text-sm font-bold text-gray-900">
            コンディション
          </label>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
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
        </div>
      )}

      {/* 数量 */}
      <div>
        <label
          htmlFor="quantity"
          className="block text-sm font-bold text-gray-900"
        >
          数量
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mt-2 block w-24 rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
        />
      </div>

      {/* 説明 */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-bold text-gray-900"
        >
          説明 <span className="text-gray-500">（任意）</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="状態の補足、入手経路、シリアル番号など"
          maxLength={1000}
          className="mt-2 block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
        <p className="mt-1.5 text-[11px] text-gray-500">
          {description.length} / 1000 文字
        </p>
      </div>

      {/* 写真（後実装） */}
      <div className="rounded-xl bg-[#a695d810] px-4 py-3 text-[11px] leading-relaxed text-gray-700">
        📷 写真アップロード機能は後の iter で実装します（Supabase Storage）
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="保存中...">
        登録する
      </PrimaryButton>
    </form>
  );
}
