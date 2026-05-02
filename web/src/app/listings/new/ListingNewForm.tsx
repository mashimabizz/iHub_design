"use client";

import { useEffect, useState } from "react";
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

const PRIORITIES = [
  { value: 1, label: "最高", color: "#d4866b" },
  { value: 2, label: "高", color: "#a695d8" },
  { value: 3, label: "中", color: "#a8d4e6" },
  { value: 4, label: "低", color: "#9aa3b0" },
  { value: 5, label: "最低", color: "#9aa3b0" },
] as const;

export function ListingNewForm({
  inventoryItems,
  wishItems,
}: {
  inventoryItems: InventoryOpt[];
  wishItems: WishOpt[];
}) {
  const router = useRouter();

  const [inventoryId, setInventoryId] = useState(inventoryItems[0]?.id ?? "");
  const [wishId, setWishId] = useState(wishItems[0]?.id ?? "");
  const [exchangeType, setExchangeType] = useState<ListingExchangeType>(
    wishItems[0]?.exchangeType ?? "any",
  );
  const [ratioGive, setRatioGive] = useState(1);
  const [ratioReceive, setRatioReceive] = useState(1);
  const [priority, setPriority] = useState(3);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // wish 切替時に exchange を引き継ぐ
  useEffect(() => {
    const w = wishItems.find((x) => x.id === wishId);
    if (w?.exchangeType) {
      setExchangeType(w.exchangeType);
    }
  }, [wishId, wishItems]);

  useEffect(() => {
    router.prefetch("/listings");
  }, [router]);

  async function handleSubmit() {
    setError(null);
    if (!inventoryId || !wishId) {
      setError("譲と wish を両方選んでください");
      return;
    }
    setPending(true);
    const r = await createListing({
      inventoryId,
      wishId,
      exchangeType,
      ratioGive,
      ratioReceive,
      priority,
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
      {/* 譲 select */}
      <Section label="譲るグッズ" required>
        <div className="space-y-1.5">
          {inventoryItems.map((it) => {
            const sel = inventoryId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setInventoryId(it.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  sel
                    ? "border-[1.5px] border-[#a695d8] bg-[#a695d810]"
                    : "border-[#3a324a14] bg-white"
                }`}
              >
                {it.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.photoUrl}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#3a324a08] text-[10px] text-[#3a324a8c]">
                    写真なし
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold text-gray-900">
                    {it.characterName ?? it.groupName ?? it.title}
                  </div>
                  <div className="text-[10.5px] text-gray-500">
                    {it.goodsTypeName ?? ""}
                  </div>
                </div>
                <Radio selected={sel} />
              </button>
            );
          })}
        </div>
      </Section>

      {/* wish select */}
      <Section label="求める wish" required>
        <div className="space-y-1.5">
          {wishItems.map((w) => {
            const sel = wishId === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setWishId(w.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  sel
                    ? "border-[1.5px] border-[#a695d8] bg-[#a695d810]"
                    : "border-[#3a324a14] bg-white"
                }`}
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-[#f3c5d4] bg-[#f3c5d40f] text-[16px]">
                  ✨
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold text-gray-900">
                    {w.characterName ?? w.groupName ?? w.title}
                  </div>
                  <div className="text-[10.5px] text-gray-500">
                    {w.goodsTypeName ?? ""}
                  </div>
                </div>
                <Radio selected={sel} />
              </button>
            );
          })}
        </div>
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
      <Section label="交換比率" hint="1〜10 まで">
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
          例: 「譲 1 ↔ 受 3」=「自分の譲を 1 つ出して、相手から 3 つもらう」
        </p>
      </Section>

      {/* 優先度 */}
      <Section label="優先度" hint="マッチング表示順">
        <div className="grid grid-cols-5 gap-1.5">
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded-xl px-2 py-2 text-center text-[11.5px] font-bold transition-all ${
                  active
                    ? "text-white shadow-[0_4px_10px_rgba(166,149,216,0.25)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
                style={active ? { backgroundColor: p.color } : undefined}
              >
                <div>{p.value}</div>
                <div className="text-[9.5px] font-semibold opacity-80">
                  {p.label}
                </div>
              </button>
            );
          })}
        </div>
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

function Radio({ selected }: { selected: boolean }) {
  return (
    <div
      className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] text-white ${
        selected
          ? "border-[#a695d8] bg-[#a695d8]"
          : "border-[#3a324a4d] bg-transparent"
      }`}
    >
      {selected ? "✓" : ""}
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
