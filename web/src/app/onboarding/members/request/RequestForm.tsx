"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCharacterRequest } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

export function RequestForm({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/onboarding/members");
  }, [router]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("メンバー名を入力してください");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveCharacterRequest({
      groupId,
      name: trimmed,
      note: note.trim() || undefined,
    });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/onboarding/members");
  }

  return (
    <div className="mt-6 space-y-4">
      {/* グループ名表示 */}
      <div className="rounded-xl bg-[#a695d810] px-4 py-3 text-[12px] text-gray-700">
        <span className="font-bold">追加先のグループ:</span>{" "}
        <span className="font-bold text-gray-900">{groupName}</span>
      </div>

      {/* メンバー名 */}
      <div>
        <label
          htmlFor="member_name"
          className="block text-sm font-bold text-gray-900"
        >
          メンバー / キャラクター名 <span className="text-red-500">*</span>
        </label>
        <input
          id="member_name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: スア"
          maxLength={100}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
        />
        <p className="mt-1.5 text-[11px] text-gray-500">
          公式表記の通りに入力してください
        </p>
      </div>

      {/* メモ */}
      <div>
        <label
          htmlFor="member_note"
          className="block text-sm font-bold text-gray-900"
        >
          メモ <span className="text-gray-500">（任意）</span>
        </label>
        <textarea
          id="member_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="本名・別名・公式リンクなど"
          maxLength={500}
          className="mt-2 block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
        />
        <p className="mt-1.5 text-[11px] text-gray-500">
          {note.length} / 500 文字
        </p>
      </div>

      {/* 注意書き */}
      <div className="rounded-xl bg-[#a695d810] px-4 py-3 text-[11px] leading-relaxed text-gray-700">
        <span className="font-bold">📝 リクエスト後の流れ</span>
        <br />
        運営が確認後、既存のメンバーと一致した場合は自動で紐付け、新規の場合はマスタに追加されます。
        承認されるまで「審査中」表示になり、他のユーザーも同じメンバーを選択できます。
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <PrimaryButton
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim()}
        pending={pending}
        pendingLabel="送信中..."
      >
        リクエストを送信
      </PrimaryButton>
    </div>
  );
}
