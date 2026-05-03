"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addEvidencePhoto,
  notifyEvidenceComplete,
  removeEvidencePhoto,
} from "../../actions";

export type EvidencePhoto = {
  id: string;
  photoUrl: string;
  position: number;
  takenAt: string;
  isMine: boolean;
};

/**
 * iter68.1: 複数枚撮影 + 修正 + 完了通知
 *
 * 構成：
 * - 上部：✕戻る（チャットに戻れる） / オフライン保存 chip
 * - タイトル：取引証跡を撮影（複数可）
 * - 既存の撮影写真ギャラリー（横スクロール、自分の写真は ×ボタンで削除可）
 * - ビューファインダー（撮影ガイド）
 * - 撮影コントロール：履歴 / シャッター / 「双方承認へ →」
 *
 * 「双方承認へ →」を押すと chat に system message を投稿（タップで /approve に遷移可能）
 * → /transactions/[id] に戻り、ユーザーは chat 画面でその system message から approve に進む
 */
export function CaptureView({
  proposalId,
  myCount,
  theirCount,
  placeName,
  photos,
}: {
  proposalId: string;
  myCount: number;
  theirCount: number;
  placeName: string;
  photos: EvidencePhoto[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleShutter() {
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${proposalId}/evidence-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("chat-photos")
        .upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { data: signed } = await supabase.storage
        .from("chat-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const photoUrl = signed?.signedUrl ?? path;

      startTransition(async () => {
        const r = await addEvidencePhoto({ proposalId, photoUrl });
        if (r?.error) setError(r.error);
        else router.refresh();
        setUploading(false);
      });
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    }
  }

  function handleDelete(photoId: string) {
    if (!confirm("この写真を削除しますか？")) return;
    setError(null);
    startTransition(async () => {
      const r = await removeEvidencePhoto({ photoId, proposalId });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  function handleProceed() {
    if (photos.length === 0) {
      setError("少なくとも 1 枚は撮影してください");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await notifyEvidenceComplete({
        proposalId,
        photoCount: photos.length,
      });
      if (r?.error) setError(r.error);
      else if (r?.redirectTo) router.push(r.redirectTo);
    });
  }

  const dt = new Date();
  const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0810] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(166,149,216,0.2), transparent 60%), repeating-linear-gradient(135deg, #1a1525 0 6px, #221a30 6px 12px)",
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* status header */}
      <div className="absolute left-0 right-0 top-12 z-10 flex items-center justify-between px-[18px]">
        <Link
          href={`/transactions/${proposalId}`}
          aria-label="チャットに戻る"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 backdrop-blur-md"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M8 2L3 7l5 5"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur-md">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          オフライン保存
        </div>
        <div className="text-[11px] font-bold text-white/70 tabular-nums">
          {photos.length} 枚
        </div>
      </div>

      {/* title */}
      <div className="absolute left-0 right-0 top-[100px] z-10 text-center">
        <div className="text-[16px] font-bold tracking-[0.4px]">
          取引証跡を撮影
        </div>
        <div className="mt-1 text-[11.5px] text-white/70">
          両者の交換物を1枚に収めてください（複数枚可）
        </div>
      </div>

      {/* ギャラリー（既存写真の横スクロール） */}
      {photos.length > 0 && (
        <div className="absolute left-0 right-0 top-[140px] z-10 px-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {photos.map((ph) => (
              <PhotoChip
                key={ph.id}
                ph={ph}
                onDelete={ph.isMine ? () => handleDelete(ph.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Viewfinder split frame */}
      <div
        className="absolute z-[1] flex overflow-hidden rounded-[18px] border-2 border-[#a695d8]"
        style={{
          top: photos.length > 0 ? 220 : 180,
          left: 30,
          right: 30,
          bottom: 220,
          boxShadow:
            "0 0 0 1px rgba(166,149,216,0.33), 0 0 60px rgba(166,149,216,0.25)",
        }}
      >
        <div
          className="relative flex flex-1 flex-col items-center justify-center gap-2"
          style={{
            background:
              "linear-gradient(160deg, rgba(166,149,216,0.25), rgba(166,149,216,0.10))",
          }}
        >
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(theirCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="flex h-[54px] w-[38px] items-end justify-center rounded-[5px] bg-white/85 pb-1 text-[9px] font-bold text-black/55 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                style={{
                  transform: `rotate(${(i - (Math.min(theirCount, 4) - 1) / 2) * 4}deg)`,
                }}
              >
                ス
              </div>
            ))}
          </div>
          <div className="rounded-full bg-black/50 px-2 py-[3px] text-[9.5px] font-bold tracking-[0.4px]">
            相手の{theirCount}点
          </div>
        </div>
        <div className="relative w-0 border-l border-dashed border-white/40">
          <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#a695d8] shadow-[0_0_0_4px_rgba(166,149,216,0.33)]">
            ↔
          </div>
        </div>
        <div
          className="relative flex flex-1 flex-col items-center justify-center gap-2"
          style={{
            background:
              "linear-gradient(200deg, rgba(243,197,212,0.28), rgba(168,212,230,0.20))",
          }}
        >
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(myCount, 4) }).map((_, i) => (
              <div
                key={i}
                className="flex h-[54px] w-[38px] items-end justify-center rounded-[5px] bg-white/85 pb-1 text-[9px] font-bold text-black/55 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                style={{
                  transform: `rotate(${(i - (Math.min(myCount, 4) - 1) / 2) * 5}deg)`,
                }}
              >
                ヒ
              </div>
            ))}
          </div>
          <div className="rounded-full bg-black/50 px-2 py-[3px] text-[9.5px] font-bold tracking-[0.4px]">
            あなたの{myCount}点
          </div>
        </div>

        {(
          [
            { top: -2, left: -2, br: "4px 0 0 0", border: "3px 0 0 3px" },
            { top: -2, right: -2, br: "0 4px 0 0", border: "3px 3px 0 0" },
            { bottom: -2, left: -2, br: "0 0 0 4px", border: "0 0 3px 3px" },
            { bottom: -2, right: -2, br: "0 0 4px 0", border: "0 3px 3px 0" },
          ] as const
        ).map((p, i) => (
          <div
            key={i}
            className="pointer-events-none absolute"
            style={{
              ...p,
              width: 18,
              height: 18,
              borderColor: "#fff",
              borderStyle: "solid",
              borderWidth: p.border,
              borderRadius: p.br,
            }}
          />
        ))}
      </div>

      {/* Hint chip */}
      <div className="absolute bottom-[200px] left-0 right-0 z-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md">
          <svg width="13" height="13" viewBox="0 0 13 13">
            <circle
              cx="6.5"
              cy="6.5"
              r="5"
              stroke="#fff"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M6.5 4v3M6.5 8.5v.5"
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          自動メタ: {time} · {placeName}
        </div>
      </div>

      {error && (
        <div className="absolute bottom-[145px] left-4 right-4 z-10 rounded-xl border border-red-300/60 bg-red-500/85 px-3 py-2 text-center text-[11.5px] font-bold text-white backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Capture controls */}
      <div className="absolute bottom-[60px] left-0 right-0 z-10 flex items-center justify-around px-8">
        {/* チャットに戻る */}
        <Link
          href={`/transactions/${proposalId}`}
          aria-label="チャットに戻る"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/14"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M3 9h12M9 4l-5 5 5 5"
              stroke="#fff"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <button
          type="button"
          onClick={handleShutter}
          disabled={pending || uploading}
          aria-label="撮影"
          className="h-[76px] w-[76px] rounded-full border-[4px] border-white/45 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.4)] active:scale-[0.95] disabled:opacity-50"
        />
        {/* 双方承認へ進む */}
        <button
          type="button"
          onClick={handleProceed}
          disabled={pending || photos.length === 0}
          aria-label="完了して双方承認へ"
          className={`flex h-11 items-center justify-center rounded-full px-3 text-[11.5px] font-extrabold tracking-[0.4px] backdrop-blur-md ${
            photos.length === 0
              ? "bg-white/14 text-white/55"
              : "bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-white shadow-[0_4px_14px_rgba(166,149,216,0.4)]"
          }`}
        >
          完了 →
        </button>
      </div>

      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <span className="block h-5 w-5 animate-spin rounded-full border-[3px] border-[#a695d8] border-t-transparent" />
            <span className="text-[13px] font-bold text-[#3a324a]">
              証跡をアップロード中…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoChip({
  ph,
  onDelete,
}: {
  ph: EvidencePhoto;
  onDelete?: () => void;
}) {
  return (
    <div className="relative flex-shrink-0">
      <div className="h-16 w-12 overflow-hidden rounded-[6px] border-2 border-white/55 shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ph.photoUrl}
          alt={`証跡 #${ph.position}`}
          className="block h-full w-full object-cover"
        />
      </div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-1.5 text-[8.5px] font-bold text-white">
        #{ph.position}
      </span>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="削除"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold leading-none text-white shadow-md"
        >
          ✕
        </button>
      )}
    </div>
  );
}
