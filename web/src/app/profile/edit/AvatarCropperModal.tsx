"use client";

/**
 * iter96: アバター画像のクロップ用モーダル
 *
 * 仕様：
 * - 1:1 (square) 固定の crop frame を中央に表示
 * - 元画像はパン（ドラッグ）と拡大率スライダーで位置・サイズを調整可
 * - 「適用」で crop frame の領域を 512x512 px JPG に変換して onApply に返す
 * - 「キャンセル」で onClose
 *
 * UX 補足：
 * - 元画像は最初に「短辺 = frame サイズ」で fit させ、scale=1 から開始
 * - 制約：image は frame を覆っている必要がある（黒帯禁止）
 * - 出力解像度：avatar は 512x512 で十分（chat header / プロフ hero どちらでもくっきり見える）
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const FRAME_PX = 280; // クロップ枠サイズ（px）
const OUTPUT_PX = 512; // 出力サイズ（px）
const MAX_SCALE = 3;
const MIN_SCALE = 1;

export type AvatarCropperModalProps = {
  /** 元画像 URL（File から URL.createObjectURL で生成） */
  sourceUrl: string;
  /** 切り抜き完了 → Blob と dataUrl を返す */
  onApply: (result: { blob: Blob; dataUrl: string }) => void;
  /** キャンセル → 閉じるだけ */
  onClose: () => void;
};

export function AvatarCropperModal({
  sourceUrl,
  onApply,
  onClose,
}: AvatarCropperModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    baseOffX: number;
    baseOffY: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  // 短辺を frame サイズに合わせる初期 scale
  const baseScale = useMemo(() => {
    if (!natural) return 1;
    return FRAME_PX / Math.min(natural.w, natural.h);
  }, [natural]);

  /** 表示時の画像サイズ（px） */
  const displayed = useMemo(() => {
    if (!natural) return { w: 0, h: 0 };
    const total = baseScale * scale;
    return { w: natural.w * total, h: natural.h * total };
  }, [natural, baseScale, scale]);

  /** 画像 LOAD 時：natural サイズ取得 + offset を中央リセット */
  useEffect(() => {
    if (!imgLoaded) return;
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    // 中央配置（短辺合わせ）：image top-left を frame に対して -(displayed - FRAME)/2
    const initBaseScale = FRAME_PX / Math.min(w, h);
    const initDispW = w * initBaseScale; // scale=1 のときのサイズ
    const initDispH = h * initBaseScale;
    setScale(1);
    setOffset({
      x: -(initDispW - FRAME_PX) / 2,
      y: -(initDispH - FRAME_PX) / 2,
    });
  }, [imgLoaded]);

  /** scale 変更時：offset を範囲内にクリップ + 中心保持 */
  useEffect(() => {
    if (!natural) return;
    const total = baseScale * scale;
    const dispW = natural.w * total;
    const dispH = natural.h * total;
    setOffset((prev) => clipOffset(prev, dispW, dispH));
  }, [scale, natural, baseScale]);

  function clipOffset(
    next: { x: number; y: number },
    dispW: number,
    dispH: number,
  ) {
    // 制約：image は frame を覆う必要がある
    // つまり offset.x は -(dispW - FRAME_PX) ≤ x ≤ 0
    const minX = Math.min(0, FRAME_PX - dispW);
    const minY = Math.min(0, FRAME_PX - dispH);
    return {
      x: Math.max(minX, Math.min(0, next.x)),
      y: Math.max(minY, Math.min(0, next.y)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffX: offset.x,
      baseOffY: offset.y,
    });
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || !natural) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const dispW = displayed.w;
    const dispH = displayed.h;
    setOffset(
      clipOffset(
        { x: drag.baseOffX + dx, y: drag.baseOffY + dy },
        dispW,
        dispH,
      ),
    );
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag) {
      try {
        e.currentTarget.releasePointerCapture(drag.pointerId);
      } catch {
        // ignore
      }
    }
    setDrag(null);
  }

  /** 「適用」：crop frame の領域を 512x512 canvas に描画して Blob を返す */
  async function applyCrop() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setBusy(true);
    try {
      const total = baseScale * scale;
      // frame に映っている image のソース座標
      // offset.x = display 位置（画像左上が frame 左上に対してどこにあるか）
      // sourceX (natural) = -offset.x / total
      const srcX = Math.max(0, -offset.x / total);
      const srcY = Math.max(0, -offset.y / total);
      const srcSize = FRAME_PX / total;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_PX;
      canvas.height = OUTPUT_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(false);
        return;
      }
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcSize,
        srcSize,
        0,
        0,
        OUTPUT_PX,
        OUTPUT_PX,
      );

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
      );
      if (!blob) {
        setBusy(false);
        return;
      }
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      onApply({ blob, dataUrl });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-black/85 backdrop-blur-sm">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 pb-3 pt-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="キャンセル"
          className="text-[14px] font-bold text-white/80"
        >
          キャンセル
        </button>
        <div className="text-[14px] font-extrabold text-white">
          切り抜きを調整
        </div>
        <button
          type="button"
          onClick={applyCrop}
          disabled={busy || !imgLoaded}
          className="text-[14px] font-extrabold text-[#a8d4e6] disabled:opacity-40"
        >
          {busy ? "処理中…" : "適用"}
        </button>
      </div>

      {/* クロップエリア（中央寄せ） */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div
          className="relative overflow-hidden rounded-[20px] bg-black/60"
          style={{ width: FRAME_PX, height: FRAME_PX, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={sourceUrl}
            alt="アバター候補"
            onLoad={() => setImgLoaded(true)}
            className="pointer-events-none absolute origin-top-left select-none"
            style={{
              left: offset.x,
              top: offset.y,
              width: displayed.w || "auto",
              height: displayed.h || "auto",
              maxWidth: "none",
            }}
            draggable={false}
            crossOrigin="anonymous"
          />
          {/* circular mask overlay でアバターらしく */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
              borderRadius: "50%",
            }}
          />
          {/* グリッド */}
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" />
        </div>

        {/* スケールスライダー */}
        <div className="mt-6 w-full max-w-[320px]">
          <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold text-white/80">
            <span>拡大</span>
            <span className="tabular-nums">×{scale.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="block w-full accent-[#a8d4e6]"
          />
        </div>

        {/* ヒント */}
        <div className="mt-3 text-center text-[11px] text-white/65">
          画像をドラッグして位置を調整、スライダーで拡大率を変更
        </div>
      </div>
    </div>
  );
}
