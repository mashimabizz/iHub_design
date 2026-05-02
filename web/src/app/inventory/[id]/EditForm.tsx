"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import {
  deleteInventoryItem,
  updateInventoryItem,
  updateInventoryStatus,
} from "../actions";

type Props = {
  item: {
    id: string;
    groupId: string;
    characterId: string | null;
    goodsTypeId: string;
    title: string;
    series: string | null;
    description: string | null;
    condition: "sealed" | "mint" | "good" | "fair" | "poor" | null;
    quantity: number;
    photoUrls: string[];
    status: "active" | "keep" | "traded" | "reserved" | "archived";
  };
  groups: { id: string; name: string }[];
  goodsTypes: { id: string; name: string }[];
  characters: { id: string; name: string; group_id: string }[];
};

const CONDITION_OPTIONS = [
  { id: "sealed", label: "未開封" },
  { id: "mint", label: "美品" },
  { id: "good", label: "良" },
  { id: "fair", label: "可" },
  { id: "poor", label: "難" },
] as const;

const STATUS_OPTIONS = [
  { id: "active", label: "譲る候補", color: "#a695d8" },
  { id: "keep", label: "自分用キープ", color: "#f3c5d4" },
  { id: "traded", label: "過去に譲った", color: "#9aa3b0" },
] as const;

export function EditForm({ item, groups, goodsTypes, characters }: Props) {
  const router = useRouter();

  const [groupId, setGroupId] = useState(item.groupId);
  const [characterId, setCharacterId] = useState(item.characterId ?? "");
  const [goodsTypeId, setGoodsTypeId] = useState(item.goodsTypeId);
  const [title, setTitle] = useState(item.title);
  const [series, setSeries] = useState(item.series ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [condition, setCondition] = useState<typeof item.condition>(
    item.condition,
  );
  const [quantity, setQuantity] = useState(item.quantity);
  const [status, setStatus] = useState(item.status);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // group 切替時、character は同 group のものでない限りリセット
  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );

  useEffect(() => {
    if (
      characterId &&
      !filteredCharacters.some((c) => c.id === characterId)
    ) {
      setCharacterId("");
    }
  }, [characterId, filteredCharacters]);

  useEffect(() => {
    router.prefetch("/inventory");
  }, [router]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      // status 変更があった場合は別 action で先に
      if (status !== item.status) {
        const r = await updateInventoryStatus(
          item.id,
          status as "active" | "keep" | "traded" | "archived",
        );
        if (r?.error) {
          setError(r.error);
          return;
        }
      }
      const r = await updateInventoryItem({
        id: item.id,
        groupId,
        characterId: characterId || null,
        goodsTypeId,
        title,
        series: series || undefined,
        description: description || undefined,
        condition: condition ?? undefined,
        quantity,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/inventory");
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `「${item.title}」を削除します。元に戻せません。\nよろしいですか？`,
      )
    ) {
      return;
    }
    startDeleteTransition(async () => {
      const r = await deleteInventoryItem(item.id);
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/inventory");
    });
  }

  const photoUrl = item.photoUrls[0] ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-5"
    >
      {/* 写真 */}
      {photoUrl && (
        <div className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-[#3a324a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={item.title}
            className="block aspect-[3/4] w-full object-cover"
          />
        </div>
      )}

      {/* グループ */}
      <Section label="グループ" required>
        <div className="grid grid-cols-2 gap-2">
          {groups.map((g) => {
            const sel = groupId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupId(g.id)}
                className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* キャラ */}
      <Section label="メンバー / キャラ" hint="(任意)">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCharacterId("")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              !characterId
                ? "bg-[#a695d8] text-white"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            指定なし
          </button>
          {filteredCharacters.map((c) => {
            const sel = characterId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCharacterId(c.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 種別 */}
      <Section label="グッズ種別" required>
        <div className="flex flex-wrap gap-1.5">
          {goodsTypes.map((gt) => {
            const sel = goodsTypeId === gt.id;
            return (
              <button
                key={gt.id}
                type="button"
                onClick={() => setGoodsTypeId(gt.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {gt.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* タイトル */}
      <Section label="タイトル" required>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="例: トレカ・スア"
          className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {/* シリーズ */}
      <Section label="シリーズ" hint="(任意)">
        <input
          type="text"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          maxLength={100}
          placeholder="例: WORLD TOUR / 5th Mini"
          className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {/* コンディション */}
      <Section label="コンディション" hint="(任意)">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCondition(null)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              !condition
                ? "bg-[#a695d8] text-white"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            指定なし
          </button>
          {CONDITION_OPTIONS.map((c) => {
            const sel = condition === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCondition(c.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 数量 */}
      <Section label="数量" required>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-xl font-bold text-gray-700"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))
            }
            className="block w-20 rounded-xl border border-[#3a324a14] bg-white px-3 py-2.5 text-center text-base font-bold tabular-nums text-gray-900 focus:border-[#a695d8] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity(Math.min(999, quantity + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-xl font-bold text-gray-700"
          >
            ＋
          </button>
        </div>
      </Section>

      {/* 説明 */}
      <Section label="説明 / メモ" hint={`${description.length} / 500`}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="補足やコンディションの詳細"
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {/* ステータス */}
      <Section label="ステータス">
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((s) => {
            const sel = status === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`rounded-xl px-2 py-2.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "text-white shadow-[0_4px_10px_rgba(0,0,0,0.12)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
                style={sel ? { backgroundColor: s.color } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="保存中…">
        変更を保存
      </PrimaryButton>

      {/* 削除（区切ったうえで赤系） */}
      <div className="mt-4 border-t border-[#3a324a0f] pt-5">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? (
            "削除中…"
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4h10M5 4V2.5h4V4M3 4l1 8h6l1-8" />
              </svg>
              この在庫を削除
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-gray-500">
          削除すると復元できません
        </p>
      </div>
    </form>
  );
}

function Section({
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
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
