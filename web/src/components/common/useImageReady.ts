"use client";

import { useEffect, useState } from "react";

const readyImageUrls = new Set<string>();

export function useImageReady(src?: string | null): boolean {
  const [ready, setReady] = useState(() => !src || readyImageUrls.has(src));

  useEffect(() => {
    let cancelled = false;
    let resetTimer: number | null = null;

    if (!src) {
      setReadySoon(true);
      return;
    }
    if (readyImageUrls.has(src)) {
      setReadySoon(true);
      return;
    }
    if (typeof window === "undefined") {
      setReadySoon(false);
      return;
    }

    const imageSrc = src;
    const img = new window.Image();

    function clearResetTimer() {
      if (resetTimer !== null) {
        window.clearTimeout(resetTimer);
        resetTimer = null;
      }
    }

    function setReadySoon(next: boolean) {
      if (typeof window === "undefined") return;
      clearResetTimer();
      resetTimer = window.setTimeout(() => {
        if (!cancelled) setReady(next);
      }, 0);
    }

    async function finish() {
      try {
        await img.decode?.();
      } catch {
        // Broken or cross-origin decode failures should not keep panels hidden.
      }
      readyImageUrls.add(imageSrc);
      clearResetTimer();
      if (!cancelled) setReady(true);
    }

    setReadySoon(false);
    img.decoding = "async";
    img.onload = () => {
      void finish();
    };
    img.onerror = () => {
      readyImageUrls.add(imageSrc);
      if (!cancelled) setReady(true);
    };
    img.src = imageSrc;

    if (img.complete) {
      void finish();
    }

    return () => {
      cancelled = true;
      clearResetTimer();
    };
  }, [src]);

  return ready;
}
