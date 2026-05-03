"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";

/**
 * Auth / Onboarding 共通ヘッダー（モックアップ AOHeaderBack 準拠）
 *
 * - 上部固定
 * - 戻るアイコン（chevron-left）
 * - タイトル + サブタイトル（任意）
 * - 進捗表示（任意、右側）
 * - 半透明 + 背景ぼかし
 *
 * iter99: 戻るボタン挙動を「実際に来たページに戻る」に変更
 *   - 履歴があれば router.back() で 1 個前に戻る（ブラウザ標準と同じ）
 *   - 履歴が無い（外部リンクや直接 URL 入力で開いた）場合のみ
 *     backHref で指定された fallback URL に飛ぶ
 *   - SSR 時は backHref を href として残しておくため、
 *     <Link> としての SEO・middle-click でタブを開く挙動も維持
 */
export function HeaderBack({
  title,
  sub,
  progress,
  backHref = "/",
}: {
  title: string;
  sub?: string;
  progress?: string;
  backHref?: string;
}) {
  const router = useRouter();

  function handleBackClick(e: ReactMouseEvent<HTMLAnchorElement>) {
    // モディファイアキー押下時は <Link> のデフォルト挙動に任せる
    // （Cmd/Ctrl+クリックで新規タブで backHref を開くなど）
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof window === "undefined") return;
    // 履歴があれば本当に「前のページ」に戻る
    if (window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
    // 履歴が無いときは <Link href={backHref}> の通常遷移にフォールバック
  }

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/50 bg-white/90 px-5 pb-3.5 pt-12 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <Link
          href={backHref}
          onClick={handleBackClick}
          className="flex-shrink-0"
          aria-label="戻る"
        >
          <svg width="10" height="16" viewBox="0 0 10 16">
            <path
              d="M8 1L2 8l6 7"
              stroke="#1a1a26"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="flex-1 text-left">
          <div className="text-[15px] font-bold text-gray-900">{title}</div>
          {sub && (
            <div className="mt-0.5 text-[11px] text-gray-500">{sub}</div>
          )}
        </div>
        {progress && (
          <div className="text-[11px] tabular-nums text-gray-500">
            {progress}
          </div>
        )}
      </div>
    </header>
  );
}
