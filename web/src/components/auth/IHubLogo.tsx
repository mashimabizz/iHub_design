/**
 * iHub ロゴ（モックアップ AOLogo 準拠）
 * - 紫→水色→ピンク のグラデ円 + 星アイコン
 * - 影あり
 */
export function IHubLogo({ size = 64 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shadow-lg shadow-purple-200/60"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #a695d8, #a8d4e6, #f3c5d4)",
      }}
    >
      <svg
        width={size * 0.45}
        height={size * 0.45}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 3l2.5 5.5L20 10l-4.5 3.8L17 20l-5-3-5 3 1.5-6.2L4 10l5.5-1.5z"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
