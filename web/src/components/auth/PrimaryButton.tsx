"use client";

import Link from "next/link";
import {
  useRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Spinner } from "./Spinner";
import { useRipple } from "./useRipple";

/**
 * モックアップ AOPrimaryButton 完全準拠：
 * - linear-gradient(135deg, #a695d8, #a8d4e6, #f3c5d4) = lavender→sky→pink
 *   ※ bg-gradient-to-br は要素の対角線方向で角度がズレるので arbitrary で固定
 * - 影：rgba(166,149,216,0.33) で柔らかいパープル
 * - rounded-2xl（borderRadius 14 相当）
 * - hover で軽く明るく（brightness-105）
 * - active で 0.97 縮小
 */
const baseClass = `
  relative block w-full overflow-hidden rounded-2xl
  bg-[linear-gradient(135deg,#a695d8,#a8d4e6,#f3c5d4)]
  px-4 py-3.5 text-center text-base font-bold text-white
  shadow-[0_8px_22px_rgba(166,149,216,0.33)]
  transition-all duration-150
  hover:brightness-105
  active:scale-[0.97]
  disabled:cursor-not-allowed disabled:opacity-50
`;

/**
 * モックアップ AOSecondaryButton 完全準拠：
 * - 白背景
 * - 1.5px の紫透明枠（#a695d8 33%透明 = #a695d859）
 *   ※ 確実な arbitrary value で固定
 * - 黒テキスト（ink 色）
 * - rounded-2xl
 * - hover でうっすら紫に
 * - active で 0.97 縮小
 *
 * 用途: Google ログイン、再送信ボタン、サブアクション等
 */
export const secondaryBaseClass = `
  relative flex w-full items-center justify-center gap-2.5 overflow-hidden
  rounded-2xl border-[1.5px] border-solid border-[#a695d855] bg-white
  px-4 py-3 text-sm font-bold text-gray-900
  transition-all duration-150
  hover:bg-[#a695d80d] hover:border-[#a695d899]
  active:scale-[0.97]
  disabled:cursor-not-allowed disabled:opacity-50
`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingLabel?: string;
  children: ReactNode;
};

/**
 * iHub プライマリボタン
 * - A: active:scale-[0.97] でタクタイル感
 * - B: pending 中スピナー
 * - F: pending 中の色シフト
 * - Ripple: クリック位置から波紋（Material Design 風）
 */
export function PrimaryButton({
  pending = false,
  pendingLabel,
  children,
  disabled,
  className = "",
  onMouseDown,
  ...rest
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { trigger, renderRipples } = useRipple();

  function handleMouseDown(e: MouseEvent<HTMLButtonElement>) {
    if (!disabled && !pending) {
      trigger(e, ref.current);
    }
    onMouseDown?.(e);
  }

  return (
    <button
      {...rest}
      ref={ref}
      disabled={disabled || pending}
      onMouseDown={handleMouseDown}
      className={`${baseClass} ${className}`}
    >
      <span className="relative z-10">
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size={20} />
            <span>{pendingLabel ?? children}</span>
          </span>
        ) : (
          children
        )}
      </span>
      {renderRipples()}
    </button>
  );
}

type LinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/**
 * iHub プライマリリンク（ボタン見た目の Link）
 * - active:scale-[0.97] + Ripple
 */
export function PrimaryLinkButton({
  href,
  children,
  className = "",
}: LinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { trigger, renderRipples } = useRipple();

  return (
    <Link
      href={href}
      ref={ref}
      onMouseDown={(e) => trigger(e, ref.current)}
      className={`${baseClass} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {renderRipples()}
    </Link>
  );
}
