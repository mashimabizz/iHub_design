import Link from "next/link";

/**
 * Auth / Onboarding 共通ヘッダー（モックアップ AOHeaderBack 準拠）
 *
 * - 上部固定
 * - 戻るアイコン（chevron-left）
 * - タイトル + サブタイトル（任意）
 * - 進捗表示（任意、右側）
 * - 半透明 + 背景ぼかし
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
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200/50 bg-white/90 px-5 pb-3.5 pt-12 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <Link href={backHref} className="flex-shrink-0" aria-label="戻る">
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
