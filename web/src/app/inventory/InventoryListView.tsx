"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteInventoryItem } from "./actions";

export type InventoryItem = {
  id: string;
  kind: "for_trade" | "wanted";
  title: string;
  description: string | null;
  condition: string | null;
  quantity: number;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string;
  status: string;
  created_at: string;
};

const CONDITION_LABELS: Record<string, string> = {
  sealed: "未開封",
  mint: "極美",
  good: "良好",
  fair: "普通",
  poor: "難あり",
};

export function InventoryListView({
  items,
}: {
  items: InventoryItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"for_trade" | "wanted">("for_trade");

  const filtered = items.filter((it) => it.kind === tab);
  const counts = {
    for_trade: items.filter((it) => it.kind === "for_trade").length,
    wanted: items.filter((it) => it.kind === "wanted").length,
  };

  async function handleDelete(id: string) {
    if (!confirm("削除してよろしいですか？")) return;
    const result = await deleteInventoryItem(id);
    if (result?.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-2 pt-12">
          <div>
            <h1 className="text-[26px] font-bold leading-tight text-gray-900">
              在庫
            </h1>
            <p className="mt-0.5 text-[11px] text-gray-500">
              譲るグッズ・求めるグッズを管理
            </p>
          </div>
          <Link
            href="/inventory/new"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3.5 text-xs font-bold text-white shadow-[0_2px_8px_rgba(166,149,216,0.33)] transition-all duration-150 active:scale-[0.97]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M7 2v10M2 7h10" />
            </svg>
            追加
          </Link>
        </div>

        {/* タブ */}
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-2 [&::-webkit-scrollbar]:hidden">
          {(["for_trade", "wanted"] as const).map((t) => {
            const active = tab === t;
            const label = t === "for_trade" ? "譲（出す）" : "求める（受）";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.3)]"
                    : "border border-[#3a324a14] bg-white text-gray-900"
                }`}
              >
                {label}
                <span
                  className={`tabular-nums ${
                    active ? "text-white/85" : "text-gray-500"
                  }`}
                >
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>

        {/* リスト */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pb-4 pt-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
              {tab === "for_trade"
                ? "譲るグッズがまだありません"
                : "求めるグッズがまだありません"}
              <br />
              <Link
                href="/inventory/new"
                className="mt-2 inline-block font-bold text-[#a695d8]"
              >
                + 新規登録
              </Link>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#3a324a14] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900">
                      {item.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{item.goodsTypeName}</span>
                      <span className="text-gray-300">·</span>
                      <span>
                        {item.groupName}
                        {item.characterName ? ` / ${item.characterName}` : ""}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="flex-shrink-0 text-[10px] text-gray-400 hover:text-red-500"
                  >
                    削除
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  {item.condition && (
                    <span className="rounded-full bg-[#a8d4e622] px-2 py-0.5 font-semibold text-[#5a9bbe]">
                      {CONDITION_LABELS[item.condition] ?? item.condition}
                    </span>
                  )}
                  <span className="text-gray-500">数量 {item.quantity}</span>
                </div>

                {item.description && (
                  <div className="mt-2 line-clamp-2 text-[12px] text-gray-700">
                    {item.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
