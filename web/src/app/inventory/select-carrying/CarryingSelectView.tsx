"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLocalModeSelections } from "@/components/home/actions";

type Item = {
  id: string;
  title: string;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  hue: number;
};

const ALL = "すべて";

export function CarryingSelectView({
  items,
  initialSelected,
  returnTo,
}: {
  items: Item[];
  initialSelected: string[];
  returnTo: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [pushFilter, setPushFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [pending, startTransition] = useTransition();

  const pushOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const it of items) {
      if (it.groupName) set.add(it.groupName);
      if (it.characterName) set.add(it.characterName);
    }
    return Array.from(set);
  }, [items]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const it of items) {
      if (it.goodsTypeName) set.add(it.goodsTypeName);
    }
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (
        pushFilter !== ALL &&
        it.groupName !== pushFilter &&
        it.characterName !== pushFilter
      )
        return false;
      if (typeFilter !== ALL && it.goodsTypeName !== typeFilter) return false;
      return true;
    });
  }, [items, pushFilter, typeFilter]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllVisible() {
    const visible = filtered.map((it) => it.id);
    setSelected((prev) => Array.from(new Set([...prev, ...visible])));
  }

  function clearAll() {
    setSelected([]);
  }

  function handleApply() {
    startTransition(async () => {
      const r = await updateLocalModeSelections({
        selectedCarryingIds: selected,
      });
      if (r?.error) {
        alert(r.error);
        return;
      }
      router.push(returnTo);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
        登録済みの譲るグッズがありません
        <br />
        <a
          href="/inventory/new"
          className="mt-2 inline-block font-bold text-[#a695d8]"
        >
          グッズを登録 →
        </a>
      </div>
    );
  }

  return (
    <>
      {/* フィルタ */}
      <div className="space-y-1.5">
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
      </div>

      {/* 選択操作 */}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="font-bold text-[#a695d8]">
          {selected.length}件選択中
        </span>
        <span className="text-gray-400">/</span>
        <span className="text-gray-500">{filtered.length}件表示</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={selectAllVisible}
          className="rounded-full border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a]"
        >
          全選択
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a8c]"
          >
            解除
          </button>
        )}
      </div>

      {/* グリッド */}
      {filtered.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-[#3a324a14] bg-white p-6 text-center text-[11px] text-gray-500">
          該当するグッズがありません
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {filtered.map((it) => (
            <PanelCard
              key={it.id}
              item={it}
              selected={selected.includes(it.id)}
              onClick={() => toggle(it.id)}
            />
          ))}
        </div>
      )}

      {/* 下部固定 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-[#3a324a14] bg-white/96 px-5 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleApply}
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[13.5px] font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:opacity-60"
        >
          {pending ? "保存中…" : `${selected.length} 件で確定して戻る`}
        </button>
      </div>
    </>
  );
}

function PanelCard({
  item,
  selected,
  onClick,
}: {
  item: Item;
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

      {!hasPhoto && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {memberName[0]}
        </div>
      )}

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
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden">
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
