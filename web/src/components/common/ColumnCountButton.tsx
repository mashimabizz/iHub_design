"use client";

export type ColumnCount = 3 | 4 | 5;

const NEXT_COLUMN_COUNT: Record<ColumnCount, ColumnCount> = {
  3: 4,
  4: 5,
  5: 3,
};

export function ColumnCountButton({
  value,
  onChange,
}: {
  value: ColumnCount;
  onChange: (next: ColumnCount) => void;
}) {
  const next = NEXT_COLUMN_COUNT[value];
  return (
    <button
      type="button"
      aria-label={`${value}列表示。押すと${next}列に変更`}
      title={`${value}列表示`}
      onClick={() => onChange(next)}
      className="relative flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#a695d838] bg-white text-[#3a324a] shadow-sm transition-all active:scale-[0.96]"
    >
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <rect x="2" y="2" width="3.2" height="3.2" rx="0.8" />
        <rect x="5.9" y="2" width="3.2" height="3.2" rx="0.8" />
        <rect x="9.8" y="2" width="3.2" height="3.2" rx="0.8" />
        <rect x="2" y="6.1" width="3.2" height="3.2" rx="0.8" />
        <rect x="5.9" y="6.1" width="3.2" height="3.2" rx="0.8" />
        <rect x="9.8" y="6.1" width="3.2" height="3.2" rx="0.8" />
        <rect x="2" y="10.2" width="3.2" height="3.2" rx="0.8" />
        <rect x="5.9" y="10.2" width="3.2" height="3.2" rx="0.8" />
        <rect x="9.8" y="10.2" width="3.2" height="3.2" rx="0.8" />
      </svg>
      <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#a695d8] px-[3px] text-[8.5px] font-extrabold leading-none text-white">
        {value}
      </span>
    </button>
  );
}
