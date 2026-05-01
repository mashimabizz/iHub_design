"use client";

import { useState } from "react";
import { saveOshiRequest } from "@/app/onboarding/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";

const KINDS: { value: "group" | "work" | "solo"; label: string }[] = [
  { value: "group", label: "グループ" },
  { value: "work", label: "作品" },
  { value: "solo", label: "ソロ" },
];

export function RequestForm({
  genres,
}: {
  genres: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState<string>("");
  const [kind, setKind] = useState<"group" | "work" | "solo" | "">("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("推しの名前を入力してください");
      return;
    }
    setPending(true);
    setError(null);
    const result = await saveOshiRequest({
      name: trimmed,
      genreId: genreId || undefined,
      kind: kind || undefined,
      note: note.trim() || undefined,
    });
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="mt-6 space-y-4">
      {/* 推しの名前 */}
      <div>
        <label
          htmlFor="oshi_name"
          className="block text-sm font-bold text-gray-900"
        >
          推しの名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="oshi_name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: LUMENA"
          maxLength={100}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
        />
        <p className="mt-1.5 text-[11px] text-gray-500">
          公式表記の通りに入力してください
        </p>
      </div>

      {/* ジャンル */}
      <div>
        <label
          htmlFor="oshi_genre"
          className="block text-sm font-bold text-gray-900"
        >
          ジャンル <span className="text-gray-500">（任意）</span>
        </label>
        <select
          id="oshi_genre"
          value={genreId}
          onChange={(e) => setGenreId(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none focus:ring-1 focus:ring-[#a695d855]"
        >
          <option value="">選択しない</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {/* 種類 */}
      <div>
        <label className="block text-sm font-bold text-gray-900">
          種類 <span className="text-gray-500">（任意）</span>
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const active = kind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(active ? "" : k.value)}
                className={`rounded-xl border-[1.5px] border-solid py-2.5 text-[13px] transition-all duration-150 active:scale-[0.97] ${
                  active
                    ? "border-[#a695d8] bg-[#a695d814] font-bold text-gray-900"
                    : "border-[#3a324a14] bg-white font-medium text-gray-900 hover:border-[#3a324a26]"
                }`}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* メモ */}
      <div>
        <label
          htmlFor="oshi_note"
          className="block text-sm font-bold text-gray-900"
        >
          メモ <span className="text-gray-500">（任意）</span>
        </label>
        <textarea
          id="oshi_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="公式サイト URL、別名、補足など"
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
        運営が確認後、既存の推しと一致した場合は自動で紐付け、新規の場合はマスタに追加されます。承認されるまで「審査中」表示になります。
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
