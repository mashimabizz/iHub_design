/**
 * iter100: 共通 Avatar コンポーネント
 *
 * - avatar_url が登録されていれば実画像を表示（object-cover）
 * - 未登録なら displayName / handle のイニシャル + ブランドグラデの fallback
 * - bg / size / rounded などはバリエーションで用途を吸収
 *
 * 用途：
 * - 自分のプロフ hero（size 56, rounded-2xl）
 * - パートナープロフ hero（size 56, rounded-2xl）
 * - チャットヘッダー（size 32, rounded-full）
 * - 取引リストカード（size 36, rounded-full）
 * - 打診詳細・通知カードなど
 */
type AvatarVariant = "rounded" | "circle" | "square";

export function Avatar({
  url,
  fallbackName,
  size,
  variant = "rounded",
  className = "",
}: {
  /** Storage の publicUrl。null/undefined ならイニシャル fallback */
  url: string | null | undefined;
  /** イニシャル抽出用：displayName を優先、無ければ handle */
  fallbackName: string;
  /** 表示サイズ（px） */
  size: number;
  /** 形状 */
  variant?: AvatarVariant;
  className?: string;
}) {
  const initial = (fallbackName || "?").charAt(0).toUpperCase();
  const radiusCls =
    variant === "circle"
      ? "rounded-full"
      : variant === "square"
        ? "rounded-md"
        : "rounded-2xl";
  // フォントサイズはサイズに比例（経験則）：ほぼ size * 0.42
  const fontSize = Math.max(11, Math.round(size * 0.42));

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden ${radiusCls} ${className}`}
      style={{
        width: size,
        height: size,
        background: url
          ? "rgba(255,255,255,0.25)" // 画像読み込み中の背景
          : "linear-gradient(135deg, #a695d8, #a8d4e6)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={fallbackName}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="font-extrabold leading-none text-white"
          style={{
            fontSize,
            fontFamily: '"Inter Tight", sans-serif',
            letterSpacing: "0.2px",
          }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
