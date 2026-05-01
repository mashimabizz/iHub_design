"use client";

import { useState, type MouseEvent } from "react";

type Ripple = { x: number; y: number; id: number; size: number };

/**
 * クリック位置から波紋を広げる hook（Material Design 風）
 *
 * 使い方:
 *   const ref = useRef<HTMLButtonElement>(null);
 *   const { trigger, renderRipples } = useRipple({ color: "bg-white/45" });
 *
 *   <button
 *     ref={ref}
 *     onMouseDown={(e) => trigger(e, ref.current)}
 *     className="relative overflow-hidden ..."
 *   >
 *     <span className="relative z-10">...</span>
 *     {renderRipples()}
 *   </button>
 *
 * @param color 波紋の色（Tailwind class）。primary: "bg-white/45"、secondary: "bg-purple-300/35"
 */
export function useRipple(opts?: { color?: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const color = opts?.color ?? "bg-white/45";

  function trigger(
    e: MouseEvent<HTMLElement>,
    targetEl: HTMLElement | null,
  ) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // ボタンの最大寸法を基準にした円
    const size = Math.max(rect.width, rect.height);
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { x, y, id, size }]);
    setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id));
    }, 600);
  }

  const renderRipples = () =>
    ripples.map((r) => (
      <span
        key={r.id}
        className={`ripple-anim pointer-events-none absolute rounded-full ${color}`}
        style={{
          left: r.x,
          top: r.y,
          width: r.size * 2.5,
          height: r.size * 2.5,
          marginLeft: -(r.size * 1.25),
          marginTop: -(r.size * 1.25),
        }}
      />
    ));

  return { trigger, renderRipples };
}
