/**
 * Onboarding 進捗バー（モックアップ AOProgressDots 準拠）
 * - 高さ 4px / 横幅均等のセル
 * - current 以下のセルは紫、それ以降は薄いグレー
 */
export function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded ${
            i <= current ? "bg-[#a695d8]" : "bg-[#3a324a14]"
          }`}
        />
      ))}
    </div>
  );
}
