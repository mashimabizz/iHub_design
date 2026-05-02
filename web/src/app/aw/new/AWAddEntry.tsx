"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * モックアップ aw-edit.jsx AWAddEntry (1078-1237) 準拠。
 *
 * - 暗転バックドロップ（タップでキャンセル）
 * - ボトムシート（角丸 22px・影 0 -10px 40px）
 * - drag handle + タイトル + 2 つの選択カード + キャンセル
 *
 * カラートークン:
 *   ink #3a324a / mute rgba(58,50,74,0.55) / faint rgba(58,50,74,0.3)
 *   subtle rgba(58,50,74,0.06) / bg #fbf9fc / lavender #a695d8 / sky #a8d4e6
 */
export function AWAddEntry() {
  const router = useRouter();

  // 子ページを先読み（タップ即遷移）
  useEffect(() => {
    router.prefetch("/aw/new/location");
    router.prefetch("/aw/new/event");
    router.prefetch("/aw");
  }, [router]);

  return (
    <main className="relative flex flex-1 flex-col bg-[#fbf9fc]">
      {/* 暗転バックドロップ — タップでキャンセル */}
      <Link
        href="/aw"
        aria-label="閉じる"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(58,50,74,0.18),rgba(58,50,74,0.32))]"
      />

      {/* ボトムシート */}
      <div className="relative mt-auto rounded-t-[22px] bg-white px-[18px] pb-[30px] pt-2.5 shadow-[0_-10px_40px_rgba(58,50,74,0.18)]">
        {/* drag handle */}
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-sm bg-[#3a324a4d]" />

        {/* title block */}
        <div className="mb-1 px-0.5">
          <div className="text-[18px] font-extrabold tracking-[0.3px] text-[#3a324a]">
            AW を追加
          </div>
          <div className="mt-[3px] text-[11.5px] leading-[1.5] text-[#3a324a8c]">
            合流可能枠 ={" "}
            <b className="text-[#3a324a]">場所 × 時間 × 半径</b>。
            イベントは任意のタグ。
          </div>
        </div>

        {/* Primary: Location-led — おすすめ */}
        <Link
          href="/aw/new/location"
          className="relative mt-3.5 flex w-full items-start gap-3 rounded-2xl border-[1.5px] border-[#a695d8] bg-[linear-gradient(120deg,#a695d81c,#a8d4e624)] px-4 pb-3.5 pt-4 text-left transition-transform active:scale-[0.99]"
        >
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#a695d8] px-[7px] py-0.5 text-[9px] font-extrabold tracking-[0.5px] text-white">
            おすすめ
          </span>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] shadow-[0_6px_14px_#a695d855]">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <path
                d="M11 2.5c-3.6 0-6 2.5-6 6 0 4 6 11 6 11s6-7 6-11c0-3.5-2.4-6-6-6z"
                stroke="#fff"
                strokeWidth="1.6"
                fill="none"
              />
              <circle
                cx="11"
                cy="9"
                r="2.2"
                stroke="#fff"
                strokeWidth="1.6"
                fill="none"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-extrabold tracking-[0.2px] text-[#3a324a]">
              📍 場所から作る
            </div>
            <div className="mt-[3px] text-[11.5px] leading-[1.5] text-[#3a324a8c]">
              地図でピン → 半径ダイヤル → 時間。
              <br />
              <span className="font-semibold text-[#3a324a]">
                「明日 渋谷で1時間」「会場周辺」
              </span>
              どちらでも対応。イベント紐付けは任意。
            </div>
            {/* example chips */}
            <div className="mt-2 flex flex-wrap gap-1">
              {["イベントなしOK", "フレキシブル", "半径200m〜2km"].map((l) => (
                <span
                  key={l}
                  className="rounded-full border-[0.5px] border-[#a695d833] bg-white px-2 py-0.5 text-[9.5px] font-semibold text-[#3a324a]"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </Link>

        {/* Secondary: Event-led — ショートカット */}
        <Link
          href="/aw/new/event"
          className="relative mt-2 flex w-full items-start gap-3 rounded-2xl border-[0.5px] border-[#3a324a14] bg-white px-4 py-3.5 text-left transition-transform active:scale-[0.99]"
        >
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#3a324a14] px-[7px] py-0.5 text-[9px] font-extrabold tracking-[0.5px] text-[#3a324a8c]">
            ショートカット
          </span>
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#3a324a14]">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <rect
                x="4"
                y="6"
                width="14"
                height="13"
                rx="2"
                stroke="#3a324a"
                strokeWidth="1.4"
                fill="none"
              />
              <path
                d="M4 10h14M8 3v4M14 3v4"
                stroke="#3a324a"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-extrabold tracking-[0.2px] text-[#3a324a]">
              🎤 イベントから埋める
            </div>
            <div className="mt-[3px] text-[11.5px] leading-[1.5] text-[#3a324a8c]">
              ライブ・ファンミ・ポップアップ等を選ぶと
              <span className="font-semibold text-[#3a324a]">
                {" "}会場座標と開演±30分が自動入力
              </span>
              。1タップで保存できる。
            </div>
            {/* upcoming preview */}
            <div className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-[#fbf9fc] px-2.5 py-[7px] text-[10.5px] tabular-nums text-[#3a324a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f3c5d4]" />
              <b>4/27 今夜</b>
              <span className="text-[#3a324a8c]">
                LUMENA WORLD TOUR DAY 2 — 横浜アリーナ
              </span>
            </div>
          </div>
        </Link>

        {/* Cancel */}
        <Link
          href="/aw"
          className="mt-3 block w-full rounded-xl py-3 text-center text-[13px] font-semibold text-[#3a324a8c]"
        >
          キャンセル
        </Link>
      </div>
    </main>
  );
}
