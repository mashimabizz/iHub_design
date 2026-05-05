import Link from "next/link";

export function FloatingAddButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="pointer-events-none fixed bottom-[96px] left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 justify-end px-5">
      <Link
        href={href}
        aria-label={label}
        title={label}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_10px_24px_rgba(166,149,216,0.42)] transition-all active:scale-[0.94]"
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M11 3.5v15M3.5 11h15" />
        </svg>
      </Link>
    </div>
  );
}
