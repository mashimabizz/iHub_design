"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { updateProfile } from "@/app/profile/actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { AvatarCropperModal } from "./AvatarCropperModal";

type Gender = "female" | "male" | "other" | "no_answer";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "other", label: "その他" },
  { value: "no_answer", label: "回答しない" },
];

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export function ProfileEditForm({
  initial,
}: {
  initial: {
    handle: string;
    displayName: string;
    gender: Gender | null;
    primaryArea: string;
    avatarUrl: string | null;
  };
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial.handle);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [primaryArea, setPrimaryArea] = useState(initial.primaryArea);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // iter96: avatar upload + crop
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    router.prefetch("/profile");
  }, [router]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const r = await updateProfile({
        handle,
        displayName,
        gender: gender ?? undefined,
        primaryArea: primaryArea.trim() || undefined,
        avatarUrl: avatarUrl ?? null,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/profile");
    });
  }

  /** ファイル選択 → ObjectURL を作って Cropper を開く */
  function handleFilePicked(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選んでください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("10MB 以下の画像にしてください");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setCropSourceUrl(url);
  }

  /** Cropper で「適用」 → Blob を Storage にアップロード → avatar_url を更新 */
  async function handleCropApplied(result: { blob: Blob; dataUrl: string }) {
    // モーダルは閉じる
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(null);

    setUploadingAvatar(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("ログイン情報が取得できませんでした");
        return;
      }
      // 同一ユーザーは同じパスに upsert で上書き（履歴は持たない方針）
      const path = `${user.id}/avatar_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, result.blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        setError(upErr.message || "アップロード失敗");
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロード失敗");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleCropCancel() {
    if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    setCropSourceUrl(null);
  }

  function handleRemoveAvatar() {
    if (!confirm("アイコン画像を削除しますか？")) return;
    setAvatarUrl(null);
  }

  const initialChar = (displayName || handle || "?").charAt(0).toUpperCase();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* アバター（iter96: アップロード + クロップ対応） */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#3a324a0f] bg-white p-4">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="アイコン"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[22px] font-extrabold text-white">
              {initialChar}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-gray-900">アイコン画像</div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            {uploadingAvatar
              ? "アップロード中…"
              : avatarUrl
                ? "タップして変更（切り抜きも可能）"
                : "画像を選んで切り抜き登録"}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="rounded-[10px] border border-[#a695d855] bg-white px-3 py-1.5 text-[11px] font-bold text-[#a695d8] disabled:opacity-50"
          >
            {avatarUrl ? "変更" : "選択"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-1 text-[10px] font-bold text-[#3a324a8c] disabled:opacity-50"
            >
              削除
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            handleFilePicked(f);
            if (e.target) e.target.value = "";
          }}
        />
      </div>

      {/* 基本情報 */}
      <Section label="基本情報">
        <Field label="ハンドル名" required hint="半角英数字・_、3〜20 文字">
          <div className="flex items-center rounded-xl border border-[#3a324a14] bg-white">
            <span className="border-r border-[#3a324a0f] px-3 py-3 text-[14px] font-bold text-[#3a324a8c]">
              @
            </span>
            <input
              type="text"
              required
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              maxLength={20}
              placeholder="hana_lumi"
              className="block flex-1 bg-transparent px-3 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </Field>

        <Field label="表示名" required>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="ハナ"
            className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
          />
        </Field>
      </Section>

      {/* 公開情報 */}
      <Section label="公開情報" hint="マッチング前に表示">
        <Field label="性別">
          <div className="flex flex-wrap gap-1.5">
            {GENDER_OPTIONS.map((g) => {
              const sel = gender === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(sel ? null : g.value)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                    sel
                      ? "bg-[#a695d8] text-white"
                      : "border border-[#3a324a14] bg-white text-gray-700"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="主な活動エリア（都道府県）" hint="（任意）">
          <select
            value={primaryArea}
            onChange={(e) => setPrimaryArea(e.target.value)}
            className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
          >
            <option value="">指定なし</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton type="submit" pending={pending} pendingLabel="保存中…">
        変更を保存
      </PrimaryButton>

      {/* iter96: クロップモーダル */}
      {cropSourceUrl && (
        <AvatarCropperModal
          sourceUrl={cropSourceUrl}
          onApply={handleCropApplied}
          onClose={handleCropCancel}
        />
      )}
    </form>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
        </span>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 block text-sm font-bold text-gray-900">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && (
          <span className="ml-1 text-[11px] font-medium text-gray-500">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
