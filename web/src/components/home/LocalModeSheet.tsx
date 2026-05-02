"use client";

import { useEffect, useState, useTransition } from "react";
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
};

export type SimpleItem = {
  id: string;
  title: string;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
};

/**
 * 現地交換モード設定シート（slide-up）
 *
 * - AW 選択（自分の enabled な AW から）
 * - 半径スライダー
 * - 持参グッズ multi-select chip
 * - wish multi-select chip
 * - 一括リセット
 */
export function LocalModeSheet({
  open,
  onClose,
  initial,
  aws,
  carryingItems,
  wishes,
}: {
  open: boolean;
  onClose: () => void;
  initial: LocalModeSettings;
  aws: SimpleAW[];
  carryingItems: SimpleItem[];
  wishes: SimpleItem[];
}) {
  const [awId, setAwId] = useState(initial.awId);
  const [radiusM, setRadiusM] = useState(initial.radiusM);
  const [carryingIds, setCarryingIds] = useState(initial.selectedCarryingIds);
  const [wishIds, setWishIds] = useState(initial.selectedWishIds);
  const [pending, startTransition] = useTransition();
  const [resetting, startReset] = useTransition();

  // open のたびに DB 値で再初期化
  useEffect(() => {
    if (open) {
      setAwId(initial.awId);
      setRadiusM(initial.radiusM);
      setCarryingIds(initial.selectedCarryingIds);
      setWishIds(initial.selectedWishIds);
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

  function toggleCarrying(id: string) {
    setCarryingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleWish(id: string) {
    setWishIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleApply() {
    startTransition(async () => {
      const r = await updateLocalModeSelections({
        awId,
        radiusM,
        selectedCarryingIds: carryingIds,
        selectedWishIds: wishIds,
      });
      if (r?.error) {
        alert(r.error);
        return;
      }
      onClose();
    });
  }

  function handleReset() {
    if (!confirm("持参グッズと wish の選択をすべて解除しますか？")) return;
    startReset(async () => {
      const r = await resetLocalModeSelections();
      if (r?.error) {
        alert(r.error);
        return;
      }
      setCarryingIds([]);
      setWishIds([]);
    });
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

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
              場所 × 時間 × 持参グッズ × wish で時空マッチを絞ります
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || (carryingIds.length === 0 && wishIds.length === 0)}
            className="rounded-full border border-[#3a324a14] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#3a324a8c] disabled:opacity-40"
          >
            {resetting ? "リセット中…" : "選択を全解除"}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-2">
          {/* AW 選択 */}
          <Section title="AW（場所と時間）">
            {aws.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-3 text-center text-[11px] text-gray-500">
                有効な AW がありません
                <br />
                <a
                  href="/aw/new"
                  className="mt-1 inline-block font-bold text-[#a695d8]"
                >
                  AW を追加 →
                </a>
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
                        <div className="mt-0.5 text-[10.5px] tabular-nums text-[#3a324a8c]">
                          {fmtDate(aw.startAt)} 〜 {fmtDate(aw.endAt)}
                        </div>
                      </div>
                      <Radio selected={sel} />
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 半径 */}
          <Section title="マッチ範囲（半径）">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-[#3a324a8c]">
                半径
              </span>
              <span className="text-[18px] font-extrabold tabular-nums text-[#a695d8]">
                {radiusM >= 1000
                  ? `${(radiusM / 1000).toFixed(1)}km`
                  : `${radiusM}m`}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={2000}
              step={100}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="mt-1 block w-full"
              style={{ accentColor: "#a695d8" }}
            />
            <div className="mt-0.5 flex justify-between text-[9.5px] tabular-nums text-[#3a324a8c]">
              <span>200m</span>
              <span>2km</span>
            </div>
          </Section>

          {/* 持参グッズ */}
          <Section
            title="持参するグッズ"
            hint={`${carryingIds.length} / ${carryingItems.length} 選択`}
          >
            {carryingItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-3 text-center text-[11px] text-gray-500">
                登録済みの譲るグッズがありません
                <br />
                <a
                  href="/inventory/new"
                  className="mt-1 inline-block font-bold text-[#a695d8]"
                >
                  グッズを登録 →
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {carryingItems.map((it) => {
                  const sel = carryingIds.includes(it.id);
                  const label =
                    it.characterName ?? it.groupName ?? it.title;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggleCarrying(it.id)}
                      className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${
                        sel
                          ? "bg-[#a695d8] text-white"
                          : "border border-[#3a324a14] bg-white text-gray-700"
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1 text-[10px] font-semibold ${
                          sel ? "text-white/80" : "text-gray-500"
                        }`}
                      >
                        {it.goodsTypeName ?? ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* wish */}
          <Section
            title="求めるグッズ（wish）"
            hint={`${wishIds.length} / ${wishes.length} 選択`}
          >
            {wishes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-3 text-center text-[11px] text-gray-500">
                wish がありません
                <br />
                <a
                  href="/wishes/new"
                  className="mt-1 inline-block font-bold text-[#a695d8]"
                >
                  wish を追加 →
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {wishes.map((w) => {
                  const sel = wishIds.includes(w.id);
                  const label =
                    w.characterName ?? w.groupName ?? w.title;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWish(w.id)}
                      className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${
                        sel
                          ? "bg-[#a695d8] text-white"
                          : "border border-[#3a324a14] bg-white text-gray-700"
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1 text-[10px] font-semibold ${
                          sel ? "text-white/80" : "text-gray-500"
                        }`}
                      >
                        {w.goodsTypeName ?? ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>
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
            disabled={pending}
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
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {title}
        </span>
        {hint && (
          <span className="text-[10px] text-[#3a324a8c]">{hint}</span>
        )}
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
