"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import {
  createListing,
  type ListingExchangeType,
} from "@/app/listings/actions";

type InventoryOpt = {
  id: string;
  title: string;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  hue: number;
};

type WishOpt = {
  id: string;
  title: string;
  exchangeType?: ListingExchangeType;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

const EXCHANGE_OPTS: {
  value: ListingExchangeType;
  label: string;
  sub: string;
}[] = [
  { value: "any", label: "どちらでも", sub: "同種・異種を問わない" },
  { value: "same_kind", label: "同種のみ", sub: "同じ種別での交換" },
  { value: "cross_kind", label: "異種のみ", sub: "別の種別との交換" },
];

const ALL = "すべて";

export function ListingNewForm({
  inventoryItems,
  wishItems,
}: {
  inventoryItems: InventoryOpt[];
  wishItems: WishOpt[];
}) {
  const router = useRouter();

  // ─── 譲（単選択） ─────────────────────────────────
  const [inventoryId, setInventoryId] = useState(inventoryItems[0]?.id ?? "");
  // 絞り込み（推し / 種別）
  const [pushFilter, setPushFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  // フィルタ候補の自動抽出（重複排除）
  const pushOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const it of inventoryItems) {
      if (it.groupName) set.add(it.groupName);
      if (it.characterName) set.add(it.characterName);
    }
    return Array.from(set);
  }, [inventoryItems]);
  const typeOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const it of inventoryItems) {
      if (it.goodsTypeName) set.add(it.goodsTypeName);
    }
    return Array.from(set);
  }, [inventoryItems]);

  const filteredInventory = useMemo(() => {
    return inventoryItems.filter((it) => {
      if (
        pushFilter !== ALL &&
        it.groupName !== pushFilter &&
        it.characterName !== pushFilter
      ) {
        return false;
      }
      if (typeFilter !== ALL && it.goodsTypeName !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [inventoryItems, pushFilter, typeFilter]);

  // ─── wish（複数選択） ─────────────────────────────
  const [wishIds, setWishIds] = useState<string[]>([]);
  // wish 絞り込み
  const [wishPushFilter, setWishPushFilter] = useState(ALL);
  const [wishTypeFilter, setWishTypeFilter] = useState(ALL);

  const wishPushOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const w of wishItems) {
      if (w.groupName) set.add(w.groupName);
      if (w.characterName) set.add(w.characterName);
    }
    return Array.from(set);
  }, [wishItems]);
  const wishTypeOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const w of wishItems) {
      if (w.goodsTypeName) set.add(w.goodsTypeName);
    }
    return Array.from(set);
  }, [wishItems]);

  const filteredWishes = useMemo(() => {
    return wishItems.filter((w) => {
      if (
        wishPushFilter !== ALL &&
        w.groupName !== wishPushFilter &&
        w.characterName !== wishPushFilter
      ) {
        return false;
      }
      if (wishTypeFilter !== ALL && w.goodsTypeName !== wishTypeFilter) {
        return false;
      }
      return true;
    });
  }, [wishItems, wishPushFilter, wishTypeFilter]);

  // ─── その他 ───────────────────────────────────
  const [exchangeType, setExchangeType] = useState<ListingExchangeType>("any");
  const [ratioGive, setRatioGive] = useState(1);
  const [ratioReceive, setRatioReceive] = useState(1);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/listings");
  }, [router]);

  function toggleWish(id: string) {
    setWishIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!inventoryId) {
      setError("譲るグッズを選択してください");
      return;
    }
    if (wishIds.length === 0) {
      setError("求める wish を 1 件以上選択してください");
      return;
    }
    setPending(true);
    const r = await createListing({
      inventoryId,
      wishIds,
      exchangeType,
      ratioGive,
      ratioReceive,
      note: note.trim() || undefined,
    });
    if (r?.error) {
      setPending(false);
      setError(r.error);
      return;
    }
    router.push("/listings");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* 譲るグッズ：パネル形式 + 絞り込み */}
      <Section
        label="譲るグッズ（1 件選択）"
        required
        hint={`${filteredInventory.length} / ${inventoryItems.length}`}
      >
        <FilterRow
          label="推し"
          options={pushOptions}
          value={pushFilter}
          onChange={setPushFilter}
        />
        <FilterRow
          label="種別"
          options={typeOptions}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        {filteredInventory.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-4 text-center text-[11px] text-gray-500">
            条件に合う譲るグッズがありません
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {filteredInventory.map((it) => {
              const sel = inventoryId === it.id;
              return (
                <PanelCard
                  key={it.id}
                  item={it}
                  selected={sel}
                  onClick={() => setInventoryId(it.id)}
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* 求める wish：複数選択 + 絞り込み */}
      <Section
        label={`求める wish（複数選択）`}
        required
        hint={`${wishIds.length} 件選択中 / ${filteredWishes.length} 件表示`}
      >
        <FilterRow
          label="推し"
          options={wishPushOptions}
          value={wishPushFilter}
          onChange={setWishPushFilter}
        />
        <FilterRow
          label="種別"
          options={wishTypeOptions}
          value={wishTypeFilter}
          onChange={setWishTypeFilter}
        />
        {filteredWishes.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-4 text-center text-[11px] text-gray-500">
            条件に合う wish がありません
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filteredWishes.map((w) => {
              const sel = wishIds.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWish(w.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${
                    sel
                      ? "bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)]"
                      : "border border-[#3a324a14] bg-white text-gray-700"
                  }`}
                >
                  {w.characterName ?? w.groupName ?? w.title}
                  {w.goodsTypeName && (
                    <span
                      className={`text-[9.5px] font-semibold ${
                        sel ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      · {w.goodsTypeName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* 交換タイプ */}
      <Section label="交換タイプ" hint="自己申告タグ・判定なし">
        <div className="grid grid-cols-3 gap-1.5">
          {EXCHANGE_OPTS.map((e) => {
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
      </Section>

      {/* 比率 */}
      <Section label="交換比率" hint="1〜10">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-[#a695d80a] py-3">
          <Stepper
            value={ratioGive}
            onChange={setRatioGive}
            min={1}
            max={10}
            label="譲"
          />
          <span className="text-[18px] font-bold text-[#3a324a8c]">↔</span>
          <Stepper
            value={ratioReceive}
            onChange={setRatioReceive}
            min={1}
            max={10}
            label="受"
          />
        </div>
        <p className="mt-1 px-1 text-[10.5px] text-gray-500">
          例: 「譲 1 ↔ 受 3」=「自分の譲 1 つ出して、相手から 3 つもらう」
        </p>
      </Section>

      {/* メモ */}
      <Section label="メモ" hint={`${note.length} / 500`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例: 同会場で取引できる方優先"
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="登録中…">
        個別募集を作成
      </PrimaryButton>
    </form>
  );
}

/* ─── パネルカード（在庫一覧の ItemCard を簡略化したもの） ─── */

function PanelCard({
  item,
  selected,
  onClick,
}: {
  item: InventoryOpt;
  selected: boolean;
  onClick: () => void;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${item.hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${item.hue}, 30%, 30%, 0.4)`;
  const memberName = item.characterName ?? item.groupName ?? item.title;
  const hasPhoto = !!item.photoUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border shadow-[0_2px_6px_rgba(58,50,74,0.08)] transition-all active:scale-[0.97] ${
        selected
          ? "border-[2px] border-[#a695d8] shadow-[0_6px_16px_rgba(166,149,216,0.45)]"
          : "border-[#3a324a14]"
      }`}
      style={{
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* メンバー名 */}
      <div className="absolute left-1.5 top-1.5 z-10">
        <div
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {memberName}
        </div>
      </div>

      {/* 選択チェックマーク */}
      {selected && (
        <div className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.6)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6l2.5 2.5L9.5 3.5"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* イニシャル（写真なし時） */}
      {!hasPhoto && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {memberName[0]}
        </div>
      )}

      {/* 下部ストリップ */}
      <div
        className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-1"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="truncate text-[10px] font-bold text-gray-900">
          {item.goodsTypeName ?? "?"}
        </div>
      </div>
    </button>
  );
}

/* ─── フィルタ chip 行 ─── */

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length <= 1) return null;
  return (
    <div className="-mx-1 mt-1.5 flex items-center gap-2 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden">
      <span className="flex-shrink-0 text-[10px] font-bold text-[#3a324a8c]">
        {label}
      </span>
      {options.map((o) => {
        const sel = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
              sel
                ? "bg-[#a695d8] text-white"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
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

function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 disabled:opacity-30"
        >
          −
        </button>
        <div className="min-w-[36px] text-center text-[24px] font-extrabold tabular-nums text-[#a695d8]">
          {value}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 disabled:opacity-30"
        >
          ＋
        </button>
      </div>
      <span className="text-[10px] font-bold text-[#3a324a8c]">{label}</span>
    </div>
  );
}
