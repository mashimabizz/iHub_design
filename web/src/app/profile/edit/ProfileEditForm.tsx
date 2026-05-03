"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { updateProfile } from "@/app/profile/actions";

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
  };
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial.handle);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [primaryArea, setPrimaryArea] = useState(initial.primaryArea);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/profile");
    });
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
      {/* アバター */}
      <div className="flex items-center gap-4 rounded-2xl border border-[#3a324a0f] bg-white p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] text-[22px] font-extrabold text-white">
          {initialChar}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-gray-900">アイコン画像</div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            画像アップロード機能は準備中
          </div>
        </div>
        <button
          type="button"
          disabled
          className="rounded-[10px] border border-[#a695d855] bg-white px-3 py-1.5 text-[11px] font-bold text-[#a695d8] opacity-50"
        >
          変更
        </button>
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
