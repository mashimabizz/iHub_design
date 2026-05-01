"use client";

import { useEffect, useState } from "react";

/**
 * 切り抜き完了のトースト通知（左下）
 * - props.signal が変わるたびに表示 → 2秒で fade out
 * - thumbnail を渡すとサムネイル付きで表示
 */
export function CropToast({
  signal,
  message = "切り抜きました",
  thumbnail,
}: {
  signal: number; // 表示トリガー（タイムスタンプ等）
  message?: string;
  thumbnail?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (signal === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [signal]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-[160px] left-4 z-50 animate-fadeIn">
      <div className="flex items-center gap-2.5 rounded-2xl bg-gray-900/95 px-3 py-2 text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        {thumbnail && (
          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-white/20">
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[12px] font-bold">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#a695d8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 7l3 3 7-7" />
          </svg>
          {message}
        </div>
      </div>
    </div>
  );
}
