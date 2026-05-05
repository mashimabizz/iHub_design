/**
 * ItemCard（モックアップ b-inventory.jsx の ItemCard 準拠）
 *
 * - aspect-ratio 3/4 の縞模様カード
 * - メンバー名プレート（左上）+ carrying ドット（右上）
 * - メンバーのイニシャル（中央・大）
 * - 下部ストリップ：種別 + シリーズ + 数量
 * - 親 (ItemCardWrapper) でクリック → 下から出るアクションシート
 * - 右上の carrying ドットは stopPropagation で個別動作
 */

export type ItemCardData = {
  id: string;
  memberName: string; // 「スア」など。null の場合はグループ名
  goodsType: string; // 「トレカ」「生写真」など
  series: string | null; // 廃止予定（互換のため残す）
  qty: number;
  hue: number; // 0〜360
  carrying: boolean;
  photoUrl?: string | null; // Supabase Storage の公開 URL（存在すればイニシャル表示の代わりに写真表示）
  isPending?: boolean; // メンバーが審査中（character_request_id 経由）
};

export function ItemCard({
  item,
}: {
  item: ItemCardData;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${item.hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${item.hue}, 30%, 30%, 0.4)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className="relative block overflow-hidden rounded-xl border border-[#3a324a14] shadow-[0_2px_6px_rgba(58,50,74,0.08)]"
      style={{
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      {/* 写真（存在時はイニシャルの代わりにフルブリードで表示） */}
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={`${item.memberName} ${item.goodsType}`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* メンバー名プレート */}
      <div className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
        <div
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {item.memberName}
        </div>
        {item.isPending && (
          <div className="rounded-md bg-[#a695d8] px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.4px] text-white">
            審査中
          </div>
        )}
      </div>

      {/* carrying トグルは持参グッズ機能の廃止により削除（iter65.6） */}

      {/* メンバーのイニシャル（中央・大）— 写真がない時のみ */}
      {!hasPhoto && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {item.memberName[0]}
        </div>
      )}

      {/* 下部ストリップ */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-1.5 pb-1.5 pt-1"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-bold leading-tight text-gray-900">
            {item.goodsType}
          </div>
          {item.series && (
            <div className="mt-0.5 truncate text-[8.5px] leading-tight text-gray-500">
              {item.series}
            </div>
          )}
        </div>
        {item.qty > 1 && (
          <div className="flex-shrink-0 rounded-md bg-[#a695d8] px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-white">
            ×{item.qty}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AddCard：新規追加用の点線枠カード
 */
export function AddCard({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#a695d888] bg-white text-[#a695d8] transition-all duration-150 active:scale-[0.97]"
      style={{ aspectRatio: "3 / 4" }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        stroke="#a695d8"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M14 4v20M4 14h20" />
      </svg>
      <span className="text-[10px] font-bold tracking-wide">追加</span>
    </a>
  );
}
