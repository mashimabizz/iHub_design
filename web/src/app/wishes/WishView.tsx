"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteWishItem } from "./actions";

export type WishItem = {
  id: string;
  title: string;
  note: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string;
  priority: "top" | "second" | "flexible" | null;
  flexLevel: "exact" | "character_any" | "series_any" | null;
  exchangeType: "same_kind" | "cross_kind" | "any";
  quantity: number;
  createdAt: string; // ISO
};

// iter67.3：exchangeType chip を再表示（iter65.6 で廃止 → 再復活）
const EXCHANGE_LABEL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種のみ",
  cross_kind: "異種のみ",
  any: "同異種OK",
};

export function WishView({ items }: { items: WishItem[] }) {
  const router = useRouter();
  const filtered = items;

  async function handleDelete(id: string) {
    if (!confirm("このウィッシュを削除しますか？")) return;
    const result = await deleteWishItem(id);
    if (result?.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  function daysSince(iso: string): number {
    const diffMs = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px]">
      {/* ヘッダー */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-3 pt-12">
        <div className="mx-auto flex max-w-md items-start justify-between">
          <div>
            <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
              ウィッシュ
            </h1>
            <p className="mt-0.5 text-[11px] text-gray-500">
              探したいグッズを管理 ·{" "}
              <span className="tabular-nums">{items.length}</span>件登録 ·{" "}
              <Link href="/listings" className="font-bold text-[#a695d8]">
                個別募集 →
              </Link>
            </p>
          </div>
          <Link
            href="/wishes/new"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#a695d8] px-3.5 text-[11px] font-bold text-white transition-all duration-150 active:scale-[0.97]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 11 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5.5 1v9M1 5.5h9" />
            </svg>
            追加
          </Link>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-[18px] pt-3.5">
        {/* マッチサマリーバナー（マッチ数は将来 iter63 で実データ） */}
        <div className="mb-3.5 flex items-center gap-3 rounded-2xl border border-[#a695d830] bg-[linear-gradient(135deg,#a695d81a,#a8d4e61a)] px-3.5 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-white">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="#a695d8"
              strokeWidth="1.6"
              strokeLinejoin="round"
            >
              <path d="M10 17l-1-1c-3.5-3-6-5-6-8a3.5 3.5 0 016-2.5A3.5 3.5 0 0117 8c0 3-2.5 5-6 8l-1 1z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-gray-900">
              マッチ <span className="text-[#a695d8]">— 件</span> 検出中
            </div>
            <div className="text-[10.5px] text-gray-500">
              マッチング機能は次の iter で実装予定
            </div>
          </div>
          <Link
            href="/"
            className="flex-shrink-0 rounded-[10px] bg-[#a695d8] px-3 py-1.5 text-[11px] font-bold text-white transition-all active:scale-[0.97]"
          >
            ホームで見る
          </Link>
        </div>

        {/* 優先度フィルタは iter65.7 で廃止（priority 区分がなくなったため） */}

        {/* Wish カード一覧 */}
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-xs text-gray-500">
              {items.length === 0 ? (
                <>
                  まだウィッシュがありません
                  <br />
                  <Link
                    href="/wishes/new"
                    className="mt-2 inline-block font-bold text-[#a695d8]"
                  >
                    + 探したいグッズを登録
                  </Link>
                </>
              ) : (
                <>該当するウィッシュがありません</>
              )}
            </div>
          ) : (
            filtered.map((w) => (
              <div
                key={w.id}
                className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white"
              >
                <div className="flex gap-3 p-3.5">
                  {/* サムネ */}
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#3a324a14] bg-[linear-gradient(135deg,#a695d833,#a8d4e633)]">
                    <span className="text-[11px] font-extrabold text-[#a695d8]">
                      IMG
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* タイトル */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-extrabold text-gray-900">
                          {w.title}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-gray-500">
                          {w.goodsTypeName}・{w.groupName ?? ""}
                          {w.characterName ? ` / ${w.characterName}` : ""}
                          {w.quantity > 1 ? ` · ×${w.quantity}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(w.id)}
                        className="flex-shrink-0 text-[10px] text-gray-400 hover:text-red-500"
                      >
                        削除
                      </button>
                    </div>

                    {/* iter67.3: exchangeType chip 復活（priority/flexLevel は iter65 で廃止） */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={`rounded-full border px-2 py-[1px] text-[9.5px] font-bold ${
                          w.exchangeType === "any"
                            ? "border-[#3a324a14] bg-[#3a324a08] text-[#3a324a8c]"
                            : w.exchangeType === "same_kind"
                              ? "border-[#a695d855] bg-[#a695d80f] text-[#a695d8]"
                              : "border-[#f3c5d455] bg-[#f3c5d40f] text-[#3a324a]"
                        }`}
                      >
                        {EXCHANGE_LABEL[w.exchangeType]}
                      </span>
                    </div>

                    {/* 探し中ステータス（マッチ数は将来実データ） */}
                    <div className="mt-2 rounded-lg bg-[#3a324a08] px-2.5 py-1.5 text-[10.5px] leading-snug">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                        <span className="font-extrabold text-gray-500">
                          探し中 · {daysSince(w.createdAt)} 日前から
                        </span>
                      </div>
                    </div>

                    {/* メモ */}
                    {w.note && (
                      <div className="mt-1.5 italic text-[10.5px] leading-snug text-gray-500">
                        ”{w.note}”
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
