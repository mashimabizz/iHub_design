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
  /** iter84: 同条件の他ユーザー出品数 */
  matchCount: number;
  /** iter94: メイン画像 URL */
  photoUrl: string | null;
};

// iter67.3 で復活した EXCHANGE_LABEL は iter67.5 で再削除
// （wish レベルの exchange_type は使わない設計に統一）

export function WishView({ items }: { items: WishItem[] }) {
  const router = useRouter();
  const filtered = items;
  // iter84: 全 wish の合計マッチ数
  const totalMatches = items.reduce((s, w) => s + (w.matchCount ?? 0), 0);

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
              マッチ <span className="text-[#a695d8]">{totalMatches} 件</span> 検出中
            </div>
            <div className="text-[10.5px] text-gray-500">
              {items.length === 0
                ? "ウィッシュを登録するとマッチが表示されます"
                : `${items.length} 件のウィッシュ・条件に合う出品を集計中`}
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
            filtered.map((w) => {
              // iter84: マッチ数 5 件以上で HOT、1〜4 はマッチあり
              const hot = w.matchCount >= 5;
              const hasMatch = w.matchCount > 0;
              return (
                <div
                  key={w.id}
                  className={`overflow-hidden rounded-2xl border bg-white ${
                    hot
                      ? "border-[#a695d855] shadow-[0_6px_16px_rgba(166,149,216,0.20)]"
                      : "border-[#3a324a14]"
                  }`}
                >
                  <Link
                    href={`/wishes/${w.id}/edit`}
                    className="block flex gap-3 p-3.5 active:scale-[0.99]"
                  >
                    {/* サムネ（iter94: 画像登録あれば実画像、なければ IMG プレースホルダ） */}
                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[10px] border border-[#3a324a14] bg-[linear-gradient(135deg,#a695d833,#a8d4e633)]">
                      {w.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.photoUrl}
                          alt={w.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-[11px] font-extrabold text-[#a695d8]">
                            IMG
                          </span>
                        </div>
                      )}
                      {hot && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-[#d9826b] px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_2px_4px_rgba(217,130,107,0.35)]">
                          HOT
                        </span>
                      )}
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(w.id);
                          }}
                          className="flex-shrink-0 text-[10px] text-gray-400 hover:text-red-500"
                        >
                          削除
                        </button>
                      </div>

                      {/* 探し中ステータス + マッチ数 */}
                      <div
                        className={`mt-2 rounded-lg px-2.5 py-1.5 text-[10.5px] leading-snug ${
                          hasMatch
                            ? "bg-[#a695d80f]"
                            : "bg-[#3a324a08]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                              hasMatch ? "bg-[#a695d8]" : "bg-gray-400"
                            } ${hasMatch ? "animate-pulse" : ""}`}
                          />
                          <span
                            className={`font-extrabold ${
                              hasMatch ? "text-[#a695d8]" : "text-gray-500"
                            }`}
                          >
                            {hasMatch
                              ? `探し中 · ${daysSince(w.createdAt)}日前から`
                              : `探し中 · まだマッチなし · ${daysSince(w.createdAt)}日前から`}
                          </span>
                        </div>
                        {hasMatch && (
                          <div className="mt-0.5 pl-[10px] text-[#3a324a]">
                            マッチ <b>{w.matchCount}件</b>
                          </div>
                        )}
                      </div>

                      {/* メモ */}
                      {w.note && (
                        <div className="mt-1.5 italic text-[10.5px] leading-snug text-gray-500">
                          ”{w.note}”
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
