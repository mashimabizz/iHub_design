"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type CropResult = {
  sourceUrl: string; // 元写真の URL
  blob: Blob; // 切り抜いた画像
  dataUrl: string; // プレビュー用 dataURL
  width: number;
  height: number;
};

/**
 * ドラッグで矩形選択 → 離したら自動切り抜き
 *
 * - 親から sourceUrl を受け取り、画像を表示
 * - マウス/タッチでドラッグ → 矩形を表示
 * - 離した瞬間に canvas.toBlob() で切り抜き → onCropped(result)
 * - 矩形が小さすぎる（< 20px）場合は無視
 */
export function CroppingCanvas({
  sourceUrl,
  onCropped,
}: {
  sourceUrl: string;
  onCropped: (crop: CropResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // 表示サイズと実画像サイズの比率
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setImgLoaded(false);
  }, [sourceUrl]);

  useEffect(() => {
    if (!imgLoaded) return;
    const img = imgRef.current;
    if (!img) return;
    setScale(img.naturalWidth / img.clientWidth);
  }, [imgLoaded]);

  function getRelative(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getRelative(e);
    setDrag({ startX: x, startY: y, currentX: x, currentY: y });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const { x, y } = getRelative(e);
    setDrag({ ...drag, currentX: x, currentY: y });
  }

  async function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

    const left = Math.min(drag.startX, drag.currentX);
    const top = Math.min(drag.startY, drag.currentY);
    const width = Math.abs(drag.currentX - drag.startX);
    const height = Math.abs(drag.currentY - drag.startY);

    setDrag(null);

    if (width < 20 || height < 20) return; // ドラッグが小さすぎたら無視

    const img = imgRef.current;
    if (!img) return;

    // 実画像座標
    const sx = left * scale;
    const sy = top * scale;
    const sw = width * scale;
    const sh = height * scale;

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onCropped({
          sourceUrl,
          blob,
          dataUrl,
          width: sw,
          height: sh,
        });
      },
      "image/jpeg",
      0.92,
    );
  }

  // 矩形描画用
  const rect = drag
    ? {
        left: Math.min(drag.startX, drag.currentX),
        top: Math.min(drag.startY, drag.currentY),
        width: Math.abs(drag.currentX - drag.startX),
        height: Math.abs(drag.currentY - drag.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none touch-none rounded-2xl bg-black/5 overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <img
        ref={imgRef}
        src={sourceUrl}
        alt=""
        onLoad={() => setImgLoaded(true)}
        className="block w-full h-auto pointer-events-none"
        crossOrigin="anonymous"
      />
      {rect && (
        <>
          {/* オーバーレイ：選択範囲外を暗く */}
          <div
            className="pointer-events-none absolute inset-0 bg-black/40"
            style={{
              clipPath: `polygon(
                0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                ${rect.left}px ${rect.top}px,
                ${rect.left}px ${rect.top + rect.height}px,
                ${rect.left + rect.width}px ${rect.top + rect.height}px,
                ${rect.left + rect.width}px ${rect.top}px,
                ${rect.left}px ${rect.top}px
              )`,
            }}
          />
          {/* 選択枠 */}
          <div
            className="pointer-events-none absolute border-2 border-[#a695d8] bg-[#a695d822]"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      )}

      {/* 操作ヒント（ドラッグ中以外で表示） */}
      {!drag && imgLoaded && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white">
          ドラッグで切り抜き範囲を選択
        </div>
      )}
    </div>
  );
}
