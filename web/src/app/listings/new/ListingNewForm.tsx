"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auth/PrimaryButton";
import {
  createListing,
  updateListingFull,
  type ListingExchangeType,
  type ListingLogic,
  type ListingOptionInput,
} from "@/app/listings/actions";

export type ListingFormInitialValues = {
  haveGroupId: string | null;
  haveGoodsTypeId: string | null;
  selectedHaves: { id: string; qty: number }[];
  haveLogic: ListingLogic;
  options: {
    position: number;
    groupId: string | null;
    goodsTypeId: string | null;
    selected: { id: string; qty: number }[];
    logic: ListingLogic;
    exchangeType: ListingExchangeType;
    isCashOffer: boolean;
    cashAmount: number | null;
  }[];
  note: string;
};

type InventoryOpt = {
  id: string;
  title: string;
  photoUrl: string | null;
  groupId: string | null;
  goodsTypeId: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  hue: number;
  /** iter144: 在庫数（譲側の qty 上限。これを超えて選択できない） */
  availableQty: number;
};

type WishOpt = {
  id: string;
  title: string;
  exchangeType?: "same_kind" | "cross_kind" | "any";
  groupId: string | null;
  goodsTypeId: string | null;
  groupName: string | null;
  characterName: string | null;
  goodsTypeName: string | null;
  /** iter145: 画像 URL（あれば exchangeType の指定が不要になる） */
  photoUrl: string | null;
};

type SelectedItem = { id: string; qty: number };

type WishOption = {
  position: number;
  groupId: string | null;
  goodsTypeId: string | null;
  /** false なら譲側 group/goods_type の変更に追従（auto-sync） */
  groupCustomized: boolean;
  goodsTypeCustomized: boolean;
  selected: SelectedItem[];
  logic: ListingLogic;
  exchangeType: ListingExchangeType;
  isCashOffer: boolean;
  cashAmount: number | null;
};

const MAX_OPTIONS = 5;

const EXCHANGE_OPTIONS: {
  value: ListingExchangeType;
  label: string;
  sub: string;
}[] = [
  { value: "any", label: "同異種", sub: "どちらでもOK" },
  { value: "same_kind", label: "同種のみ", sub: "同じ種別のみ" },
  { value: "cross_kind", label: "異種のみ", sub: "別の種別のみ" },
];

export function ListingNewForm({
  inventoryItems,
  wishItems,
  inventoryGroups,
  inventoryGoodsTypes,
  wishGroups,
  wishGoodsTypes,
  mode = "create",
  listingId,
  initialValues,
  preselectWishId,
}: {
  inventoryItems: InventoryOpt[];
  wishItems: WishOpt[];
  /** 譲側 dropdown：自分の在庫 (kind=for_trade) に登録のあるもののみ */
  inventoryGroups: { id: string; name: string }[];
  inventoryGoodsTypes: { id: string; name: string }[];
  /** 求側選択肢 dropdown：自分の wish (kind=wanted) に登録のあるもののみ */
  wishGroups: { id: string; name: string }[];
  wishGoodsTypes: { id: string; name: string }[];
  /** iter69-C：作成 or 編集 */
  mode?: "create" | "edit";
  /** edit モード時の対象 listing id */
  listingId?: string;
  /** edit モード時の初期値 */
  initialValues?: ListingFormInitialValues;
  /**
   * iter143：WISH 画面から「未紐付け wish を募集化」で飛んできた時のプリセット。
   * 求側選択肢 #1 にこの wish を選択済みでスタートする。
   * その wish の group/goodsType も合わせて prefill する。
   */
  preselectWishId?: string | null;
}) {
  // iter143：preselect wish を解決（initialValues 未指定 = 新規作成時のみ有効）
  const preselectWish =
    !initialValues && preselectWishId
      ? wishItems.find((w) => w.id === preselectWishId) ?? null
      : null;
  const router = useRouter();

  /* ─ 譲側 ─ */
  // iter143：preselectWish があれば、譲側 group/goodsType も wish と同じものをデフォルトにする
  //         （多くの場合、同 group・同種別で character 違いの交換になるため）
  const [haveGroupId, setHaveGroupId] = useState<string | null>(
    initialValues?.haveGroupId ?? preselectWish?.groupId ?? null,
  );
  const [haveGoodsTypeId, setHaveGoodsTypeId] = useState<string | null>(
    initialValues?.haveGoodsTypeId ?? preselectWish?.goodsTypeId ?? null,
  );
  // iter144: edit 時の初期値は、現在の在庫数を超えていたら clamp する
  //         （listing 作成後に在庫数が減っているケースのフェイルセーフ）
  const [selectedHaves, setSelectedHaves] = useState<SelectedItem[]>(
    (initialValues?.selectedHaves ?? []).map((s) => {
      const cap =
        inventoryItems.find((it) => it.id === s.id)?.availableQty ?? 1;
      return { ...s, qty: Math.min(Math.max(1, s.qty), cap) };
    }),
  );
  const [haveLogic, setHaveLogic] = useState<ListingLogic>(
    initialValues?.haveLogic ?? "and",
  );

  /* ─ 求側選択肢 ─ */
  const [options, setOptions] = useState<WishOption[]>(
    initialValues?.options.map((o) => ({
      position: o.position,
      groupId: o.groupId,
      goodsTypeId: o.goodsTypeId,
      // 編集時は user 入力済として customized=true 扱い
      groupCustomized: true,
      goodsTypeCustomized: true,
      selected: o.selected,
      logic: o.logic,
      exchangeType: o.exchangeType,
      isCashOffer: o.isCashOffer,
      cashAmount: o.cashAmount,
    })) ?? [
      // iter143：preselectWish があれば求側 #1 にプリセット
      preselectWish
        ? {
            position: 1,
            groupId: preselectWish.groupId,
            goodsTypeId: preselectWish.goodsTypeId,
            // user が wish 選択時にこの group/goodsType を選んだものとみなす
            groupCustomized: true,
            goodsTypeCustomized: true,
            selected: [{ id: preselectWish.id, qty: 1 }],
            logic: "or",
            exchangeType: "any",
            isCashOffer: false,
            cashAmount: null,
          }
        : {
            position: 1,
            groupId: null,
            goodsTypeId: null,
            groupCustomized: false,
            goodsTypeCustomized: false,
            selected: [],
            logic: "or",
            exchangeType: "any",
            isCashOffer: false,
            cashAmount: null,
          },
    ],
  );

  /* ─ メモ ─ */
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // iter144: 在庫上限超過などの一時的なお知らせ用 toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2400);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    router.prefetch("/listings");
  }, [router]);

  /** iter144: id の在庫数（見つからなければ 1 を返す） */
  function getAvailableQty(id: string): number {
    const it = inventoryItems.find((x) => x.id === id);
    return it?.availableQty ?? 1;
  }

  /* ─ 譲側のフィルタ済みインベントリ ─ */
  const filteredHaves = useMemo(() => {
    if (!haveGroupId || !haveGoodsTypeId) return [];
    return inventoryItems.filter(
      (it) => it.groupId === haveGroupId && it.goodsTypeId === haveGoodsTypeId,
    );
  }, [inventoryItems, haveGroupId, haveGoodsTypeId]);

  /**
   * 譲側 group 変更：
   * - 譲側選択リセット
   * - 求側オプションのうち、groupCustomized=false のものは新 group に追従 + selected リセット
   */
  function changeHaveGroup(id: string | null) {
    setHaveGroupId(id);
    setSelectedHaves([]);
    setOptions((prev) =>
      prev.map((o) => {
        if (o.groupCustomized || o.isCashOffer) return o;
        return { ...o, groupId: id, selected: [] };
      }),
    );
  }
  function changeHaveGoodsType(id: string | null) {
    setHaveGoodsTypeId(id);
    setSelectedHaves([]);
    setOptions((prev) =>
      prev.map((o) => {
        if (o.goodsTypeCustomized || o.isCashOffer) return o;
        return { ...o, goodsTypeId: id, selected: [] };
      }),
    );
  }

  /* ─ 操作 ─ */
  function toggleHave(id: string) {
    setSelectedHaves((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (existing) return prev.filter((s) => s.id !== id);
      // iter144: 在庫数 0 のものは選択不可（防御的、active inventory なら通常 ≥ 1）
      const cap = getAvailableQty(id);
      if (cap < 1) {
        showToast("このグッズは在庫がありません");
        return prev;
      }
      return [...prev, { id, qty: 1 }];
    });
  }
  function setHaveQty(id: string, delta: number) {
    // iter144: 譲側 qty は 1 〜 在庫数 の範囲で clamp。
    //         在庫数を超える操作は無視 + toast でお知らせ。
    const cap = getAvailableQty(id);
    setSelectedHaves((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = s.qty + delta;
        if (delta > 0 && next > cap) {
          showToast(`在庫数（${cap}）が上限です`);
          return { ...s, qty: cap };
        }
        return {
          ...s,
          qty: Math.max(1, Math.min(cap, next)),
        };
      }),
    );
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    setOptions((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        // デフォルトは譲るグッズで設定したもの。customized=false なので
        // 譲側 group/goods_type 変更時に追従する
        groupId: haveGroupId,
        goodsTypeId: haveGoodsTypeId,
        groupCustomized: false,
        goodsTypeCustomized: false,
        selected: [],
        logic: "or",
        exchangeType: "any",
        isCashOffer: false,
        cashAmount: null,
      },
    ]);
  }
  function removeOption(idx: number) {
    setOptions((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((o, i) => ({ ...o, position: i + 1 })),
    );
  }
  function patchOption(idx: number, patch: Partial<WishOption>) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function toggleOptionWish(idx: number, wishId: string) {
    setOptions((prev) =>
      prev.map((o, i) => {
        if (i !== idx) return o;
        const exists = o.selected.find((s) => s.id === wishId);
        return {
          ...o,
          selected: exists
            ? o.selected.filter((s) => s.id !== wishId)
            : [...o.selected, { id: wishId, qty: 1 }],
        };
      }),
    );
  }
  function setOptionWishQty(idx: number, wishId: string, delta: number) {
    setOptions((prev) =>
      prev.map((o, i) => {
        if (i !== idx) return o;
        return {
          ...o,
          selected: o.selected.map((s) =>
            s.id === wishId
              ? { ...s, qty: Math.max(1, Math.min(99, s.qty + delta)) }
              : s,
          ),
        };
      }),
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!haveGroupId || !haveGoodsTypeId) {
      setError("譲るグッズのグループと種別を選んでください");
      return;
    }
    if (selectedHaves.length === 0) {
      setError("譲るグッズを 1 件以上選んでください");
      return;
    }

    const optionsInput: ListingOptionInput[] = [];
    for (const o of options) {
      if (o.isCashOffer) {
        if (!o.cashAmount || o.cashAmount < 1) {
          setError(`選択肢 #${o.position}：金額を入力してください`);
          return;
        }
        optionsInput.push({
          position: o.position,
          wishIds: [],
          wishQtys: [],
          logic: o.logic,
          exchangeType: o.exchangeType,
          isCashOffer: true,
          cashAmount: o.cashAmount,
        });
      } else {
        if (!o.groupId || !o.goodsTypeId) {
          setError(
            `選択肢 #${o.position}：グループと種別を選んでください`,
          );
          return;
        }
        if (o.selected.length === 0) {
          setError(`選択肢 #${o.position}：wish を 1 件以上選んでください`);
          return;
        }
        optionsInput.push({
          position: o.position,
          wishIds: o.selected.map((s) => s.id),
          wishQtys: o.selected.map((s) => s.qty),
          logic: o.logic,
          exchangeType: o.exchangeType,
          isCashOffer: false,
        });
      }
    }

    setPending(true);
    const r =
      mode === "edit" && listingId
        ? await updateListingFull({
            id: listingId,
            haveIds: selectedHaves.map((s) => s.id),
            haveQtys: selectedHaves.map((s) => s.qty),
            haveLogic,
            options: optionsInput,
            note: note.trim() || undefined,
          })
        : await createListing({
            haveIds: selectedHaves.map((s) => s.id),
            haveQtys: selectedHaves.map((s) => s.qty),
            haveLogic,
            options: optionsInput,
            note: note.trim() || undefined,
          });
    if (r?.error) {
      setPending(false);
      setError(r.error);
      return;
    }
    router.push("/listings");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      {/* ─ 譲側 ─ */}
      <Section
        label="譲るグッズ"
        required
        hint={`${selectedHaves.length} 件選択中`}
      >
        <div className="mb-2 grid grid-cols-2 gap-2">
          <SelectField
            label="グループ"
            value={haveGroupId}
            options={inventoryGroups}
            onChange={changeHaveGroup}
          />
          <SelectField
            label="種別"
            value={haveGoodsTypeId}
            options={inventoryGoodsTypes}
            onChange={changeHaveGoodsType}
          />
        </div>

        {/* 同シリーズ注意書き：同種/異種判定の精度のため */}
        <div className="mb-2 rounded-[10px] bg-[#a695d80a] px-3 py-2 text-[10.5px] leading-snug text-[#3a324a]">
          ⚠️ 譲るグッズで <b>複数選ぶ場合は同じシリーズ</b>
          （同じツアー・同じアルバム等）に限定してください。シリーズが混在すると、
          求側の <b>同種 / 異種</b> 判定が曖昧になります。
        </div>

        {!haveGroupId || !haveGoodsTypeId ? (
          <Empty label="先にグループと種別を選んでください" />
        ) : filteredHaves.length === 0 ? (
          <Empty label="この組み合わせの譲がありません" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredHaves.map((it) => {
              const sel = selectedHaves.find((s) => s.id === it.id);
              return (
                <PanelCard
                  key={it.id}
                  item={it}
                  selected={!!sel}
                  qty={sel?.qty ?? 0}
                  onClick={() => toggleHave(it.id)}
                  onQty={(d) => setHaveQty(it.id, d)}
                />
              );
            })}
          </div>
        )}

        {selectedHaves.length > 1 && (
          <LogicToggle
            label="この複数の譲は…"
            value={haveLogic}
            onChange={setHaveLogic}
          />
        )}
      </Section>

      {/* ─ 求側選択肢 ─ */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
            求める — 選択肢{" "}
            <span className="text-red-500">*</span>{" "}
            <span className="text-[10px] text-gray-500">
              （複数なら相手がどれか1つ選択）
            </span>
          </span>
          <span className="text-[10px] text-gray-500">
            {options.length} / {MAX_OPTIONS}
          </span>
        </div>

        <div className="space-y-3">
          {options.map((opt, idx) => (
            <OptionEditor
              key={idx}
              option={opt}
              index={idx}
              groups={wishGroups}
              goodsTypes={wishGoodsTypes}
              wishItems={wishItems}
              onPatch={(patch) => patchOption(idx, patch)}
              onToggleWish={(wishId) => toggleOptionWish(idx, wishId)}
              onWishQty={(wishId, d) => setOptionWishQty(idx, wishId, d)}
              onRemove={
                options.length > 1 ? () => removeOption(idx) : undefined
              }
              defaultGroupId={haveGroupId}
              defaultGoodsTypeId={haveGoodsTypeId}
              parentHaveLogic={haveLogic}
              parentHaveCount={selectedHaves.length}
            />
          ))}
        </div>

        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={addOption}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#a695d855] bg-white py-2.5 text-[12px] font-bold text-[#a695d8] active:scale-[0.97]"
          >
            ＋ 選択肢を追加（{options.length} / {MAX_OPTIONS}）
          </button>
        )}
      </div>

      {/* ─ メモ ─ */}
      <Section label="メモ" hint={`${note.length} / 500`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例: 同会場で取引できる方優先"
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
        pendingLabel={mode === "edit" ? "更新中…" : "登録中…"}
      >
        {mode === "edit" ? "個別募集を更新" : "個別募集を作成"}
      </PrimaryButton>

      {/* iter144: 在庫上限超過などの一時的なお知らせ */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[100px] z-[100] flex justify-center px-4"
        >
          <div className="pointer-events-auto max-w-sm rounded-full bg-[#3a324a] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_8px_20px_rgba(58,50,74,0.35)]">
            {toast}
          </div>
        </div>
      )}
    </form>
  );
}

/* ─── option editor ─────────────────────────────── */

function OptionEditor({
  option,
  index,
  groups,
  goodsTypes,
  wishItems,
  onPatch,
  onToggleWish,
  onWishQty,
  onRemove,
  defaultGroupId,
  defaultGoodsTypeId,
  parentHaveLogic,
  parentHaveCount,
}: {
  option: WishOption;
  index: number;
  groups: { id: string; name: string }[];
  goodsTypes: { id: string; name: string }[];
  wishItems: WishOpt[];
  onPatch: (patch: Partial<WishOption>) => void;
  onToggleWish: (wishId: string) => void;
  onWishQty: (wishId: string, delta: number) => void;
  onRemove?: () => void;
  defaultGroupId: string | null;
  defaultGoodsTypeId: string | null;
  parentHaveLogic: ListingLogic;
  parentHaveCount: number;
}) {
  const filteredWishes = useMemo(() => {
    if (option.isCashOffer || !option.groupId || !option.goodsTypeId) return [];
    return wishItems.filter(
      (w) => w.groupId === option.groupId && w.goodsTypeId === option.goodsTypeId,
    );
  }, [wishItems, option.groupId, option.goodsTypeId, option.isCashOffer]);

  // iter145: 選択中 wish が全て画像ありか？
  //   全部画像あり → exchangeType セレクター非表示 + "any" に reset
  //   1 つでも画像なし or 未選択 → 通常の選択肢を表示
  const allSelectedHaveImages = useMemo(() => {
    if (option.isCashOffer) return false;
    if (option.selected.length === 0) return false;
    return option.selected.every((s) => {
      const w = wishItems.find((x) => x.id === s.id);
      return !!w?.photoUrl;
    });
  }, [option.selected, option.isCashOffer, wishItems]);

  // iter145: 全画像になった瞬間に exchangeType を "any" に reset
  //         （非表示中は値を意識しないで済むため）
  useEffect(() => {
    if (allSelectedHaveImages && option.exchangeType !== "any") {
      onPatch({ exchangeType: "any" });
    }
    // option.exchangeType を deps に入れると無限ループ気味になるので意図的に外す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSelectedHaveImages]);

  const orOrViolation =
    !option.isCashOffer &&
    parentHaveLogic === "or" &&
    option.logic === "or" &&
    parentHaveCount > 1 &&
    option.selected.length > 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#a695d855] bg-white">
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="rounded-full bg-[#a695d8] px-2 py-[2px] text-[10px] font-extrabold text-white">
          選択肢 #{index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() =>
            onPatch({
              isCashOffer: !option.isCashOffer,
              groupId: option.isCashOffer ? defaultGroupId : null,
              goodsTypeId: option.isCashOffer ? defaultGoodsTypeId : null,
              selected: [],
              cashAmount: option.isCashOffer ? null : 1000,
            })
          }
          className={`rounded-full px-2.5 py-[3px] text-[10px] font-bold ${
            option.isCashOffer
              ? "bg-[#a695d8] text-white"
              : "border border-[#a695d855] bg-white text-[#a695d8]"
          }`}
        >
          💴 定価交換
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] text-red-500"
          >
            削除
          </button>
        )}
      </div>

      <div className="space-y-3 p-3">
        {option.isCashOffer ? (
          <CashOfferEditor
            amount={option.cashAmount ?? 1000}
            onChange={(amt) => onPatch({ cashAmount: amt })}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="グループ"
                value={option.groupId}
                options={groups}
                onChange={(v) =>
                  // ユーザーが手動で変更 → groupCustomized=true で固定（譲側追従しない）
                  onPatch({
                    groupId: v,
                    groupCustomized: true,
                    selected: [],
                  })
                }
              />
              <SelectField
                label="種別"
                value={option.goodsTypeId}
                options={goodsTypes}
                onChange={(v) =>
                  onPatch({
                    goodsTypeId: v,
                    goodsTypeCustomized: true,
                    selected: [],
                  })
                }
              />
            </div>

            {/* iter145: 交換タイプ — 選択中 wish が全て画像ありなら非表示
                （画像で wish が一意に特定できるため、同種/異種 の指定は不要） */}
            {option.selected.length > 0 && allSelectedHaveImages ? (
              <div className="rounded-[10px] bg-[#a695d80a] px-3 py-2 text-[10.5px] leading-snug text-[#3a324a8c]">
                ✓ 画像のある wish のみ選択中。同種 / 異種 の指定は不要です。
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2 px-0.5">
                  <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
                    交換タイプ
                  </span>
                  {option.selected.length > 0 && (
                    <span className="text-[9.5px] text-[#3a324a8c]">
                      ⚠️ 画像なしの wish があるため指定が必要
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXCHANGE_OPTIONS.map((opt) => {
                    const active = option.exchangeType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onPatch({ exchangeType: opt.value })}
                        className={`flex flex-col items-center justify-center rounded-lg px-1.5 py-1.5 text-center transition-all ${
                          active
                            ? "bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.33)]"
                            : "border border-[#3a324a14] bg-white text-gray-700"
                        }`}
                      >
                        <span className="text-[11.5px] font-bold">
                          {opt.label}
                        </span>
                        <span
                          className={`text-[9px] ${active ? "text-white/80" : "text-gray-500"}`}
                        >
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* iter145: 求める wish 選択（画像付き mini panel） */}
            {!option.groupId || !option.goodsTypeId ? (
              <Empty label="先にグループと種別を選んでください" />
            ) : filteredWishes.length === 0 ? (
              <Empty label="この組み合わせの wish がありません" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filteredWishes.map((w) => {
                  const sel = option.selected.find((s) => s.id === w.id);
                  return (
                    <WishMiniPanel
                      key={w.id}
                      item={w}
                      selected={!!sel}
                      qty={sel?.qty ?? 0}
                      onClick={() => onToggleWish(w.id)}
                      onQty={(d) => onWishQty(w.id, d)}
                    />
                  );
                })}
              </div>
            )}

            {option.selected.length > 1 && (
              <LogicToggle
                label="この複数の wish は…"
                value={option.logic}
                onChange={(v) => onPatch({ logic: v })}
              />
            )}

            {orOrViolation && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-700">
                ⚠️ 譲側 OR × この選択肢 OR × 両側 ≥2 アイテム は曖昧なため指定できません。
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CashOfferEditor({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 px-0.5 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        希望金額（円）
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[16px] font-bold text-[#3a324a8c]">¥</span>
        <input
          type="number"
          min={1}
          max={9999999}
          value={amount}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          className="block w-full rounded-xl border border-[#3a324a14] bg-white px-4 py-2.5 text-base font-bold tabular-nums text-gray-900 focus:border-[#a695d8] focus:outline-none"
        />
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-gray-500">
        この選択肢では譲るグッズを「定価交換」（金銭授受）で取引します。マッチング演算には参加しません。
      </p>
    </div>
  );
}

/* ─── shared sub-components ─────────────────────── */

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { id: string; name: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-1 px-0.5 text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
        {label}
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="block w-full rounded-xl border border-[#3a324a14] bg-white px-3 py-2.5 text-[13px] text-gray-900 focus:border-[#a695d8] focus:outline-none"
      >
        <option value="">選択</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#3a324a14] bg-[#fbf9fc] p-3 text-center text-[11px] text-gray-500">
      {label}
    </div>
  );
}

function LogicToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ListingLogic;
  onChange: (v: ListingLogic) => void;
}) {
  return (
    <div className="rounded-xl border border-[#3a324a14] bg-[#fbf9fc] p-2">
      <div className="mb-1.5 px-1 text-[10.5px] font-bold text-[#3a324a8c]">
        {label}
      </div>
      <div className="flex gap-1">
        {(
          [
            { v: "and" as const, label: "全部 (AND)", sub: "セット" },
            { v: "or" as const, label: "いずれか (OR)", sub: "どれか1つ" },
          ]
        ).map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-center transition-all ${
                active
                  ? "bg-[#a695d8] text-white shadow-[0_2px_6px_rgba(166,149,216,0.33)]"
                  : "bg-white text-gray-700"
              }`}
            >
              <div
                className={`text-[11.5px] ${active ? "font-extrabold" : "font-bold"}`}
              >
                {opt.label}
              </div>
              <div
                className={`mt-0.5 text-[9px] ${active ? "text-white/80" : "text-gray-500"}`}
              >
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PanelCard({
  item,
  selected,
  qty,
  onClick,
  onQty,
}: {
  item: InventoryOpt;
  selected: boolean;
  qty: number;
  onClick: () => void;
  onQty: (delta: number) => void;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 88%) 0 6px, hsl(${item.hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${item.hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${item.hue}, 30%, 30%, 0.4)`;
  const memberName = item.characterName ?? item.groupName ?? item.title;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-[0_2px_6px_rgba(58,50,74,0.08)] transition-all ${
        selected
          ? "border-[2px] border-[#a695d8] shadow-[0_6px_16px_rgba(166,149,216,0.45)]"
          : "border-[#3a324a14]"
      }`}
      style={{
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-0 active:scale-[0.97]"
        aria-label={selected ? "選択解除" : "選択"}
      />
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-10">
        <div
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {memberName}
        </div>
      </div>
      {selected ? (
        <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded-full bg-white/95 p-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            disabled={qty <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onQty(-1);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a695d8] text-[12px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            −
          </button>
          <span className="min-w-[22px] text-center text-[10.5px] font-extrabold tabular-nums">
            ×{qty}
            {/* iter144: 在庫上限を inline で参考表示 */}
            <span className="ml-0.5 text-[8.5px] font-bold text-gray-400">
              /{item.availableQty}
            </span>
          </span>
          {/* iter144: 在庫数で disabled だと toast が発火しないので、
              click は許可して setHaveQty 側で clamp + toast */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQty(1);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a695d8] text-[12px] font-bold text-white"
          >
            ＋
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-white bg-white/55 text-[#a695d8] shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          ＋
        </div>
      )}
      {!hasPhoto && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[28px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {memberName[0]}
        </div>
      )}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-1"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="truncate text-[10px] font-bold text-gray-900">
          {item.goodsTypeName ?? "?"}
        </div>
      </div>
    </div>
  );
}

/**
 * iter145：求める wish 選択用の mini panel（譲側 PanelCard の小型版）。
 * - 画像があれば写真フルブリード、なければ hue 縞 + イニシャル
 * - 同 character の wish が複数あっても画像で区別できる
 * - 選択時：紫枠 + 上端に ×qty + −/+ ボタン
 */
function WishMiniPanel({
  item,
  selected,
  qty,
  onClick,
  onQty,
}: {
  item: WishOpt;
  selected: boolean;
  qty: number;
  onClick: () => void;
  onQty: (delta: number) => void;
}) {
  const name = item.characterName ?? item.groupName ?? item.title;
  // メンバー名 → hue ハッシュ（ItemCard / PanelCard と同方式）
  const hue = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  }, [name]);
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${hue}, 28%, 88%) 0 6px, hsl(${hue}, 28%, 82%) 6px 11px)`;
  const memberLabelColor = `hsl(${hue}, 35%, 28%)`;
  const initialShadow = `0 2px 6px hsla(${hue}, 30%, 30%, 0.4)`;
  const hasPhoto = !!item.photoUrl;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-[0_2px_6px_rgba(58,50,74,0.08)] transition-all ${
        selected
          ? "border-[2px] border-[#a695d8] shadow-[0_6px_16px_rgba(166,149,216,0.45)]"
          : "border-[#3a324a14]"
      }`}
      style={{
        width: 80,
        aspectRatio: "3 / 4",
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-0 active:scale-[0.97]"
        aria-label={selected ? "選択解除" : "選択"}
      />
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {/* 上部左：character / group ラベル */}
      <div className="pointer-events-none absolute left-1 top-1 z-10">
        <div
          className={`max-w-[60px] truncate rounded-md px-1 py-[1px] text-[8.5px] font-bold ${
            hasPhoto ? "bg-black/55 text-white backdrop-blur-sm" : "bg-white/85"
          }`}
          style={hasPhoto ? undefined : { color: memberLabelColor }}
        >
          {name}
        </div>
      </div>
      {/* 中央：イニシャル（写真なしのみ） */}
      {!hasPhoto && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[22px] font-extrabold text-white/90"
          style={{ textShadow: initialShadow }}
        >
          {name[0]}
        </div>
      )}
      {/* 上部右：選択時 qty コントロール / 未選択時 + マーク */}
      {selected ? (
        <div className="absolute right-1 top-1 z-20 flex items-center gap-0.5 rounded-full bg-white/95 p-0.5 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            disabled={qty <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onQty(-1);
            }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[#a695d8] text-[10px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            −
          </button>
          <span className="min-w-[16px] text-center text-[9.5px] font-extrabold tabular-nums">
            ×{qty}
          </span>
          <button
            type="button"
            disabled={qty >= 99}
            onClick={(e) => {
              e.stopPropagation();
              onQty(1);
            }}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[#a695d8] text-[10px] font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            ＋
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-white/55 text-[#a695d8] shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          <span className="text-[10px] font-bold">＋</span>
        </div>
      )}
      {/* 下部ストリップ：goods_type 名 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 px-1 pb-1 pt-0.5"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.95))",
        }}
      >
        <div className="truncate text-[9px] font-bold leading-tight text-gray-900">
          {item.goodsTypeName ?? "?"}
        </div>
      </div>
    </div>
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
