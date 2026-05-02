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

const PRIORITIES: {
  value: WishPriority;
  label: string;
  sub: string;
  bg: string;
  textOnActive: string;
}[] = [
  { value: "top", label: "最優先", sub: "最高ウェイト", bg: "#d4866b", textOnActive: "#fff" },
  { value: "second", label: "2 番手", sub: "通常", bg: "#a695d8", textOnActive: "#fff" },
  { value: "flexible", label: "妥協 OK", sub: "低ウェイト", bg: "#7a9a8a", textOnActive: "#fff" },
];

const FLEX_OPTIONS: {
  value: WishFlexLevel;
  label: string;
  sub: string;
}[] = [
  {
    value: "exact",
    label: "完全一致のみ",
    sub: "このグッズと完全に同じものだけ",
  },
  {
    value: "character_any",
    label: "キャラ問わず",
    sub: "同じシリーズなら推し以外でも OK",
  },
  {
    value: "series_any",
    label: "シリーズ問わず",
    sub: "推し関連なら何でも嬉しい",
  },
];

const EXCHANGE_OPTIONS: {
  value: ExchangeType;
  label: string;
  sub: string;
}[] = [
  {
    value: "any",
    label: "どちらでも",
    sub: "同種・異種を問わない",
  },
  {
    value: "same_kind",
    label: "同種のみ",
    sub: "同じグッズ種別での交換",
  },
  {
    value: "cross_kind",
    label: "異種のみ",
    sub: "別の種別との交換",
  },
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
  const [priority, setPriority] = useState<WishPriority>("second");
  const [flexLevel, setFlexLevel] = useState<WishFlexLevel>("exact");
  const [exchangeType, setExchangeType] = useState<ExchangeType>("any");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const result = await saveWishItem({
      groupId: groupId || undefined,
      characterId: characterId || undefined,
      goodsTypeId,
      title: title.trim(),
      priority,
      flexLevel,
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

          <Field label="タイトル" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: スア 生写真 Vol.4"
              maxLength={100}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
          </Field>

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

      {/* 優先度 */}
      <Section label="優先度" hint="マッチ提案の並び順に影響">
        <div className="grid grid-cols-3 gap-1.5">
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2.5 transition-all ${
                  active
                    ? "border-0 text-white"
                    : "border border-[#3a324a14] bg-white text-gray-900"
                }`}
                style={{
                  background: active ? p.bg : undefined,
                }}
              >
                <span className="text-[12px] font-extrabold">{p.label}</span>
                <span
                  className={`text-[9.5px] ${
                    active ? "text-white/85" : "text-gray-500"
                  }`}
                >
                  {p.sub}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 許容範囲 */}
      <Section label="許容範囲（マッチング条件）" hint="広いほどマッチ多数">
        <div className="space-y-1.5">
          {FLEX_OPTIONS.map((g) => {
            const active = flexLevel === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setFlexLevel(g.value)}
                className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                  active
                    ? "bg-[#a695d810]"
                    : "bg-white border border-[#3a324a14]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                    active
                      ? "border-[#a695d8] bg-[#a695d8]"
                      : "border-[#3a324a40] bg-transparent"
                  }`}
                >
                  {active && (
                    <span className="h-[7px] w-[7px] rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-bold text-gray-900">
                    {g.label}
                  </div>
                  <div className="mt-0.5 text-[10.5px] leading-snug text-gray-500">
                    {g.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 交換タイプ（自己申告タグ・システム判定なし） */}
      <Section
        label="交換タイプ"
        hint="マッチカードに表示・判断材料"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {EXCHANGE_OPTIONS.map((e) => {
            const active = exchangeType === e.value;
            return (
              <button
                key={e.value}
                type="button"
                onClick={() => setExchangeType(e.value)}
                className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 text-center transition-all ${
                  active
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                <span className="text-[12px] font-bold">{e.label}</span>
                <span
                  className={`mt-0.5 text-[9.5px] leading-tight ${
                    active ? "text-white/85" : "text-gray-500"
                  }`}
                >
                  {e.sub}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-gray-500">
          ※ 自己申告タグです。マッチング演算では弾かれません。
          相手の譲るグッズと並べてユーザー自身が判断する用途。
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
