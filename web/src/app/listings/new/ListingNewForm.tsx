"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createListing, type ListingLogic } from "@/app/listings/actions";

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
  exchangeType?: "same_kind" | "cross_kind" | "any";
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

type Selected = { id: string; qty: number };

const ALL = "すべて";

const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

export function ListingNewForm({
  inventoryItems,
  wishItems,
}: {
  inventoryItems: InventoryOpt[];
  wishItems: WishOpt[];
}) {
  const router = useRouter();

  const [haves, setHaves] = useState<Selected[]>([]);
  const [haveLogic, setHaveLogic] = useState<ListingLogic>("and");

  const [wishes, setWishes] = useState<Selected[]>([]);
  const [wishLogic, setWishLogic] = useState<ListingLogic>("or");

  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* フィルタ */
  const [havePushFilter, setHavePushFilter] = useState(ALL);
  const [haveTypeFilter, setHaveTypeFilter] = useState(ALL);
  const [wishPushFilter, setWishPushFilter] = useState(ALL);
  const [wishTypeFilter, setWishTypeFilter] = useState(ALL);

  /* フィルタ候補 */
  const havePushOpts = useMemo(
    () => collectFilter(inventoryItems, "push"),
    [inventoryItems],
  );
  const haveTypeOpts = useMemo(
    () => collectFilter(inventoryItems, "type"),
    [inventoryItems],
  );
  const wishPushOpts = useMemo(
    () => collectFilter(wishItems, "push"),
    [wishItems],
  );
  const wishTypeOpts = useMemo(
    () => collectFilter(wishItems, "type"),
    [wishItems],
  );

  const filteredInv = useMemo(
    () => filterItems(inventoryItems, havePushFilter, haveTypeFilter),
    [inventoryItems, havePushFilter, haveTypeFilter],
  );
  const filteredWishes = useMemo(
    () => filterItems(wishItems, wishPushFilter, wishTypeFilter),
    [wishItems, wishPushFilter, wishTypeFilter],
  );

  useEffect(() => {
    router.prefetch("/listings");
  }, [router]);

  /* OR×OR ガード（UI 段階で警告） */
  const orOrViolation =
    haveLogic === "or" && wishLogic === "or" && haves.length > 1 && wishes.length > 1;

  function toggleSelect(
    set: Selected[],
    setSet: (s: Selected[]) => void,
    id: string,
  ) {
    const existing = set.find((s) => s.id === id);
    if (existing) {
      setSet(set.filter((s) => s.id !== id));
    } else {
      setSet([...set, { id, qty: 1 }]);
    }
  }

  function setQty(
    set: Selected[],
    setSet: (s: Selected[]) => void,
    id: string,
    delta: number,
  ) {
    setSet(
      set.map((s) =>
        s.id === id
          ? { ...s, qty: Math.max(1, Math.min(99, s.qty + delta)) }
          : s,
      ),
    );
  }

  async function handleSubmit() {
    setError(null);
    if (haves.length === 0) {
      setError("譲るグッズを 1 件以上選択してください");
      return;
    }
    if (wishes.length === 0) {
      setError("求める wish を 1 件以上選択してください");
      return;
    }
    if (orOrViolation) {
      setError(
        "両側で複数アイテム × OR は曖昧なため指定できません。どちらかを AND にするか片側を 1 件にしてください。",
      );
      return;
    }
    setPending(true);
    const r = await createListing({
      haveIds: haves.map((s) => s.id),
      haveQtys: haves.map((s) => s.qty),
      haveLogic,
      wishIds: wishes.map((s) => s.id),
      wishQtys: wishes.map((s) => s.qty),
      wishLogic,
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
      {/* ─ 譲側 ─ */}
      <Section
        label="譲るグッズ"
        required
        hint={`${haves.length} 件選択中 / ${filteredInv.length} 件表示`}
      >
        <FilterRow
          label="推し"
          options={havePushOpts}
          value={havePushFilter}
          onChange={setHavePushFilter}
        />
        <FilterRow
          label="種別"
          options={haveTypeOpts}
          value={haveTypeFilter}
          onChange={setHaveTypeFilter}
        />

        {filteredInv.length === 0 ? (
          <Empty label="条件に合う譲るグッズがありません" />
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {filteredInv.map((it) => {
              const sel = haves.find((s) => s.id === it.id);
              return (
                <PanelCard
                  key={it.id}
                  item={it}
                  selected={!!sel}
                  qty={sel?.qty ?? 0}
                  onClick={() => toggleSelect(haves, setHaves, it.id)}
                  onQty={(d) => setQty(haves, setHaves, it.id, d)}
                />
              );
            })}
          </div>
        )}

        {haves.length > 1 && (
          <LogicToggle
            label="この複数の譲は…"
            value={haveLogic}
            onChange={setHaveLogic}
          />
        )}
      </Section>

      {/* ─ 求側 ─ */}
      <Section
        label="求める wish"
        required
        hint={`${wishes.length} 件選択中 / ${filteredWishes.length} 件表示`}
      >
        <FilterRow
          label="推し"
          options={wishPushOpts}
          value={wishPushFilter}
          onChange={setWishPushFilter}
        />
        <FilterRow
          label="種別"
          options={wishTypeOpts}
          value={wishTypeFilter}
          onChange={setWishTypeFilter}
        />

        {filteredWishes.length === 0 ? (
          <Empty label="条件に合う wish がありません" />
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filteredWishes.map((w) => {
              const sel = wishes.find((s) => s.id === w.id);
              return (
                <WishChip
                  key={w.id}
                  item={w}
                  selected={!!sel}
                  qty={sel?.qty ?? 0}
                  onClick={() => toggleSelect(wishes, setWishes, w.id)}
                  onQty={(d) => setQty(wishes, setWishes, w.id, d)}
                />
              );
            })}
          </div>
        )}

        {wishes.length > 1 && (
          <LogicToggle
            label="この複数の wish は…"
            value={wishLogic}
            onChange={setWishLogic}
          />
        )}
      </Section>

      {orOrViolation && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-700">
          ⚠️
          譲・求の両方で複数アイテム ×{" "}
          <b>OR</b>{" "}
          を選んでいます。「誰がどれを選ぶのか」が曖昧になるため、
          <b>どちらかは AND</b>
          にするか、片側のアイテムを 1 件にしてください。
        </div>
      )}

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

      <PrimaryButton
        type="submit"
        pending={pending}
        pendingLabel="登録中…"
        disabled={orOrViolation}
      >
        個別募集を作成
      </PrimaryButton>
    </form>
  );
}

/* ─── helpers ───────────────────────────────────────── */

function collectFilter(
  arr: { groupName: string | null; characterName: string | null; goodsTypeName: string | null }[],
  type: "push" | "type",
): string[] {
  const set = new Set<string>([ALL]);
  for (const it of arr) {
    if (type === "push") {
      if (it.groupName) set.add(it.groupName);
      if (it.characterName) set.add(it.characterName);
    } else {
      if (it.goodsTypeName) set.add(it.goodsTypeName);
    }
  }
  return Array.from(set);
}

function filterItems<
  T extends {
    groupName: string | null;
    characterName: string | null;
    goodsTypeName: string | null;
  },
>(arr: T[], pushFilter: string, typeFilter: string): T[] {
  return arr.filter((it) => {
    if (
      pushFilter !== ALL &&
      it.groupName !== pushFilter &&
      it.characterName !== pushFilter
    ) {
      return false;
    }
    if (typeFilter !== ALL && it.goodsTypeName !== typeFilter) return false;
    return true;
  });
}

/* ─── 共通 sub-components ──────────────────────────── */

function Empty({ label }: { label: string }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-4 text-center text-[11px] text-gray-500">
      {label}
    </div>
  );
}

function LogicToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ListingLogic;
  onChange: (v: ListingLogic) => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-[#3a324a14] bg-[#fbf9fc] p-2.5">
      <div className="mb-1.5 px-1 text-[11px] font-bold text-[#3a324a8c]">
        {label}
      </div>
      <div className="flex gap-1">
        {(
          [
            { v: "and" as const, label: "全部 (AND)", sub: "セットで取引" },
            { v: "or" as const, label: "いずれか (OR)", sub: "どれか1つでOK" },
          ]
        ).map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              className={`flex-1 rounded-lg px-3 py-2 text-center transition-all ${
                active
                  ? "bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.33)]"
                  : "bg-white text-gray-700"
              }`}
            >
              <div
                className={`text-[12px] ${active ? "font-extrabold" : "font-bold"}`}
              >
                {opt.label}
              </div>
              <div
                className={`mt-0.5 text-[9.5px] ${
                  active ? "text-white/80" : "text-gray-500"
                }`}
              >
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 譲側のパネルカード */
function PanelCard({
  item,
  selected,
  qty,
  onClick,
  onQty,
}: {
  item: InventoryOpt;
  selected: boolean;
  qty: number;
  onClick: () => void;
  onQty: (delta: number) => void;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${item.hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${item.hue}, 30%, 30%, 0.4)`;
  const memberName = item.characterName ?? item.groupName ?? item.title;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-[0_2px_6px_rgba(58,50,74,0.08)] transition-all ${
        selected
          ? "border-[2px] border-[#a695d8] shadow-[0_6px_16px_rgba(166,149,216,0.45)]"
          : "border-[#3a324a14]"
      }`}
      style={{
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-0 active:scale-[0.97]"
        aria-label={selected ? "選択解除" : "選択"}
      />
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* メンバー名 */}
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-10">
        <div
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {memberName}
        </div>
      </div>

      {selected ? (
        <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded-full bg-white/95 p-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            disabled={qty <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onQty(-1);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a695d8] text-[12px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            −
          </button>
          <span className="min-w-[22px] text-center text-[10.5px] font-extrabold tabular-nums">
            ×{qty}
          </span>
          <button
            type="button"
            disabled={qty >= 99}
            onClick={(e) => {
              e.stopPropagation();
              onQty(1);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a695d8] text-[12px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            ＋
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-white bg-white/55 text-[#a695d8] shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          ＋
        </div>
      )}

      {!hasPhoto && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {memberName[0]}
        </div>
      )}

      {/* 下部ストリップ */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-1"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="truncate text-[10px] font-bold text-gray-900">
          {item.goodsTypeName ?? "?"}
        </div>
      </div>
    </div>
  );
}

/* 求側の chip */
function WishChip({
  item,
  selected,
  qty,
  onClick,
  onQty,
}: {
  item: WishOpt;
  selected: boolean;
  qty: number;
  onClick: () => void;
  onQty: (delta: number) => void;
}) {
  const name = item.characterName ?? item.groupName ?? item.title;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold transition-all ${
        selected
          ? "bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)]"
          : "border border-[#3a324a14] bg-white text-gray-700"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5"
      >
        {name}
        {item.goodsTypeName && (
          <span
            className={`text-[9.5px] font-semibold ${
              selected ? "text-white/80" : "text-gray-500"
            }`}
          >
            · {item.goodsTypeName}
          </span>
        )}
        {item.exchangeType && item.exchangeType !== "any" && (
          <span
            className={`text-[9px] font-bold ${selected ? "text-white/85" : "text-[#a695d8]"}`}
          >
            {EXCHANGE_LABEL[item.exchangeType]}
          </span>
        )}
      </button>
      {selected && (
        <span className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-white/25 px-1 py-[1px]">
          <button
            type="button"
            disabled={qty <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onQty(-1);
            }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-[#a695d8] disabled:opacity-50"
          >
            −
          </button>
          <span className="min-w-[18px] text-center text-[10px] font-extrabold tabular-nums">
            ×{qty}
          </span>
          <button
            type="button"
            disabled={qty >= 99}
            onClick={(e) => {
              e.stopPropagation();
              onQty(1);
            }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-[#a695d8] disabled:opacity-50"
          >
            ＋
          </button>
        </span>
      )}
    </span>
  );
}

/* ─── filter & section ─────────────────────────────── */

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
