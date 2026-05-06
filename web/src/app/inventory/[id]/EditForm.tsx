"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import { createClient } from "@/lib/supabase/client";
import {
  deleteInventoryItem,
  updateInventoryItem,
} from "../actions";
import { TagInput, type TagInputValue } from "@/components/common/TagInput";
import { syncInventoryTags, type AttachedTag } from "@/lib/tags";

type Props = {
  item: {
    id: string;
    groupId: string;
    characterId: string | null;
    characterRequestId: string | null;
    goodsTypeId: string;
    title: string;
    description: string | null;
    condition: "sealed" | "mint" | "good" | "fair" | "poor" | null;
    quantity: number;
    photoUrls: string[];
    status: "active" | "keep" | "traded" | "reserved" | "archived";
    /** iter113: 既存タグ */
    tags: AttachedTag[];
  };
  groups: { id: string; name: string }[];
  goodsTypes: { id: string; name: string }[];
  characters: { id: string; name: string; group_id: string }[];
  pendingMembers: { id: string; name: string; group_id: string }[];
};

const REQ_PREFIX = "req:";

function packCharacterValue(
  characterId: string | null,
  characterRequestId: string | null,
): string {
  if (characterRequestId) return `${REQ_PREFIX}${characterRequestId}`;
  if (characterId) return characterId;
  return "";
}

function splitCharacterValue(v: string): {
  characterId: string | null;
  characterRequestId: string | null;
} {
  if (!v) return { characterId: null, characterRequestId: null };
  if (v.startsWith(REQ_PREFIX)) {
    return { characterId: null, characterRequestId: v.slice(REQ_PREFIX.length) };
  }
  return { characterId: v, characterRequestId: null };
}

export function EditForm({
  item,
  groups,
  goodsTypes,
  characters,
  pendingMembers,
}: Props) {
  const router = useRouter();

  const [groupId, setGroupId] = useState(item.groupId);
  const [characterValue, setCharacterValue] = useState(
    packCharacterValue(item.characterId, item.characterRequestId),
  );
  const [goodsTypeId, setGoodsTypeId] = useState(item.goodsTypeId);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  // condition は iter65.8 で廃止（DB 列は互換のため残置）
  const [quantity, setQuantity] = useState(item.quantity);
  const [photoUrls, setPhotoUrls] = useState<string[]>(item.photoUrls);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // iter113: タグ
  const initialTags: TagInputValue[] = item.tags.map((t) => ({
    id: t.id,
    label: t.label,
  }));
  const [tags, setTags] = useState<TagInputValue[]>(initialTags);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isReadOnly = item.status === "traded";

  // group 切替時、character は同 group のものでない限りリセット
  const filteredCharacters = useMemo(
    () => characters.filter((c) => c.group_id === groupId),
    [characters, groupId],
  );
  const filteredPending = useMemo(
    () => pendingMembers.filter((p) => p.group_id === groupId),
    [pendingMembers, groupId],
  );

  // 「その他」種別のときのみタイトル手動入力。それ以外は自動。
  const selectedGoodsType = goodsTypes.find((g) => g.id === goodsTypeId);
  const isOther = selectedGoodsType?.name === "その他";

  useEffect(() => {
    router.prefetch("/inventory");
  }, [router]);

  function isCharacterValidForGroup(value: string, nextGroupId: string) {
    if (!value) return true;
    if (value.startsWith(REQ_PREFIX)) {
      const requestId = value.slice(REQ_PREFIX.length);
      return pendingMembers.some(
        (p) => p.group_id === nextGroupId && p.id === requestId,
      );
    }
    return characters.some((c) => c.group_id === nextGroupId && c.id === value);
  }

  function handleGroupChange(nextGroupId: string) {
    setGroupId(nextGroupId);
    if (!isCharacterValidForGroup(characterValue, nextGroupId)) {
      setCharacterValue("");
    }
  }

  /**
   * 写真撮り直し
   *  - file input から選択 → Supabase Storage に upload → URL を photoUrls 配列の先頭に置換
   *  - 旧画像は Storage から削除（容量節約）
   */
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選んでください");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズは 10MB 以下にしてください");
      return;
    }
    setError(null);
    setPhotoUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("セッションが切れました。再ログインしてください");
        setPhotoUploading(false);
        return;
      }
      const ext = file.type.split("/")[1] || "jpg";
      const path = `${user.id}/${new Date().getTime()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("goods-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`アップロード失敗: ${upErr.message}`);
        setPhotoUploading(false);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("goods-photos").getPublicUrl(path);

      // 旧画像を Storage から削除（best effort）
      const oldUrls = photoUrls;
      const next = [publicUrl, ...oldUrls.slice(1)];
      setPhotoUrls(next);
      // 削除はバックグラウンドで（失敗しても無視）
      if (oldUrls[0]) {
        const oldPath = extractStoragePath(oldUrls[0]);
        if (oldPath) {
          supabase.storage
            .from("goods-photos")
            .remove([oldPath])
            .catch(() => undefined);
        }
      }
    } finally {
      setPhotoUploading(false);
      // 同じファイルを連続で選び直しても発火するように reset
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSave() {
    if (isReadOnly) return;
    setError(null);
    startTransition(async () => {
      const { characterId, characterRequestId } =
        splitCharacterValue(characterValue);
      // 「その他」以外で title が空なら、auto-title を作る
      let finalTitle = title.trim();
      if (!finalTitle) {
        const ch = characterId
          ? filteredCharacters.find((c) => c.id === characterId)
          : null;
        const req = characterRequestId
          ? filteredPending.find((p) => p.id === characterRequestId)
          : null;
        const grp = groups.find((g) => g.id === groupId);
        const name = ch?.name ?? req?.name ?? grp?.name ?? "";
        finalTitle = `${name} ${selectedGoodsType?.name ?? ""}`.trim();
      }
      const r = await updateInventoryItem({
        id: item.id,
        groupId,
        characterId,
        characterRequestId,
        goodsTypeId,
        title: finalTitle,
        description: description || undefined,
        // condition は iter65.8 で廃止
        quantity,
        photoUrls,
      });
      if (r?.error) {
        setError(r.error);
        return;
      }
      // iter113: タグ差分同期
      const syncResult = await syncInventoryTags(item.id, tags, item.tags);
      if (syncResult.errors.length > 0) {
        console.warn("tag sync warnings:", syncResult.errors);
      }
      router.push("/inventory");
    });
  }

  function handleDelete() {
    if (isReadOnly) return;
    if (
      !confirm(
        `「${item.title}」を削除します。元に戻せません。\nよろしいですか？`,
      )
    ) {
      return;
    }
    startDeleteTransition(async () => {
      const r = await deleteInventoryItem(item.id);
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.push("/inventory");
    });
  }

  const photoUrl = photoUrls[0] ?? null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-5"
    >
      {isReadOnly && (
        <div className="rounded-2xl border border-[#3a324a14] bg-white px-4 py-3 text-[12px] leading-relaxed text-[#3a324a8c]">
          <span className="font-extrabold text-[#3a324a]">
            過去に譲った履歴
          </span>
          <br />
          取引履歴の整合性を保つため、このグッズは詳細確認のみできます。内容の更新や削除はできません。
        </div>
      )}

      <fieldset
        disabled={isReadOnly}
        className={`m-0 min-w-0 space-y-5 border-0 p-0 ${
          isReadOnly ? "opacity-90" : ""
        }`}
      >
      {/* 写真エリア */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
            写真
          </span>
          {photoUrl && (
            <span className="text-[10px] text-gray-500">
              {isReadOnly
                ? "詳細のみ"
                : photoUploading
                  ? "アップロード中…"
                  : "差し替え可"}
            </span>
          )}
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-[#3a324a14] bg-[#3a324a]">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={item.title || "在庫写真"}
              className="block aspect-[3/4] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center bg-[linear-gradient(135deg,#a695d822,#a8d4e624)] text-center text-xs text-gray-500">
              <span>写真なし</span>
            </div>
          )}
          {/* オーバーレイの撮り直しボタン */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-[12px] font-bold text-[#3a324a] shadow-[0_4px_10px_rgba(0,0,0,0.2)] backdrop-blur-md active:scale-[0.97] disabled:opacity-60"
            >
              {photoUploading ? (
                <>
                  <span className="block h-3 w-3 animate-spin rounded-full border-2 border-[#a695d8] border-t-transparent" />
                  アップロード中
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 4h2.5l1-1.5h3l1 1.5H12v7H2z"
                      stroke="#3a324a"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="7"
                      cy="7.5"
                      r="2"
                      stroke="#3a324a"
                      strokeWidth="1.4"
                    />
                  </svg>
                  {photoUrl ? "撮り直す / 差し替え" : "写真を追加"}
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>

      {/* グループ */}
      <Section label="グループ" required>
        <div className="grid grid-cols-2 gap-2">
          {groups.map((g) => {
            const sel = groupId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGroupChange(g.id)}
                className={`rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white shadow-[0_4px_10px_rgba(166,149,216,0.33)]"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* キャラ */}
      <Section label="メンバー / キャラ" hint="(任意)">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCharacterValue("")}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              !characterValue
                ? "bg-[#a695d8] text-white"
                : "border border-[#3a324a14] bg-white text-gray-700"
            }`}
          >
            指定なし
          </button>
          {filteredCharacters.map((c) => {
            const sel = characterValue === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCharacterValue(c.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {c.name}
              </button>
            );
          })}
          {filteredPending.map((p) => {
            const value = `${REQ_PREFIX}${p.id}`;
            const sel = characterValue === value;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCharacterValue(value)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-dashed border-[#a695d8] bg-white text-[#a695d8]"
                }`}
                title="運営の承認待ち"
              >
                {p.name}
                <span
                  className={`rounded-full px-1.5 text-[9px] font-extrabold ${
                    sel ? "bg-white/30" : "bg-[#a695d822]"
                  }`}
                >
                  審査中
                </span>
              </button>
            );
          })}
        </div>
        {characterValue.startsWith(REQ_PREFIX) && (
          <p className="mt-1.5 text-[10.5px] text-[#a695d8]">
            運営の承認後、自動でメンバーマスタに切り替わります
          </p>
        )}
      </Section>

      {/* 種別 */}
      <Section label="グッズ種別" required>
        <div className="flex flex-wrap gap-1.5">
          {goodsTypes.map((gt) => {
            const sel = goodsTypeId === gt.id;
            return (
              <button
                key={gt.id}
                type="button"
                onClick={() => setGoodsTypeId(gt.id)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
                  sel
                    ? "bg-[#a695d8] text-white"
                    : "border border-[#3a324a14] bg-white text-gray-700"
                }`}
              >
                {gt.name}
              </button>
            );
          })}
        </div>
      </Section>

      {/* タイトル — 「その他」種別のときのみ手動入力。それ以外は自動生成。 */}
      {isOther && (
        <Section label="タイトル" required>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="例: 公式ステッカー"
            className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
          />
        </Section>
      )}

      {/* コンディションは iter65.8 で廃止 */}

      {/* 数量 */}
      <Section label="数量" required>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-xl font-bold text-gray-700"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))
            }
            className="block w-20 rounded-xl border border-[#3a324a14] bg-white px-3 py-2.5 text-center text-base font-bold tabular-nums text-gray-900 focus:border-[#a695d8] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity(Math.min(999, quantity + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-xl font-bold text-gray-700"
          >
            ＋
          </button>
        </div>
      </Section>

      {/* iter113: タグ */}
      <Section label="タグ" hint="マッチ優先度に使用">
        {isReadOnly ? (
          <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-[#3a324a14] bg-white px-2.5 py-2">
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <span
                  key={`${t.id ?? "new"}-${i}`}
                  className="inline-flex rounded-full border border-[#a695d855] bg-[#a695d814] px-2 py-[3px] text-[11px] font-bold text-[#a695d8]"
                >
                  #{t.label}
                </span>
              ))
            ) : (
              <span className="px-1 text-[12px] text-[#3a324a8c]">タグなし</span>
            )}
          </div>
        ) : (
          <TagInput
            value={tags}
            onChange={setTags}
            max={5}
            placeholder="例：LUMENA Debut Album、Type A など"
            helperText="同じシリーズ・イベントを探している相手とマッチが上位に出やすくなります。"
          />
        )}
      </Section>

      {/* 説明 */}
      <Section label="説明 / メモ" hint={`${description.length} / 500`}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="補足やコンディションの詳細"
          className="block w-full resize-none rounded-xl border border-[#3a324a14] bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
        />
      </Section>

      </fieldset>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isReadOnly && (
        <PrimaryButton type="submit" pending={pending} pendingLabel="保存中…">
          変更を保存
        </PrimaryButton>
      )}

      {/* 削除（区切ったうえで赤系） */}
      {!isReadOnly && (
        <div className="mt-4 border-t border-[#3a324a0f] pt-5">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? (
            "削除中…"
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4h10M5 4V2.5h4V4M3 4l1 8h6l1-8" />
              </svg>
              この在庫を削除
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-gray-500">
          削除すると復元できません
        </p>
        </div>
      )}
    </form>
  );
}

function Section({
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
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/**
 * Supabase Storage の publicUrl から `{user_id}/...` 形式のパスを抽出。
 * URL 例:
 *   https://xxxx.supabase.co/storage/v1/object/public/goods-photos/{userId}/{file}.jpg
 *                                                     ↑ ここから後ろを返す
 */
function extractStoragePath(url: string): string | null {
  const marker = "/object/public/goods-photos/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return url.slice(i + marker.length);
}
