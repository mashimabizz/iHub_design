"use client";

/**
 * iter82: 検索画面（search-filter.jsx の SearchScreen 準拠）
 *
 * - 検索バー（form submit で ?q=... に遷移）
 * - フィルタチップ（active）— フィルタ画面実装は次イテで詳細
 * - 結果カード：avatar + handle + 距離/★/取引/推し + マッチバッジ + 譲タイトル
 * - 履歴 / 人気の検索（履歴は localStorage に簡易保存、人気はサーバ固定）
 */

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type SearchHit = {
  id: string;
  userId: string;
  userHandle: string;
  userDisplayName: string;
  primaryArea: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  title: string;
  photoUrl: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  wishHit: boolean;
};

const RECENT_KEY = "ihub-search-recent-v1";
const RECENT_MAX = 6;

export type SearchFilters = {
  matchMode: "perfect" | "all";
  selectedTypeIds: string[];
  minStars: "0" | "4.0" | "4.5" | "4.8";
  sortMode: "match" | "newest" | "rating";
};

export function SearchView({
  query,
  hits,
  popularKeywords,
  filters,
  goodsTypes,
}: {
  query: string;
  hits: SearchHit[];
  popularKeywords: string[];
  filters: SearchFilters;
  goodsTypes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [recent, setRecent] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // 現在のフィルタを URL クエリ文字列に変換
  function buildSearchUrl(
    nextQ: string,
    nextFilters: SearchFilters,
  ): string {
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextFilters.matchMode === "perfect") params.set("match", "perfect");
    if (nextFilters.selectedTypeIds.length > 0)
      params.set("types", nextFilters.selectedTypeIds.join(","));
    if (nextFilters.minStars !== "0")
      params.set("minStars", nextFilters.minStars);
    if (nextFilters.sortMode !== "match")
      params.set("sort", nextFilters.sortMode);
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  function applyFilters(nextFilters: SearchFilters) {
    router.push(buildSearchUrl(query, nextFilters));
    setFilterOpen(false);
  }

  function resetFilters() {
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
    setFilterOpen(false);
  }

  // アクティブなフィルタ数（バッジ表示用）
  const activeFilterCount =
    (filters.matchMode === "perfect" ? 1 : 0) +
    (filters.selectedTypeIds.length > 0 ? 1 : 0) +
    (filters.minStars !== "0" ? 1 : 0) +
    (filters.sortMode !== "match" ? 1 : 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed))
          setRecent(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  // クエリが変わったら履歴に追加
  useEffect(() => {
    if (!query) return;
    setRecent((prev) => {
      const filtered = prev.filter((q) => q !== query);
      const next = [query, ...filtered].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [query]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const q = draft.trim();
    if (!q) return;
    router.push(buildSearchUrl(q, filters));
  }

  function jumpTo(q: string) {
    setDraft(q);
    router.push(buildSearchUrl(q, filters));
  }

  function clearQuery() {
    setDraft("");
    router.push(buildSearchUrl("", filters));
  }

  return (
    <div className="space-y-3">
      {/* 検索バー */}
      <form onSubmit={submit}>
        <div className="flex items-center gap-2.5 rounded-[12px] border border-[#3a324a14] bg-white px-3.5 py-[11px]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#3a324a8c"
            strokeWidth="1.6"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l4 4" />
          </svg>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="例：スア トレカ / WORLD TOUR"
            className="flex-1 bg-transparent text-[16px] text-[#3a324a] outline-none placeholder:text-[#3a324a4d]"
            enterKeyHint="search"
          />
          {draft && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="クリア"
              className="text-[#3a324a8c]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <line x1="3" y1="3" x2="11" y2="11" />
                <line x1="11" y1="3" x2="3" y2="11" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* iter88: フィルタ chip 行 */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
            activeFilterCount > 0
              ? "border-[#a695d8] bg-[#a695d8] text-white"
              : "border-[#3a324a14] bg-white text-[#3a324a]"
          }`}
        >
          🎚️ フィルタ
          {activeFilterCount > 0 && (
            <span className="ml-0.5 rounded-full bg-white/95 px-1.5 py-[1px] text-[9px] font-extrabold text-[#a695d8]">
              {activeFilterCount}
            </span>
          )}
        </button>
        <FilterQuickChip
          label="完全マッチのみ"
          active={filters.matchMode === "perfect"}
          onClick={() =>
            applyFilters({
              ...filters,
              matchMode: filters.matchMode === "perfect" ? "all" : "perfect",
            })
          }
        />
        <FilterQuickChip
          label="★4.5+"
          active={filters.minStars === "4.5" || filters.minStars === "4.8"}
          onClick={() =>
            applyFilters({
              ...filters,
              minStars: filters.minStars === "0" ? "4.5" : "0",
            })
          }
        />
        <FilterQuickChip
          label={
            filters.sortMode === "newest"
              ? "新着順"
              : filters.sortMode === "rating"
                ? "★順"
                : "マッチ順"
          }
          active={filters.sortMode !== "match"}
          onClick={() =>
            applyFilters({
              ...filters,
              sortMode:
                filters.sortMode === "match"
                  ? "newest"
                  : filters.sortMode === "newest"
                    ? "rating"
                    : "match",
            })
          }
        />
      </div>

      {/* 検索結果 or 履歴・人気 */}
      {query ? (
        <ResultsList hits={hits} query={query} />
      ) : (
        <SuggestionsSection
          recent={recent}
          popular={popularKeywords}
          onJump={jumpTo}
        />
      )}

      {/* iter88: フィルタモーダル */}
      {filterOpen && (
        <FilterModal
          initial={filters}
          goodsTypes={goodsTypes}
          onClose={() => setFilterOpen(false)}
          onApply={applyFilters}
          onReset={resetFilters}
        />
      )}
    </div>
  );
}

/* ─── フィルタ chip ─── */

function FilterQuickChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
        active
          ? "border-[#a695d8] bg-[#a695d8] text-white"
          : "border-[#3a324a14] bg-white text-[#3a324a]"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── フィルタモーダル（モックアップ FilterScreen の主要要素を圧縮） ─── */

function FilterModal({
  initial,
  goodsTypes,
  onClose,
  onApply,
  onReset,
}: {
  initial: SearchFilters;
  goodsTypes: { id: string; name: string }[];
  onClose: () => void;
  onApply: (f: SearchFilters) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(initial);

  function toggleType(id: string) {
    setDraft((d) => ({
      ...d,
      selectedTypeIds: d.selectedTypeIds.includes(id)
        ? d.selectedTypeIds.filter((x) => x !== id)
        : [...d.selectedTypeIds, id],
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="m-auto flex max-h-[92vh] w-[96%] max-w-md flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダ */}
        <div className="flex items-center justify-between border-b border-[#3a324a14] px-4 py-3">
          <div className="text-[14px] font-extrabold text-[#3a324a]">
            🎚️ フィルタ
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-[12px] font-bold text-[#d9826b]"
          >
            リセット
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* マッチ強度 */}
          <FilterSection label="マッチ強度">
            <div className="flex gap-1.5">
              <FMChip
                label="すべて"
                active={draft.matchMode === "all"}
                onClick={() => setDraft((d) => ({ ...d, matchMode: "all" }))}
              />
              <FMChip
                label="完全マッチのみ"
                active={draft.matchMode === "perfect"}
                onClick={() =>
                  setDraft((d) => ({ ...d, matchMode: "perfect" }))
                }
              />
            </div>
          </FilterSection>

          {/* グッズ種別 */}
          {goodsTypes.length > 0 && (
            <FilterSection label="グッズ種別">
              <div className="flex flex-wrap gap-1.5">
                {goodsTypes.map((t) => {
                  const active = draft.selectedTypeIds.includes(t.id);
                  return (
                    <FMChip
                      key={t.id}
                      label={t.name}
                      active={active}
                      onClick={() => toggleType(t.id)}
                    />
                  );
                })}
              </div>
            </FilterSection>
          )}

          {/* ★ しきい値 */}
          <FilterSection label="信頼性 ・ ★しきい値">
            <div className="flex flex-wrap gap-1.5">
              {(["0", "4.0", "4.5", "4.8"] as const).map((v) => {
                const label = v === "0" ? "すべて" : `★${v}+`;
                return (
                  <FMChip
                    key={v}
                    label={label}
                    active={draft.minStars === v}
                    onClick={() => setDraft((d) => ({ ...d, minStars: v }))}
                  />
                );
              })}
            </div>
          </FilterSection>

          {/* 並び替え */}
          <FilterSection label="並び替え">
            <div className="flex flex-wrap gap-1.5">
              <FMChip
                label="マッチ順"
                active={draft.sortMode === "match"}
                onClick={() => setDraft((d) => ({ ...d, sortMode: "match" }))}
              />
              <FMChip
                label="新着順"
                active={draft.sortMode === "newest"}
                onClick={() => setDraft((d) => ({ ...d, sortMode: "newest" }))}
              />
              <FMChip
                label="★順"
                active={draft.sortMode === "rating"}
                onClick={() => setDraft((d) => ({ ...d, sortMode: "rating" }))}
              />
            </div>
          </FilterSection>
        </div>

        {/* フッタ CTA */}
        <div className="flex gap-2 border-t border-[#3a324a14] bg-white/95 px-4 pb-5 pt-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[14px] border border-[#3a324a14] bg-white px-4 py-3 text-[12px] font-bold text-[#3a324a]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-4 py-3 text-[13px] font-bold tracking-[0.3px] text-white shadow-[0_4px_12px_rgba(166,149,216,0.40)]"
          >
            適用する
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
        {label}
      </div>
      {children}
    </div>
  );
}

function FMChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
        active
          ? "border-[#a695d8] bg-[#a695d8] text-white"
          : "border-[#3a324a14] bg-white text-[#3a324a]"
      }`}
    >
      {label}
    </button>
  );
}

/* ─── 検索結果リスト ─── */

function ResultsList({ hits, query }: { hits: SearchHit[]; query: string }) {
  // iter88: page.tsx 側で sortMode に応じて並び順は確定済み
  const sorted = hits;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[12px] text-[#3a324a8c]">
          <b className="text-[14px] text-[#3a324a]">{sorted.length}件</b>{" "}
          ヒット
          {query && (
            <span className="ml-1 text-[10px] text-[#3a324a8c]">
              ・「{query}」
            </span>
          )}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-10 text-center text-[12px] text-[#3a324a8c]">
          該当する出品が見つかりませんでした
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((h) => (
            <HitCard key={h.id} hit={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HitCard({ hit }: { hit: SearchHit }) {
  const memberName =
    hit.characterName ?? hit.groupName ?? hit.title ?? "?";
  const hue =
    Math.abs([...memberName].reduce((s, c) => s + c.charCodeAt(0), 0)) % 360;
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 84%) 0 5px, hsl(${hue}, 28%, 76%) 5px 10px)`;

  return (
    <Link
      href={`/users/${hit.userId}`}
      className="block overflow-hidden rounded-[14px] border border-[#3a324a14] bg-white p-3.5 active:scale-[0.99]"
    >
      {/* user 行 */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d855,#a8d4e655)] text-[12px] font-extrabold text-[#3a324a]">
          {hit.userDisplayName[0] || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[#3a324a]">
            @{hit.userHandle}
          </div>
          <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">
            {hit.primaryArea ?? "—"}
            {hit.ratingAvg !== null && (
              <>
                ・★{hit.ratingAvg.toFixed(1)}
                <span className="ml-0.5 text-[9.5px]">
                  ({hit.ratingCount})
                </span>
              </>
            )}
          </div>
        </div>
        {hit.wishHit ? (
          <span
            className="rounded-full px-2 py-[3px] text-[9px] font-extrabold tracking-[0.3px] text-white"
            style={{
              background: "linear-gradient(135deg, #a695d8, #f3c5d4)",
            }}
          >
            完全マッチ
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500 px-2 py-[3px] text-[9px] font-extrabold tracking-[0.3px] text-white">
            出品中
          </span>
        )}
      </div>

      {/* 譲アイテムプレビュー */}
      <div className="flex items-center gap-2.5 rounded-[10px] bg-[#fbf9fc] px-3 py-2">
        <div
          className="relative flex h-[44px] w-[32px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-white/60 shadow-[0_1px_3px_rgba(58,50,74,0.15)]"
          style={{ background: hit.photoUrl ? "#3a324a" : stripeBg }}
        >
          {hit.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hit.photoUrl}
              alt={hit.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="text-[14px] font-extrabold text-white/95"
              style={{
                textShadow: `0 1px 2px hsla(${hue}, 30%, 30%, 0.5)`,
              }}
            >
              {memberName[0] || "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold text-[#3a324a]">
            譲：{hit.title}
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-[#3a324a8c]">
            {[hit.groupName, hit.characterName, hit.goodsTypeName]
              .filter(Boolean)
              .join(" ・ ")}
          </div>
        </div>
        <span className="text-[12px] text-[#a695d8]">›</span>
      </div>
    </Link>
  );
}

/* ─── 履歴 + 人気の検索 ─── */

function SuggestionsSection({
  recent,
  popular,
  onJump,
}: {
  recent: string[];
  popular: string[];
  onJump: (q: string) => void;
}) {
  return (
    <div className="space-y-3">
      {recent.length > 0 && (
        <div>
          <div className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
            履歴
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onJump(q)}
                className="inline-flex items-center gap-1 rounded-full border border-[#3a324a14] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#3a324a]"
              >
                <span className="text-[10px]">🕐</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          人気の検索
        </div>
        <div className="flex flex-wrap gap-1.5">
          {popular.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onJump(q)}
              className="inline-flex items-center gap-1 rounded-full border border-[#3a324a14] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#3a324a]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
