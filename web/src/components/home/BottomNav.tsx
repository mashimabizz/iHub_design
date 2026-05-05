"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ボトムナビ（モックアップ home-v2.jsx の BottomNavV2 準拠）
 *
 * MVP の主要タブ: ホーム / 取引 / 在庫 / wish / プロフ
 *
 * inline=true の時は fixed コンテナを描画せずリンク行のみ返す
 * （InventoryFooter のように親が一体化フッターを持つ場合に使う）
 */
export function BottomNav({ inline = false }: { inline?: boolean } = {}) {
  const pathname = usePathname();

  // iter65.8: AW タブを削除（現地交換モードはホーム画面で完結）
  // iter67-E: 「取引」タブを追加（中央配置）
  // iter126: WISH と 取引 の位置を入れ替え（wish が 在庫 の隣に来る方が動線として自然）
  const items = [
    { href: "/", label: "ホーム", icon: "home" as const },
    { href: "/inventory", label: "在庫", icon: "inventory" as const },
    { href: "/wishes", label: "wish", icon: "wish" as const },
    { href: "/transactions", label: "取引", icon: "transactions" as const },
    { href: "/profile", label: "プロフ", icon: "profile" as const },
  ];

  const links = items.map((it) => {
    const active =
      it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
    return (
      <Link
        key={it.href}
        href={it.href}
        className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
          active ? "font-bold text-[#a695d8]" : "font-medium text-gray-500"
        }`}
      >
        <NavIcon name={it.icon} active={active} />
        <span>{it.label}</span>
      </Link>
    );
  });

  if (inline) {
    return <>{links}</>;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#3a324a14] bg-white">
      <div className="mx-auto flex max-w-md items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
        {links}
      </div>
    </nav>
  );
}

function NavIcon({
  name,
  active,
}: {
  name: "home" | "inventory" | "transactions" | "wish" | "profile";
  active: boolean;
}) {
  const stroke = active ? "#a695d8" : "#6b6478";
  switch (name) {
    case "transactions":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 双方向矢印（取引のシンボル） */}
          <path d="M7 7h12m-3-3l3 3-3 3" />
          <path d="M17 17H5m3-3l-3 3 3 3" />
        </svg>
      );
    case "home":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V11z" />
        </svg>
      );
    case "inventory":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M3 11h18M9 7V4h6v3" />
        </svg>
      );
    case "wish":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l2.5 5.5L20 9l-4.5 3.8L17 19l-5-3-5 3 1.5-6.2L4 9l5.5-1.5z" />
        </svg>
      );
    case "profile":
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      );
  }
}
