"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveWishItem,
  updateWishItem,
  type WishFlexLevel,
  type WishPriority,
} from "@/app/wishes/actions";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };

// PRIORITIES / FLEX_OPTIONS は iter65.5 で UI から廃止
// exchangeType（同種/異種/同異種）は iter67.3 で復活したが、iter67.5 で再廃止
// → 個別募集（listing）の選択肢ごとに設定する設計に統一されたため、wish レベルでは不要

export type WishFormInitial = {
  groupId: string;
  characterId: string;
  goodsTypeId: string;
  title: string;
  quantity: number;
  note: string;
  photoUrls?: string[];
};

export function WishNewForm({
  groups,
  characters,
  goodsTypes,
  mode = "create",
  wishId,
  initial,
}: {
  groups: Master[];
  characters: CharacterMaster[];
  goodsTypes: Master[];
  /** iter88: 作成 or 編集 */
  mode?: "create" | "edit";
  /** edit モード時の対象 wish id */
  wishId?: string;
  /** edit モード時の初期値 */
  initial?: WishFormInitial;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState<string>(initial?.groupId ?? "");
  const [characterId, setCharacterId] = useState<string>(
    initial?.characterId ?? "",
  );
  const [goodsTypeId, setGoodsTypeId] = useState<string>(
    initial?.goodsTypeId ?? "",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [note, setNote] = useState(initial?.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // iter94: 画像（メイン 1 枚）
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    initial?.photoUrls ?? [],
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSelectPhoto(file: File | null) {
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
    setPhotoUploading(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("セッションが切れました。再ログインしてください");
        return;
      }
      const ext = file.type.split("/")[1] || "jpg";
      const path = `${user.id}/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("goods-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`アップロード失敗: ${upErr.message}`);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("goods-photos").getPublicUrl(path);
      setPhotoUrls([publicUrl]);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemovePhoto() {
    setPhotoUrls([]);
  }

  // 「その他」種別のとき手動でタイトル入力、それ以外は auto-title
  const selectedGoodsType = goodsTypes.find((g) => g.id === goodsTypeId);
  const isOther = selectedGoodsType?.name === "その他";

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedCharacter = characters.find((c) => c.id === characterId);

  useEffect(() => {
    router.prefetch("/wishes");
  }, [router]);

  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );

  // iter88: 編集モードの初期マウント時は characterId をリセットしない
  const [groupChangedByUser, setGroupChangedByUser] = useState(false);
  useEffect(() => {
    if (groupChangedByUser) setCharacterId("");
  }, [groupId, groupChangedByUser]);

  async function handleSubmit() {
    if (!goodsTypeId) {
      setError("グッズ種別を選択してください");
      return;
    }
    if (!groupId && !characterId) {
      setError("推しのグループまたはメンバーを選択してください");
      return;
    }
    // タイトルは「その他」のとき必須、それ以外は自動生成
    let finalTitle = title.trim();
    if (isOther) {
      if (!finalTitle) {
        setError("タイトルを入力してください（その他選択時は必須）");
        return;
      }
    } else if (!finalTitle) {
      const name =
        selectedCharacter?.name ?? selectedGroup?.name ?? "";
      finalTitle = `${name} ${selectedGoodsType?.name ?? ""}`.trim();
    }

    setPending(true);
    setError(null);
    const result =
      mode === "edit" && wishId
        ? await updateWishItem({
            id: wishId,
            groupId: groupId || undefined,
            characterId: characterId || undefined,
            goodsTypeId,
            title: finalTitle,
            note: note.trim() || undefined,
            quantity,
            photoUrls,
          })
        : await saveWishItem({
            groupId: groupId || undefined,
            characterId: characterId || undefined,
            goodsTypeId,
            title: finalTitle,
            // 優先度・許容範囲・exchangeType は UI 廃止（DB 列はデフォルト値で埋める）
            // exchangeType は iter67.5 で wish レベルから再削除（個別募集の選択肢ごとに設定する設計）
            priority: "second" as WishPriority,
            flexLevel: "exact" as WishFlexLevel,
            exchangeType: "any",
            note: note.trim() || undefined,
            quantity,
            photoUrls,
          });
    if (result?.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    router.push("/wishes");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* 推し */}
      <Section label="推し">
        <div className="space-y-2.5">
          <Field label="グループ" required>
            <select
              value={groupId}
              onChange={(e) => {
                setGroupId(e.target.value);
                setGroupChangedByUser(true);
              }}
              className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
            >
              <option value="">選択してください</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          {filteredCharacters.length > 0 && (
            <Field label="メンバー" hint="（任意）">
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 focus:border-[#a695d8] focus:outline-none"
              >
                <option value="">指定なし</option>
                {filteredCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Section>

      {/* グッズ */}
      <Section label="グッズ">
        <div className="space-y-2.5">
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

          {/* タイトルは「その他」種別のときのみ入力。それ以外は自動生成 */}
          {isOther && (
            <Field label="タイトル" required>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 公式ステッカー"
                maxLength={100}
                className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
              />
            </Field>
          )}

          <Field label="数量">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 active:scale-[0.95] disabled:opacity-40"
              >
                −
              </button>
              <div className="flex h-11 min-w-[60px] items-center justify-center rounded-xl border border-[#3a324a14] bg-white px-4 text-base font-bold tabular-nums text-gray-900">
                {quantity}
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a324a14] bg-white text-lg font-bold text-gray-700 active:scale-[0.95]"
              >
                +
              </button>
            </div>
          </Field>
        </div>
      </Section>

      {/* iter67.5：交換タイプは wish レベルから再削除。個別募集の選択肢ごとに指定する設計に統一 */}

      {/* iter94: 画像（メイン 1 枚） */}
      <Section
        label="画像"
        hint={photoUrls.length > 0 ? "1 枚登録済" : "任意"}
      >
        <div className="rounded-xl border border-[#3a324a14] bg-white p-3">
          {photoUrls[0] ? (
            <div className="flex items-start gap-3">
              <div className="relative h-[88px] w-[68px] flex-shrink-0 overflow-hidden rounded-[10px] border border-[#3a324a14] bg-[#3a324a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrls[0]}
                  alt="ウィッシュ画像"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="text-[11.5px] text-gray-500">
                  画像を登録しました
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="rounded-[8px] border border-[#a695d855] bg-white px-2.5 py-1 text-[11px] font-bold text-[#a695d8] disabled:opacity-50"
                  >
                    {photoUploading ? "アップ中…" : "差し替え"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="rounded-[8px] border border-[#3a324a14] bg-white px-2.5 py-1 text-[11px] font-bold text-[#3a324a8c]"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#a695d855] bg-[#fbf9fc] py-5 text-[11.5px] font-bold text-[#a695d8] disabled:opacity-50"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                stroke="#a695d8"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="6" width="16" height="13" rx="2" />
                <path d="M3 13l4-4 4 4 3-3 5 5" />
                <path d="M8 6l1-2h4l1 2" />
                <circle cx="11" cy="11" r="2.5" />
              </svg>
              {photoUploading ? "アップ中…" : "+ 画像を選択"}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              handleSelectPhoto(f);
            }}
          />
        </div>
      </Section>

      {/* メモ */}
      <Section label="メモ" hint={`${note.length} / 200`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="例: 4/27 横アリで取引できる人優先"
          maxLength={200}
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton
        type="submit"
        pending={pending}
        pendingLabel={mode === "edit" ? "更新中..." : "登録中..."}
      >
        {mode === "edit" ? "ウィッシュを更新" : "ウィッシュを登録"}
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
        {hint && (
          <span className="text-[10px] text-gray-500">{hint}</span>
        )}
      </div>
      {children}
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
