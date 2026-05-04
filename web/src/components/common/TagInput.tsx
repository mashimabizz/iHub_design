"use client";

/**
 * iter106: タグ入力コンポーネント
 *
 * - 入力中の文字列で typeahead 検索（debounce 200ms、search_tags RPC 経由）
 * - サジェスト候補に「使用人数」バッジを表示（みんな同じタグを使うインセンティブ）
 * - Enter or サジェストタップで「選択タグ」に追加
 *   - 既存タグ：id=実 id
 *   - 新規入力：id=null（保存時に作成される）
 * - 選択済タグはチップ表示、× で削除
 *
 * 使い方：
 *   <TagInput value={tags} onChange={setTags} max={5} />
 *
 * Tags 構造：
 *   { id: string | null; label: string }[]
 *   - id=null：未保存（フォーム送信時に attach_inventory_tag で作成）
 *   - id=string：既存タグ（attach は idempotent）
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { searchTags, type TagSuggestion } from "@/lib/tags";

export type TagInputValue = { id: string | null; label: string };

const MAX_LABEL_LEN = 50;

export function TagInput({
  value,
  onChange,
  max = 5,
  placeholder = "イベント名・シリーズなど（例: LUMENA Debut Album）",
  helperText,
}: {
  value: TagInputValue[];
  onChange: (next: TagInputValue[]) => void;
  /** 最大タグ数 */
  max?: number;
  placeholder?: string;
  helperText?: string;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // draft が変化するたびに debounce で search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!showSuggest) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchTags(draft, 8);
      setSuggestions(results);
      setLoading(false);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, showSuggest]);

  /** 既に選択済の正規化文字列セット（重複防止用、簡易判定） */
  const selectedNormalized = useMemo(
    () => new Set(value.map((v) => v.label.trim().toLowerCase())),
    [value],
  );

  /** 既存タグから選んで追加 */
  function pickSuggestion(s: TagSuggestion) {
    if (value.length >= max) return;
    if (value.some((v) => v.id === s.id)) return; // 同 id は重複追加しない
    if (selectedNormalized.has(s.label.trim().toLowerCase())) return;
    onChange([...value, { id: s.id, label: s.label }]);
    setDraft("");
    setSuggestions([]);
    setShowSuggest(false);
  }

  /** 入力中の draft を新規タグとして追加 */
  function addDraftAsNew() {
    const label = draft.trim();
    if (!label) return;
    if (label.length > MAX_LABEL_LEN) return;
    if (value.length >= max) return;
    if (selectedNormalized.has(label.toLowerCase())) return;
    // サジェストに完全一致があれば pick
    const exact = suggestions.find(
      (s) => s.label.trim().toLowerCase() === label.toLowerCase(),
    );
    if (exact) {
      pickSuggestion(exact);
      return;
    }
    onChange([...value, { id: null, label }]);
    setDraft("");
    setSuggestions([]);
    setShowSuggest(false);
  }

  function removeAt(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="relative">
      {/* 入力欄 + 選択済チップ */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#3a324a14] bg-white px-2.5 py-2">
        {value.map((t, i) => (
          <span
            key={`${t.id ?? "new"}-${i}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-bold ${
              t.id
                ? "border border-[#a695d855] bg-[#a695d814] text-[#a695d8]"
                : "border border-dashed border-[#a695d855] bg-[#a695d80a] text-[#a695d8]"
            }`}
            title={t.id ? "既存タグ" : "新規タグ（保存時に作成）"}
          >
            #{t.label}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`${t.label} を削除`}
              className="text-[12px] leading-none text-[#a695d8]/70 hover:text-[#a695d8]"
            >
              ×
            </button>
          </span>
        ))}

        {value.length < max && (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => {
              // blur 時にサジェスト閉じる（少し遅らせて click を拾う）
              setTimeout(() => setShowSuggest(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraftAsNew();
              } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
                removeAt(value.length - 1);
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            maxLength={MAX_LABEL_LEN}
            className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-[13px] text-[#3a324a] placeholder:text-[#3a324a4d] focus:outline-none"
          />
        )}
      </div>

      {/* helper text */}
      {helperText && (
        <div className="mt-1 px-1 text-[10.5px] text-[#3a324a8c]">
          {helperText}
        </div>
      )}
      <div className="mt-0.5 px-1 text-[10px] text-[#3a324a4d]">
        {value.length}/{max} · Enter で追加、Backspace で末尾削除
      </div>

      {/* サジェストドロップダウン */}
      {showSuggest && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[260px] overflow-y-auto rounded-xl border border-[#3a324a14] bg-white shadow-[0_8px_24px_rgba(58,50,74,0.12)]">
          {loading && (
            <div className="px-3 py-2 text-[11px] text-[#3a324a8c]">
              検索中…
            </div>
          )}
          {!loading && suggestions.length === 0 && draft.trim().length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // blur で閉じないように
              onClick={addDraftAsNew}
              className="block w-full px-3 py-2 text-left text-[12px] text-[#3a324a] active:bg-[#a695d80a]"
            >
              <span className="font-bold text-[#a695d8]">＋ 新しいタグ：</span>
              <span className="ml-1">#{draft.trim()}</span>
              <span className="ml-1 text-[10px] text-[#3a324a8c]">
                （あなたが最初の登録者）
              </span>
            </button>
          )}
          {!loading &&
            suggestions.map((s) => {
              const alreadySelected = value.some((v) => v.id === s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={alreadySelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                    alreadySelected
                      ? "bg-[#3a324a06] opacity-50"
                      : "hover:bg-[#a695d80a] active:bg-[#a695d814]"
                  }`}
                >
                  <span className="text-[12px] font-bold text-[#3a324a]">
                    #{s.label}
                  </span>
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[#3a324a8c]">
                    {alreadySelected ? (
                      <span className="rounded-full bg-[#3a324a14] px-1.5 py-[1px] font-bold">
                        選択済
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#a695d814] px-1.5 py-[1px] font-bold text-[#a695d8]">
                        {s.userCount}人 使用中
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          {/* 入力中で完全一致が無い場合の「新規追加」ヒント */}
          {!loading &&
            suggestions.length > 0 &&
            draft.trim().length > 0 &&
            !suggestions.some(
              (s) => s.label.trim().toLowerCase() === draft.trim().toLowerCase(),
            ) && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={addDraftAsNew}
                className="block w-full border-t border-[#3a324a08] px-3 py-2 text-left text-[12px] text-[#3a324a] active:bg-[#a695d80a]"
              >
                <span className="font-bold text-[#a695d8]">＋ 新しいタグ：</span>
                <span className="ml-1">#{draft.trim()}</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}
