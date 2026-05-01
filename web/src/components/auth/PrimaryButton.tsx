"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";

const baseClass = `
  relative block w-full rounded-xl
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
 * iHub プライマリボタン（モックアップ AOPrimaryButton 準拠）
 *
 * - 紫→ピンクのグラデ
 * - クリック時 0.97 縮小（A: タクタイル感）
 * - pending 中: スピナー表示 + 色濃く（B + F）
 */
export function PrimaryButton({
  pending = false,
  pendingLabel,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      className={`${baseClass} ${className}`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner size={20} />
          <span>{pendingLabel ?? children}</span>
        </span>
      ) : (
        children
      )}
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
 * - active:scale-[0.97] でタップ感
 * - サーバー処理がないのでスピナーは不要
 */
export function PrimaryLinkButton({
  href,
  children,
  className = "",
}: LinkProps) {
  return (
    <Link href={href} className={`${baseClass} ${className}`}>
      {children}
    </Link>
  );
}
