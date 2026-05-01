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

const baseClass = `
  relative block w-full overflow-hidden rounded-xl
  bg-gradient-to-r from-purple-400 to-pink-300
  px-4 py-3.5 text-center text-base font-bold text-white shadow-md
  transition-all duration-150
  hover:from-purple-500 hover:to-pink-400
  active:scale-[0.97]
  disabled:from-purple-500 disabled:to-purple-600
  disabled:cursor-not-allowed disabled:opacity-90
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
