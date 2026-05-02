"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  resetLocalModeSelections,
  updateLocalModeSelections,
  type LocalModeSettings,
} from "./actions";

export type SimpleAW = {
  id: string;
  venue: string;
  eventName: string | null;
  eventless: boolean;
  startAt: string;
  endAt: string;
  radiusM: number;
};

export type SimpleItem = {
  id: string;
  title: string;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  photoUrl: string | null;
};

/**
 * 現地交換モード設定シート（slide-up）— iter65.6 で大幅簡素化。
 *
 * - AW 選択（半径は AW 自身の値を使う）
 * - 持参グッズ選択は **別画面** (/inventory/select-carrying) で行う
 *   （写真付きで選びたいというユーザー要望）
 * - wish 指定は廃止（指定なしで全 wish が対象）
 * - 一括リセット機能は維持
 */
export function LocalModeSheet({
  open,
  onClose,
  initial,
  aws,
  carryingItems,
}: {
  open: boolean;
  onClose: () => void;
  initial: LocalModeSettings;
  aws: SimpleAW[];
  carryingItems: SimpleItem[];
}) {
  const [awId, setAwId] = useState(initial.awId);
  const [pending, startTransition] = useTransition();
  const [resetting, startReset] = useTransition();

  // open のたびに DB 値で再初期化
  useEffect(() => {
    if (open) {
      setAwId(initial.awId);
    }
  }, [open, initial]);

  // body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleApply() {
    startTransition(async () => {
      const r = await updateLocalModeSelections({
        awId,
      });
      if (r?.error) {
        alert(r.error);
        return;
      }
      onClose();
    });
  }

  function handleReset() {
    if (!confirm("持参グッズの選択をすべて解除しますか？")) return;
    startReset(async () => {
      const r = await resetLocalModeSelections();
      if (r?.error) {
        alert(r.error);
        return;
      }
    });
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  // 選択中の持参グッズ件数
  const selectedCarryingCount = initial.selectedCarryingIds.length;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(58,50,74,0.18),rgba(58,50,74,0.32))] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="flex-1" />

      <div
        className={`relative mx-auto flex w-full max-w-md flex-col rounded-t-[22px] bg-white shadow-[0_-10px_40px_rgba(58,50,74,0.18)] transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          maxHeight: "85vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* drag handle */}
        <div className="mx-auto mt-2.5 mb-2 h-1 w-9 flex-shrink-0 rounded-sm bg-[#3a324a4d]" />

        {/* Header */}
        <div className="flex flex-shrink-0 items-baseline justify-between px-5 pb-2">
          <div>
            <h2 className="text-[17px] font-extrabold tracking-[0.3px] text-gray-900">
              現地交換モード
            </h2>
            <p className="mt-0.5 text-[11px] text-[#3a324a8c]">
              AW（場所×時間×半径）と持参グッズで時空マッチを絞ります
            </p>
          </div>
          {selectedCarryingCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="rounded-full border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a8c] disabled:opacity-40"
            >
              {resetting ? "..." : "選択解除"}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
          {/* AW 選択 */}
          <Section title="AW（場所・時間・半径）">
            {aws.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-4 text-center">
                <div className="text-[12px] font-bold text-gray-900">
                  有効な AW がありません
                </div>
                <Link
                  href="/aw/new?return=local-mode"
                  className="mt-2 inline-block rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-4 py-1.5 text-[11.5px] font-bold text-white shadow-[0_2px_6px_rgba(166,149,216,0.4)]"
                >
                  AW を追加 →
                </Link>
                <p className="mt-2 text-[10.5px] text-gray-500">
                  追加後、自動的にこの画面に戻ってきます
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {aws.map((aw) => {
                  const sel = awId === aw.id;
                  return (
                    <button
                      key={aw.id}
                      type="button"
                      onClick={() => setAwId(aw.id)}
                      className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        sel
                          ? "border-[1.5px] border-[#a695d8] bg-[#a695d810]"
                          : "border-[#3a324a14] bg-white"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {aw.eventless && (
                            <span className="rounded bg-[#3a324a0f] px-1.5 py-0.5 text-[9px] font-bold text-[#3a324a8c]">
                              合流可能枠
                            </span>
                          )}
                          <div className="truncate text-[13px] font-bold text-gray-900">
                            {aw.venue}
                          </div>
                        </div>
                        {!aw.eventless && aw.eventName && (
                          <div className="mt-0.5 truncate text-[11px] text-gray-500">
                            {aw.eventName}
                          </div>
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-[10.5px] tabular-nums text-[#3a324a8c]">
                          <span>
                            {fmtDate(aw.startAt)} 〜 {fmtDate(aw.endAt)}
                          </span>
                          <span className="rounded-full bg-[#a695d80f] px-1.5 py-px text-[#a695d8] font-bold">
                            半径{" "}
                            {aw.radiusM >= 1000
                              ? `${(aw.radiusM / 1000).toFixed(1)}km`
                              : `${aw.radiusM}m`}
                          </span>
                        </div>
                      </div>
                      <Radio selected={sel} />
                    </button>
                  );
                })}
                <Link
                  href="/aw/new?return=local-mode"
                  className="block rounded-xl border border-dashed border-[#a695d888] bg-white px-3 py-2 text-center text-[11.5px] font-bold text-[#a695d8]"
                >
                  + AW を追加
                </Link>
              </div>
            )}
          </Section>

          {/* 持参グッズ — 写真付き選択画面へ */}
          <Section title="持参するグッズ">
            <Link
              href="/inventory/select-carrying?return=local-mode"
              className="flex items-center gap-3 rounded-xl border border-[#3a324a14] bg-white p-3 transition-all active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#a695d80a]">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  stroke="#a695d8"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="5" width="16" height="13" rx="2" />
                  <circle cx="11" cy="11.5" r="3" />
                  <path d="M7 5l1.5-2h5L15 5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-gray-900">
                  グッズを選ぶ
                </div>
                <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
                  {carryingItems.length === 0
                    ? "在庫がありません · 先に登録 →"
                    : `現在 ${selectedCarryingCount} 件選択中 / 全${carryingItems.length}件`}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#3a324a8c"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M5 2l5 5-5 5" />
              </svg>
            </Link>
            <p className="mt-1.5 text-[10.5px] text-gray-500">
              写真付きグッズ一覧で選択 → 自動的にここに戻ります
            </p>
          </Section>

          {/* 注釈 */}
          <div className="rounded-xl bg-[#3a324a0a] p-3 text-[11px] leading-relaxed text-[#3a324a8c]">
            <span className="font-bold text-[#3a324a]">📌 マッチング条件</span>
            <br />
            選択した AW の場所×時間×半径と、持参グッズで絞り込まれます。
            wish 側は自動的に全件対象。
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-shrink-0 items-center gap-2 border-t border-[#3a324a08] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-11 rounded-xl border border-[#3a324a14] bg-white px-4 text-[12.5px] font-bold text-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={pending || !awId}
            className="h-11 flex-1 rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[13.5px] font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] disabled:opacity-60"
          >
            {pending ? "適用中…" : "この設定で表示"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
        {title}
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
