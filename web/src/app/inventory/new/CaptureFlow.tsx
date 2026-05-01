"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

type Master = { id: string; name: string };

type Step = "common" | "shoot" | "crop" | "meta";

export type UploadedPhoto = {
  url: string; // Supabase Storage の public URL
  path: string; // bucket 内の path（削除用）
  status: "uploading" | "uploaded" | "error";
  error?: string;
  // 後で切り抜き機能で追加: croppedRegions: Crop[]
};

export function CaptureFlow({
  groups,
  goodsTypes,
  userId,
}: {
  groups: Master[];
  goodsTypes: Master[];
  userId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("common");

  // Step 1: 共通選択
  const [groupId, setGroupId] = useState<string>("");
  const [goodsTypeId, setGoodsTypeId] = useState<string>("");

  // Step 2: 撮影/アップロード
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const supabase = createClient();

  // Step 1 → 2 へ進める条件
  const canProceedFromCommon = !!groupId && !!goodsTypeId;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // file input をリセット（同じ画像を選び直せるように）
    e.target.value = "";

    // 各ファイルを並列でアップロード
    const initialPhotos: UploadedPhoto[] = files.map(() => ({
      url: "",
      path: "",
      status: "uploading" as const,
    }));
    const startIndex = photos.length;
    setPhotos((prev) => [...prev, ...initialPhotos]);

    await Promise.all(
      files.map(async (file, i) => {
        const idx = startIndex + i;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${userId}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("goods-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setPhotos((prev) => {
            const next = [...prev];
            next[idx] = {
              url: "",
              path: fileName,
              status: "error",
              error: uploadError.message,
            };
            return next;
          });
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("goods-photos").getPublicUrl(fileName);

        setPhotos((prev) => {
          const next = [...prev];
          next[idx] = {
            url: publicUrl,
            path: fileName,
            status: "uploaded",
          };
          return next;
        });
      }),
    );
  }

  async function removePhoto(index: number) {
    const photo = photos[index];
    if (photo?.path) {
      // Storage からも削除（失敗しても UI は更新）
      await supabase.storage.from("goods-photos").remove([photo.path]);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const uploadedCount = photos.filter((p) => p.status === "uploaded").length;
  const uploadingCount = photos.filter((p) => p.status === "uploading").length;

  // ────────────────────────────────────────
  // Step 1: 共通選択
  // ────────────────────────────────────────
  if (step === "common") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12px] leading-relaxed text-gray-700">
          <span className="font-bold">📋 1回の撮影は同じ推し・種別が前提</span>
          <br />
          先にグループとグッズ種別を選んでください（後で個別変更も可）。
        </div>

        <Section title="推し">
          <Field label="グループ" required>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            >
              <option value="">選択してください</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-gray-500">
              推し選択で登録したグループから選べます
            </p>
          </Field>
        </Section>

        <Section title="グッズ">
          <Field label="種別" required>
            <select
              value={goodsTypeId}
              onChange={(e) => setGoodsTypeId(e.target.value)}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            >
              <option value="">選択してください</option>
              {goodsTypes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <PrimaryButton
          type="button"
          disabled={!canProceedFromCommon}
          onClick={() => setStep("shoot")}
        >
          次へ：写真を撮る
        </PrimaryButton>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Step 2: 撮影/アップロード
  // ────────────────────────────────────────
  if (step === "shoot") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12px] leading-relaxed text-gray-700">
          <span className="font-bold">📸 写真を撮るか、ライブラリから選びます</span>
          <br />
          複数枚同時に選べます。撮ったあと、切り抜きと個別ラベル付けができます。
        </div>

        {/* 撮影/選択ボタン */}
        <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#a695d855] bg-[linear-gradient(120deg,#a695d810,#a8d4e610)] text-[#a695d8] transition-all active:scale-[0.99]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            stroke="#a695d8"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="22" height="18" rx="2" />
            <circle cx="14" cy="15" r="4" />
            <path d="M9 6l2-3h6l2 3" />
          </svg>
          <span className="text-[12px] font-bold">写真を撮る / 選ぶ</span>
          <span className="text-[10px] text-gray-500">
            複数枚同時に OK・最大 10MB / 枚
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* プレビュー一覧 */}
        {photos.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                <b className="text-[#a695d8]">{uploadedCount}</b> /{" "}
                {photos.length} アップロード済
                {uploadingCount > 0 && (
                  <span className="ml-2 text-[#a695d8]">
                    （{uploadingCount} 件アップロード中…）
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl border border-[#3a324a14] bg-white"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  {p.status === "uploaded" && (
                    <img
                      src={p.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  {p.status === "uploading" && (
                    <div className="flex h-full w-full items-center justify-center bg-[#a695d810]">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#a695d8] border-t-transparent" />
                    </div>
                  )}
                  {p.status === "error" && (
                    <div className="flex h-full w-full items-center justify-center bg-red-50 px-2 text-center text-[9px] text-red-600">
                      エラー
                      <br />
                      {p.error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-all active:scale-90"
                    aria-label="削除"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M2 2l6 6M8 2l-6 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setStep("common")}
            className="flex h-12 items-center justify-center rounded-2xl border border-[#3a324a14] bg-white px-5 text-[13px] font-semibold text-gray-700"
          >
            戻る
          </button>
          <button
            type="button"
            disabled={uploadedCount === 0 || uploadingCount > 0}
            onClick={() => setStep("crop")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ：切り抜き ({uploadedCount})
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Step 3: 切り抜き（次回実装）
  // ────────────────────────────────────────
  if (step === "crop") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#f3c5d420] px-4 py-4 text-center">
          <div className="text-[14px] font-bold text-gray-900">
            ✂️ 切り抜き機能
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
            次の iter で実装します。
            <br />
            ドラッグで矩形選択 → 自動切り抜き → トースト通知。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStep("shoot")}
          className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#3a324a14] bg-white text-[13px] font-semibold text-gray-700"
        >
          ← 撮影に戻る
        </button>
        <button
          type="button"
          onClick={() => router.push("/inventory")}
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-gray-100 text-[13px] font-semibold text-gray-700"
        >
          一旦終了して在庫一覧に戻る
        </button>
      </div>
    );
  }

  return null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 block text-sm font-bold text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </div>
      {children}
    </div>
  );
}
