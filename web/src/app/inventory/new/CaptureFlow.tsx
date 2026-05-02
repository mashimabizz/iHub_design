"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import {
  requestCharacterFromInventory,
  saveBatchInventoryItems,
} from "@/app/inventory/actions";
import { CroppingCanvas, type CropResult } from "./CroppingCanvas";
import { CropToast } from "./CropToast";

type Master = { id: string; name: string };
type CharacterMaster = { id: string; name: string; group_id: string };
type PendingMember = { id: string; name: string; group_id: string };

type Step = "common" | "shoot" | "crop" | "meta";

type Condition = "sealed" | "mint" | "good" | "fair" | "poor";

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "sealed", label: "未開封" },
  { value: "mint", label: "極美" },
  { value: "good", label: "良好" },
  { value: "fair", label: "普通" },
  { value: "poor", label: "難あり" },
];

/**
 * `characterId` は select の value をそのまま保持。
 *   "" = 指定なし
 *   "<UUID>" = characters_master.id
 *   "req:<UUID>" = character_requests.id（審査中）
 * 保存時に prefix で分岐して character_id / character_request_id に振り分ける。
 */
type CropMeta = {
  characterId: string;
  title: string;
  series: string;
  condition: Condition;
  quantity: number;
};

const REQ_PREFIX = "req:";

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
  characters,
  pendingMembers: initialPendingMembers,
  userId,
}: {
  groups: Master[];
  goodsTypes: Master[];
  characters: CharacterMaster[];
  pendingMembers: PendingMember[];
  userId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("common");

  // Step 1: 共通選択
  const [groupId, setGroupId] = useState<string>("");
  const [goodsTypeId, setGoodsTypeId] = useState<string>("");

  // pending リクエスト（リクエスト送信時に動的に追加されるためローカル state）
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>(
    initialPendingMembers,
  );

  // Step 2: 撮影/アップロード
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const supabase = createClient();

  // Step 3: 切り抜き
  const [crops, setCrops] = useState<CropResult[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [toastSignal, setToastSignal] = useState(0);
  const [lastCropThumb, setLastCropThumb] = useState<string | undefined>();

  // Step 4: ラベル設定
  const [cropMetas, setCropMetas] = useState<CropMeta[]>([]);
  const [startCarrying, setStartCarrying] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 写真ナシ登録のためのデフォルト 1 件
  // crops 空で meta に入った時、cropMetas が 1 件あればフォーム表示
  const noPhoto = crops.length === 0;

  // メンバー追加リクエスト
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestedNames, setRequestedNames] = useState<string[]>([]);

  function handleCropped(crop: CropResult) {
    setCrops((prev) => [...prev, crop]);
    setCropMetas((prev) => [
      ...prev,
      {
        characterId: "",
        title: "",
        series: "",
        condition: "good",
        quantity: 1,
      },
    ]);
    setLastCropThumb(crop.dataUrl);
    setToastSignal(Date.now());
  }

  function removeCrop(index: number) {
    setCrops((prev) => prev.filter((_, i) => i !== index));
    setCropMetas((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMeta(index: number, patch: Partial<CropMeta>) {
    setCropMetas((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
  }

  // Step 4 → 一括登録
  const filteredCharacters = characters.filter(
    (c) => c.group_id === groupId,
  );
  const filteredPending = pendingMembers.filter(
    (p) => p.group_id === groupId,
  );
  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedGoodsType = goodsTypes.find((g) => g.id === goodsTypeId);

  async function handleBatchSave() {
    setSavePending(true);
    setSaveError(null);

    // 自動タイトル生成のヘルパ
    const autoTitle = (meta: CropMeta): string => {
      const { characterId, characterRequestId } = splitCharacterValue(
        meta.characterId,
      );
      const ch = characterId
        ? filteredCharacters.find((c) => c.id === characterId)
        : null;
      const req = characterRequestId
        ? filteredPending.find((p) => p.id === characterRequestId)
        : null;
      const name = ch?.name ?? req?.name ?? selectedGroup?.name ?? "";
      return `${name} ${selectedGoodsType?.name ?? ""}`.trim();
    };

    try {
      const items: Parameters<typeof saveBatchInventoryItems>[0]["items"] = [];

      // 写真ナシ：cropMetas[0] のみで 1 件登録
      if (noPhoto) {
        const meta = cropMetas[0];
        if (!meta) {
          setSaveError("登録するアイテムがありません");
          setSavePending(false);
          return;
        }
        const title = meta.title.trim() || autoTitle(meta);
        const { characterId, characterRequestId } = splitCharacterValue(
          meta.characterId,
        );
        items.push({
          groupId,
          goodsTypeId,
          characterId,
          characterRequestId,
          title,
          series: meta.series.trim() || undefined,
          condition: meta.condition,
          quantity: meta.quantity,
          // photoUrl 省略
        });
      } else {
        // 写真アリ：各切り抜きを Storage にアップロード
        for (let i = 0; i < crops.length; i++) {
          const crop = crops[i];
          const meta = cropMetas[i];

          const fileName = `${userId}/${Date.now()}_${i}_${Math.random()
            .toString(36)
            .slice(2, 8)}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("goods-photos")
            .upload(fileName, crop.blob, {
              cacheControl: "3600",
              contentType: "image/jpeg",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`アップロード失敗: ${uploadError.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("goods-photos").getPublicUrl(fileName);

          const title = meta.title.trim() || autoTitle(meta);
          const { characterId, characterRequestId } = splitCharacterValue(
            meta.characterId,
          );

          items.push({
            groupId,
            goodsTypeId,
            characterId,
            characterRequestId,
            title,
            series: meta.series.trim() || undefined,
            condition: meta.condition,
            quantity: meta.quantity,
            photoUrl: publicUrl,
          });
        }
      }

      const result = await saveBatchInventoryItems({
        items,
        startCarrying,
      });
      if (result?.error) {
        setSaveError(result.error);
        setSavePending(false);
        return;
      }

      router.push("/inventory");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
      setSavePending(false);
    }
  }

  /**
   * 「写真ナシで登録」を選んだ時、cropMetas に空の 1 件を初期化して meta へ
   */
  function skipPhotoToMeta() {
    setCropMetas([
      {
        characterId: "",
        title: "",
        series: "",
        condition: "good",
        quantity: 1,
      },
    ]);
    setStep("meta");
  }

  /**
   * メンバー追加リクエスト送信
   */
  async function handleMemberRequest() {
    setRequestError(null);
    const name = requestName.trim();
    if (!name) {
      setRequestError("メンバー名を入力してください");
      return;
    }
    if (!groupId) {
      setRequestError("グループが未選択です");
      return;
    }
    setRequestPending(true);
    const r = await requestCharacterFromInventory({
      groupId,
      name,
      note: requestNote.trim() || undefined,
    });
    setRequestPending(false);
    if (r.error) {
      setRequestError(r.error);
      return;
    }
    // ローカルに名前を記録（バッジ表示用）
    setRequestedNames((prev) => [...prev, name]);
    // select の選択肢にも即追加
    if (r.id) {
      setPendingMembers((prev) => [
        ...prev,
        { id: r.id!, name, group_id: groupId },
      ]);
    }
    setRequestName("");
    setRequestNote("");
    setRequestOpen(false);
  }

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

        {/* 写真なしで登録 */}
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={skipPhotoToMeta}
            className="text-[12px] font-bold text-[#a695d8] underline-offset-2 hover:underline"
          >
            写真なしで登録する →
          </button>
          <p className="mt-1 text-[10.5px] text-gray-500">
            あとから編集画面で写真を追加できます
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // Step 3: 切り抜き
  // ────────────────────────────────────────
  if (step === "crop") {
    const uploadedPhotos = photos.filter((p) => p.status === "uploaded");
    const safeIdx = Math.min(currentPhotoIdx, uploadedPhotos.length - 1);
    const currentPhoto = uploadedPhotos[safeIdx];

    if (!currentPhoto) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-yellow-50 px-4 py-3 text-[12px] text-yellow-900">
            アップロード済みの写真がありません。撮影に戻ってください。
          </div>
          <button
            type="button"
            onClick={() => setStep("shoot")}
            className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#3a324a14] bg-white text-[13px] font-semibold text-gray-700"
          >
            ← 撮影に戻る
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3 pb-4">
        {/* ナビ：写真切替 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={safeIdx === 0}
            onClick={() => setCurrentPhotoIdx(safeIdx - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#3a324a14] disabled:opacity-30"
            aria-label="前の写真"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#3a324a"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M9 2L4 7l5 5" />
            </svg>
          </button>
          <div className="text-[12px] font-bold text-gray-900 tabular-nums">
            {safeIdx + 1} / {uploadedPhotos.length}
          </div>
          <button
            type="button"
            disabled={safeIdx === uploadedPhotos.length - 1}
            onClick={() => setCurrentPhotoIdx(safeIdx + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-[#3a324a14] disabled:opacity-30"
            aria-label="次の写真"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#3a324a"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M5 2l5 5-5 5" />
            </svg>
          </button>
        </div>

        {/* キャンバス（ドラッグで切り抜き） */}
        <CroppingCanvas
          key={currentPhoto.url}
          sourceUrl={currentPhoto.url}
          onCropped={handleCropped}
        />

        {/* 切り抜き一覧 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
            <span>
              切り抜き <b className="text-[#a695d8]">{crops.length}</b> 件
            </span>
          </div>
          {crops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#3a324a14] bg-white py-4 text-center text-[11px] text-gray-500">
              まだ切り抜きはありません。
              <br />
              写真上でドラッグして範囲を選んでください。
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {crops.map((c, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-lg border border-[#3a324a14] bg-white"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <img
                    src={c.dataUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeCrop(i)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="削除"
                  >
                    <svg
                      width="8"
                      height="8"
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
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setStep("shoot")}
            className="flex h-12 items-center justify-center rounded-2xl border border-[#3a324a14] bg-white px-5 text-[13px] font-semibold text-gray-700"
          >
            戻る
          </button>
          <button
            type="button"
            disabled={crops.length === 0}
            onClick={() => setStep("meta")}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#a695d8,#f3c5d4)] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            次へ：ラベル設定 ({crops.length})
          </button>
        </div>

        {/* トースト */}
        <CropToast
          signal={toastSignal}
          message="切り抜きました"
          thumbnail={lastCropThumb}
        />
      </div>
    );
  }

  // ────────────────────────────────────────
  // Step 4: ラベル設定
  // ────────────────────────────────────────
  if (step === "meta") {
    const isOther = selectedGoodsType?.name === "その他";
    return (
      <div className="space-y-3 pb-4">
        <div className="rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12px] leading-relaxed text-gray-700">
          <span className="font-bold">
            🏷 {noPhoto ? "登録内容を設定" : "各切り抜きにキャラ名などを設定"}
          </span>
          <br />
          グループ:{" "}
          <b className="text-gray-900">{selectedGroup?.name}</b> ・ 種別:{" "}
          <b className="text-gray-900">{selectedGoodsType?.name}</b>
        </div>

        {/* メンバー追加リクエスト ボタン / インラインフォーム */}
        {!requestOpen ? (
          <button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#a695d888] bg-white px-3 py-2.5 text-[12px] font-bold text-[#a695d8] transition-all active:scale-[0.99]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M6 1v10M1 6h10"
                stroke="#a695d8"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            メンバーが見つからない場合は追加リクエスト
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-[#a695d855] bg-[#a695d80a] p-3">
            <div className="text-[11px] font-bold text-[#a695d8]">
              メンバー追加リクエスト
            </div>
            <input
              type="text"
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="メンバー名（例: スア）"
              maxLength={100}
              className="block w-full rounded-lg border border-[#3a324a14] bg-white px-2.5 py-2 text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="メモ（公式リンク・別名など、任意）"
              rows={2}
              maxLength={500}
              className="block w-full resize-none rounded-lg border border-[#3a324a14] bg-white px-2.5 py-2 text-[11.5px] text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
            />
            {requestError && (
              <div className="text-[11px] text-red-600">{requestError}</div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRequestOpen(false);
                  setRequestError(null);
                }}
                className="flex-1 rounded-lg border border-[#3a324a14] bg-white px-3 py-1.5 text-[11.5px] font-bold text-gray-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleMemberRequest}
                disabled={requestPending || !requestName.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-3 py-1.5 text-[11.5px] font-bold text-white shadow-[0_2px_6px_rgba(166,149,216,0.35)] active:scale-[0.97] disabled:opacity-60"
              >
                {requestPending ? "送信中…" : "リクエスト送信"}
              </button>
            </div>
          </div>
        )}

        {requestedNames.length > 0 && (
          <div className="rounded-xl bg-[#a8d4e620] px-3 py-2 text-[11px] text-gray-700">
            <span className="font-bold">送信済リクエスト:</span>{" "}
            {requestedNames.map((n, i) => (
              <span
                key={n + i}
                className="ml-1 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#a695d8]"
              >
                {n}（審査中）
              </span>
            ))}
          </div>
        )}

        {/* アイテム一覧（写真ナシは 1 件、写真アリは crops の数だけ） */}
        <div className="space-y-2.5">
          {cropMetas.map((meta, i) => {
            const crop = crops[i]; // 写真ナシのときは undefined
            return (
              <div
                key={i}
                className="flex gap-3 rounded-2xl border border-[#3a324a14] bg-white p-3"
              >
                {/* サムネ（写真アリのみ） */}
                {crop && (
                  <div
                    className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#3a324a14] bg-gray-100"
                    style={{ aspectRatio: "1 / 1" }}
                  >
                    <img
                      src={crop.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* メタ入力 */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {/* メンバー */}
                  <select
                    value={meta.characterId}
                    onChange={(e) =>
                      updateMeta(i, { characterId: e.target.value })
                    }
                    className="block w-full rounded-lg border border-[#3a324a14] bg-white px-2.5 py-1.5 text-[12px] text-gray-900 focus:border-[#a695d8] focus:outline-none"
                  >
                    <option value="">指定なし（共通）</option>
                    {filteredCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {filteredPending.length > 0 && (
                      <optgroup label="審査中">
                        {filteredPending.map((p) => (
                          <option key={p.id} value={`${REQ_PREFIX}${p.id}`}>
                            {p.name}（審査中）
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* タイトル — その他選択時のみ */}
                  {isOther && (
                    <input
                      type="text"
                      value={meta.title}
                      onChange={(e) =>
                        updateMeta(i, { title: e.target.value })
                      }
                      placeholder="タイトル（その他なので入力）"
                      maxLength={100}
                      className="block w-full rounded-lg border border-[#3a324a14] bg-white px-2.5 py-1.5 text-[12px] text-gray-900 placeholder:text-gray-400 focus:border-[#a695d8] focus:outline-none"
                    />
                  )}

                  {/* コンディション + 数量 */}
                  <div className="flex items-center gap-2">
                    <select
                      value={meta.condition}
                      onChange={(e) =>
                        updateMeta(i, {
                          condition: e.target.value as Condition,
                        })
                      }
                      className="block flex-1 rounded-lg border border-[#3a324a14] bg-white px-2 py-1.5 text-[11px] text-gray-900 focus:border-[#a695d8] focus:outline-none"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta(i, {
                            quantity: Math.max(1, meta.quantity - 1),
                          })
                        }
                        disabled={meta.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3a324a14] bg-white text-[12px] font-bold text-gray-700 disabled:opacity-30"
                      >
                        −
                      </button>
                      <div className="min-w-[24px] text-center text-[12px] font-bold tabular-nums text-gray-900">
                        {meta.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta(i, {
                            quantity: Math.min(999, meta.quantity + 1),
                          })
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3a324a14] bg-white text-[12px] font-bold text-gray-700"
                      >
                        +
                      </button>
                    </div>
                    {/* 写真ありの時のみ削除可 */}
                    {crop && (
                      <button
                        type="button"
                        onClick={() => removeCrop(i)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] text-gray-400 hover:text-red-500"
                        aria-label="削除"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <path
                            d="M3 3l8 8M11 3l-8 8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 持参モード */}
        <label className="flex items-start gap-2.5 rounded-xl bg-[#a8d4e620] px-4 py-3 text-[12px]">
          <input
            type="checkbox"
            checked={startCarrying}
            onChange={(e) => setStartCarrying(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#a695d8] focus:ring-[#a695d8]"
          />
          <div className="flex-1">
            <span className="font-bold text-gray-900">
              🎒 全部今日から持参中にする
            </span>
            <span className="ml-1 text-gray-600">
              （会場で交換可能な状態にする）
            </span>
          </div>
        </label>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setStep(noPhoto ? "shoot" : "crop")}
            disabled={savePending}
            className="flex h-12 items-center justify-center rounded-2xl border border-[#3a324a14] bg-white px-5 text-[13px] font-semibold text-gray-700 disabled:opacity-50"
          >
            戻る
          </button>
          <PrimaryButton
            type="button"
            onClick={handleBatchSave}
            pending={savePending}
            pendingLabel="登録中..."
          >
            {noPhoto ? "1 件登録（写真なし）" : `${crops.length} 件まとめて登録`}
          </PrimaryButton>
        </div>
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
