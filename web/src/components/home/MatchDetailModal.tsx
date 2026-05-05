"use client";

/**
 * 個別募集（listings）経由マッチの **関係図モーダル**。
 *
 * iter108: ツリー型に再設計。
 *
 * 構造：
 *   listing #N
 *   ├ 譲（あなたの / 相手の） : [photo]
 *   ├ wish a (×qty)
 *   │  └ 候補：[photo][photo][photo]+ ← タップで選択
 *   └ wish b (×qty)
 *      └ 候補：[photo][photo]
 *
 *   選択肢（option）の AND/OR 構造は内部的に残るが、UI ではフラットに
 *   wish ごとに候補を並べる。ユーザーは「写真を見て、これを受け取る／出す」を
 *   候補単位で選ぶ。
 *
 *   選択した候補は /propose/[partnerId]?listing=L&candidates=id1,id2 に渡す
 *   （propose page.tsx 側で candidates の prefill を実装する）
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MatchCardListingInfo,
  MatchCardOption,
  MiniItem,
} from "./MatchCard";

const HAVE_THUMB = 56;
const CAND_THUMB = 56;

/**
 * 選択状態（iter109: 複数 listing 跨ぎに対応）
 *   listingId → 選択された候補 inv id の Set
 */
type Selection = Map<string, Set<string>>;

/**
 * iter112: ポップアップ表示中の wish ターゲット情報
 */
type PopupTarget = {
  listingId: string;
  viewpoint: "mine" | "partner";
  wishItem: MiniItem;
  wishQty: number;
  candidates: { item: MiniItem; qty: number }[];
  exchangeType: "same_kind" | "cross_kind" | "any";
  /** wish 画像が無いときの fallback：listing.haves の最初の photo */
  fallbackHavePhoto: string | null;
  /** fallback 用：listing.haves の最初の item label（ラベル表示用） */
  fallbackHaveLabel: string;
};

export function MatchDetailModal({
  partnerHandle,
  partnerId,
  partnerAvatarUrl,
  myAvatarUrl,
  myListings,
  partnerListings,
  myInventoryQty,
  simpleReceives,
  simpleGives,
  simpleProposeHref,
  onClose,
}: {
  partnerHandle: string;
  partnerId: string;
  /** iter125: モーダル内ミニアバター用 */
  partnerAvatarUrl: string | null;
  myAvatarUrl: string | null;
  myListings: MatchCardListingInfo[];
  partnerListings: MatchCardListingInfo[];
  /** iter111: 自分の inventory id → 在庫数（quantity）の Map。capacity 超過判定用 */
  myInventoryQty: Record<string, number>;
  /** iter152: 個別募集なしの通常マッチで、あなたが受け取れそうな相手の譲 */
  simpleReceives?: MiniItem[];
  /** iter152: 個別募集なしの通常マッチで、あなたが譲れそうな自分の譲 */
  simpleGives?: MiniItem[];
  /** iter152: 通常マッチの打診先 */
  simpleProposeHref?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [selection, setSelection] = useState<Selection>(new Map());
  /** iter111: 在庫超過警告トースト */
  const [toast, setToast] = useState<{ message: string; key: number } | null>(
    null,
  );
  /** iter112: wish 詳細ポップアップ */
  const [popupTarget, setPopupTarget] = useState<PopupTarget | null>(null);
  /** iter120: 個別募集の条件不一致 確認ダイアログ */
  const [validationAlert, setValidationAlert] = useState<
    { listingLabel: string; reasons: string[] }[] | null
  >(null);
  const router = useRouter();
  const simpleReceiveItems = simpleReceives ?? [];
  const simpleGiveItems = simpleGives ?? [];
  const hasListingRelation = myListings.length > 0 || partnerListings.length > 0;
  const hasSimpleRelation =
    !hasListingRelation &&
    (simpleReceiveItems.length > 0 || simpleGiveItems.length > 0);

  /**
   * iter121: OR 条件の haves でどれを選ぶか（listingId → 選択中 inv id Set）
   * - haveLogic === "or" + haves >= 2 の listing のみ key として登場
   * - 初期値：最初の matched have（無ければ haves[0]）を 1 件選択
   */
  const [selectedHavesByListing, setSelectedHavesByListing] = useState<
    Map<string, Set<string>>
  >(() => {
    const m = new Map<string, Set<string>>();
    for (const l of [...myListings, ...partnerListings]) {
      if (l.haveLogic === "or" && l.haves.length >= 2) {
        const first = l.haves.find((h) => h.matched) ?? l.haves[0];
        if (first) m.set(l.listingId, new Set([first.item.id]));
      }
    }
    return m;
  });

  function isHaveSelected(listingId: string, haveInvId: string): boolean {
    return selectedHavesByListing.get(listingId)?.has(haveInvId) ?? false;
  }

  function toggleHave(listingId: string, haveInvId: string) {
    setSelectedHavesByListing((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(listingId) ?? []);
      if (set.has(haveInvId)) set.delete(haveInvId);
      else set.add(haveInvId);
      next.set(listingId, set);
      return next;
    });
  }

  /**
   * 各 listing の「実際に対象になる haves」を返す。
   * - AND or 単一：全 haves
   * - OR with >=2：選択中の haves のみ
   */
  const getEffectiveHaves = useCallback((listing: MatchCardListingInfo) => {
    if (listing.haveLogic === "or" && listing.haves.length >= 2) {
      const sel = selectedHavesByListing.get(listing.listingId);
      if (!sel || sel.size === 0) return [];
      return listing.haves.filter((h) => sel.has(h.item.id));
    }
    return listing.haves;
  }, [selectedHavesByListing]);

  /**
   * iter111: 在庫超過判定
   *
   * - 自分の listing が選択中 → listing.haves（私の inv）を qty 分出す必要
   * - 相手の listing で候補（私の inv）が選択中 → 各候補 1 個出す
   * - 同じ inv id が複数の選択ソースで重なると、合計が myInventoryQty[id] を
   *   超える可能性 → toast で警告
   *
   * 戻り値：超過している inv id と「必要数 vs 在庫数」のリスト
   */
  function computeOvercapacity(sel: Selection): {
    invId: string;
    needed: number;
    inStock: number;
  }[] {
    const allListings = [...myListings, ...partnerListings];
    const listingById = new Map(allListings.map((l) => [l.listingId, l] as const));
    const giveQtyById = new Map<string, number>();

    for (const [listingId, candidateIds] of sel) {
      const listing = listingById.get(listingId);
      if (!listing) continue;
      if (listing.isMyListing) {
        // 私の listing → 効果的な haves（OR 選択を反映）の qty 分出す
        for (const h of getEffectiveHaves(listing)) {
          giveQtyById.set(
            h.item.id,
            (giveQtyById.get(h.item.id) ?? 0) + h.qty,
          );
        }
      } else {
        // 相手の listing → 候補（私の inv）を 1 個ずつ出す
        for (const cid of candidateIds) {
          giveQtyById.set(cid, (giveQtyById.get(cid) ?? 0) + 1);
        }
      }
    }

    const over: { invId: string; needed: number; inStock: number }[] = [];
    for (const [invId, needed] of giveQtyById) {
      const inStock = myInventoryQty[invId] ?? 0;
      if (needed > inStock) {
        over.push({ invId, needed, inStock });
      }
    }
    return over;
  }

  /**
   * candidate タップ：listing ごとに独立して toggle
   *
   * iter111.1: 追加時のみ capacity check。超過するなら追加を拒否して toast 表示。
   * 解除（deselect）は常に許可（在庫を圧迫しないため）。
   */
  function toggleCandidate(listingId: string, candidateInvId: string) {
    const current = selection.get(listingId) ?? new Set<string>();
    const isAdding = !current.has(candidateInvId);

    if (isAdding) {
      // 仮に追加した状態を作って capacity を試算
      const trial = new Map(selection);
      const updated = new Set(current);
      updated.add(candidateInvId);
      trial.set(listingId, updated);

      const over = computeOvercapacity(trial);
      if (over.length > 0) {
        // 追加を拒否、toast で通知
        const lines = over.map(
          (o) => `（必要 ${o.needed}・在庫 ${o.inStock}）`,
        );
        setToast({
          message: `在庫が足りません ${lines.join(" ")}`,
          key: Date.now(),
        });
        return; // selection は変更しない
      }

      setSelection(trial);
    } else {
      // 解除：capacity は気にしない
      setSelection((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(listingId) ?? []);
        set.delete(candidateInvId);
        if (set.size === 0) next.delete(listingId);
        else next.set(listingId, set);
        return next;
      });
    }
  }

  function isSelected(listingId: string, candidateInvId: string): boolean {
    return selection.get(listingId)?.has(candidateInvId) ?? false;
  }

  const totalSelected = useMemo(() => {
    let n = 0;
    for (const set of selection.values()) n += set.size;
    return n;
  }, [selection]);

  /**
   * iter109: 複数 listing 跨ぎの aggregated 打診を生成
   *
   * - selection に登場する listing ごとに：
   *   - my listing → gives += listing.haves（私の inv） / receives += 候補（相手の inv）
   *   - partner listing → gives += 候補（私の inv） / receives += listing.haves（相手の inv）
   * - 全部 union（dedupe）して、/propose に gives / receives を渡す
   * - propose page.tsx は新形式 ?gives=...&receives=... を解釈する
   */
  /**
   * iter118: 全 listing 横断の集計（サマリー表示と URL 生成の両方で使う）
   *   gives / receives = 重複排除した MiniItem 配列（表示用）
   */
  const aggregated = useMemo(() => {
    if (totalSelected === 0) {
      return {
        givesItems: [] as MiniItem[],
        receivesItems: [] as MiniItem[],
        giveIds: [] as string[],
        receiveIds: [] as string[],
        referencedListingIds: [] as string[],
      };
    }
    const allListings = [...myListings, ...partnerListings];
    const listingById = new Map(
      allListings.map((l) => [l.listingId, l] as const),
    );
    // inv id → MiniItem の lookup（候補の item は wishes[].candidates にあるので集める）
    const candidateItemById = new Map<string, MiniItem>();
    for (const l of allListings) {
      for (const opt of l.options) {
        for (const w of opt.wishes) {
          for (const c of w.candidates) {
            candidateItemById.set(c.item.id, c.item);
          }
        }
      }
    }

    const giveIdSet = new Set<string>();
    const receiveIdSet = new Set<string>();
    const givesItems: MiniItem[] = [];
    const receivesItems: MiniItem[] = [];
    const referencedListings = new Set<string>();

    function addUniq(arr: MiniItem[], set: Set<string>, item: MiniItem) {
      if (!set.has(item.id)) {
        set.add(item.id);
        arr.push(item);
      }
    }

    for (const [listingId, candidateIds] of selection) {
      const listing = listingById.get(listingId);
      if (!listing) continue;
      referencedListings.add(listingId);

      // iter121: OR 選択を反映した effective haves を使う
      const effectiveHaves = getEffectiveHaves(listing);
      if (listing.isMyListing) {
        // 私の listing：effective haves（私の inv）を出す + 候補（相手の inv）を受け取る
        for (const h of effectiveHaves) addUniq(givesItems, giveIdSet, h.item);
        for (const cid of candidateIds) {
          const item = candidateItemById.get(cid);
          if (item) addUniq(receivesItems, receiveIdSet, item);
        }
      } else {
        // 相手の listing：候補（私の inv）を出す + effective haves（相手の inv）を受け取る
        for (const cid of candidateIds) {
          const item = candidateItemById.get(cid);
          if (item) addUniq(givesItems, giveIdSet, item);
        }
        for (const h of effectiveHaves) addUniq(receivesItems, receiveIdSet, h.item);
      }
    }

    return {
      givesItems,
      receivesItems,
      giveIds: [...giveIdSet],
      receiveIds: [...receiveIdSet],
      referencedListingIds: [...referencedListings],
    };
  }, [
    selection,
    totalSelected,
    myListings,
    partnerListings,
    getEffectiveHaves,
  ]);

  const proposeHref = useMemo(() => {
    if (totalSelected === 0) return null;
    const params = new URLSearchParams();
    if (aggregated.giveIds.length > 0)
      params.set("gives", aggregated.giveIds.join(","));
    if (aggregated.receiveIds.length > 0)
      params.set("receives", aggregated.receiveIds.join(","));
    if (aggregated.referencedListingIds.length > 0)
      params.set("listings", aggregated.referencedListingIds.join(","));
    return `/propose/${partnerId}?${params.toString()}`;
  }, [
    aggregated.giveIds,
    aggregated.receiveIds,
    aggregated.referencedListingIds,
    totalSelected,
    partnerId,
  ]);

  /**
   * iter120: 個別募集の条件チェック
   *
   * - listing が「選択に含まれている」 = selection の key に listingId がある
   * - その listing 内のいずれかの option が「満たされている」必要
   *   - AND option: 全 wish に対して、選択中の inv id が候補に含まれている
   *   - OR / 単一 wish option: いずれか 1 つの wish が満たされている
   * - 全 option が未満足 → アラート対象
   */
  function validateSelection(): { listingLabel: string; reasons: string[] }[] {
    const issues: { listingLabel: string; reasons: string[] }[] = [];
    const allListings = [...myListings, ...partnerListings];
    const listingById = new Map(
      allListings.map((l) => [l.listingId, l] as const),
    );

    for (const [listingId, candidateIds] of selection) {
      const listing = listingById.get(listingId);
      if (!listing) continue;
      const isMine = listing.isMyListing;
      const idx = (isMine ? myListings : partnerListings).findIndex(
        (l) => l.listingId === listingId,
      );
      const listingLabel = isMine
        ? `あなたの個別募集 #${idx + 1}`
        : `@${partnerHandle} の個別募集 #${idx + 1}`;

      const reasons: string[] = [];

      // iter121: OR 譲の選択チェック
      if (listing.haveLogic === "or" && listing.haves.length >= 2) {
        const haveSel = selectedHavesByListing.get(listingId);
        if (!haveSel || haveSel.size === 0) {
          reasons.push(
            isMine
              ? "OR 譲：どれを譲るか未選択"
              : "OR 譲：どれを受け取るか未選択",
          );
        }
      }

      // 既存：option 満足チェック（AND / OR / 単一）
      let anySatisfied = false;
      const reasonCandidates: string[] = [];

      for (const opt of listing.options) {
        if (opt.isCashOffer) continue;

        if (opt.logic === "and" && opt.wishes.length > 1) {
          // AND：全 wish が候補選択でカバーされている必要
          const missing = opt.wishes.filter(
            (w) => !w.candidates.some((c) => candidateIds.has(c.item.id)),
          );
          if (missing.length === 0) {
            anySatisfied = true;
            break;
          }
          reasonCandidates.push(
            `#${opt.position} (セット AND)：${missing.map((w) => w.item.label).join("・")} の候補が未選択`,
          );
        } else {
          // OR / 単一：いずれか 1 つの wish に候補があれば OK
          const hasOne = opt.wishes.some((w) =>
            w.candidates.some((c) => candidateIds.has(c.item.id)),
          );
          if (hasOne) {
            anySatisfied = true;
            break;
          }
          reasonCandidates.push(
            `#${opt.position}：いずれの wish にも候補が未選択`,
          );
        }
      }

      if (!anySatisfied && reasonCandidates.length > 0) {
        reasons.push(...reasonCandidates);
      }

      if (reasons.length > 0) {
        issues.push({ listingLabel, reasons });
      }
    }

    return issues;
  }

  /** 「打診に進む」クリック：validation → OK なら遷移、NG なら確認ポップアップ */
  function handleProposeClick(skipValidation = false) {
    if (!proposeHref) return;
    if (!skipValidation) {
      const issues = validateSelection();
      if (issues.length > 0) {
        setValidationAlert(issues);
        return;
      }
    }
    onClose();
    router.push(proposeHref);
  }

  function handleSimpleProposeClick() {
    if (!simpleProposeHref) return;
    onClose();
    router.push(simpleProposeHref);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fbf9fc]">
      <header className="flex items-center gap-3 border-b border-[#3a324a14] bg-white/95 px-[18px] pt-12 pb-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#3a324a14] bg-white text-[18px] font-bold text-[#3a324a8c]"
        >
          ✕
        </button>
        <div className="flex-1">
          <div className="text-[15px] font-bold text-[#3a324a]">
            関係図
          </div>
          <div className="mt-0.5 text-[11px] text-[#3a324a8c]">
            @{partnerHandle} とのマッチ詳細
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] py-4">
        <div className="mb-3 rounded-[10px] bg-[#a695d810] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3a324a]">
          <span className="mr-1.5 inline-block rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            🔗 関係図
          </span>
          {hasSimpleRelation ? (
            <>
              譲 × wish で成立しそうな候補です。内容を確認して打診へ進めます。
            </>
          ) : (
            <>
              各 wish の候補を<b>写真で確認</b>して、受け取りたい / 出せるものを
              タップで選択。下の「打診に進む」で確認画面に進みます。
            </>
          )}
        </div>

        {myListings.length > 0 && (
          <SectionGroup
            title="あなたの個別募集"
            subtitle="あなたが出している条件で、相手の在庫がヒット"
            accentColor="#a695d8"
          >
            {myListings.map((l, idx) => (
              <ListingTree
                key={l.listingId}
                listing={l}
                index={idx}
                viewpoint="mine"
                partnerHandle={partnerHandle}
                partnerAvatarUrl={partnerAvatarUrl}
                myAvatarUrl={myAvatarUrl}
                isSelected={(cid) => isSelected(l.listingId, cid)}
                isHaveSelected={isHaveSelected}
                onToggleHave={toggleHave}
                onOpenPopup={(target) => setPopupTarget(target)}
              />
            ))}
          </SectionGroup>
        )}

        {partnerListings.length > 0 && (
          <SectionGroup
            title={`@${partnerHandle} の個別募集`}
            subtitle="相手が出している条件で、あなたの在庫がヒット"
            accentColor="#f3c5d4"
          >
            {partnerListings.map((l, idx) => (
              <ListingTree
                key={l.listingId}
                listing={l}
                index={idx}
                viewpoint="partner"
                partnerHandle={partnerHandle}
                partnerAvatarUrl={partnerAvatarUrl}
                myAvatarUrl={myAvatarUrl}
                isSelected={(cid) => isSelected(l.listingId, cid)}
                isHaveSelected={isHaveSelected}
                onToggleHave={toggleHave}
                onOpenPopup={(target) => setPopupTarget(target)}
              />
            ))}
          </SectionGroup>
        )}

        {!hasListingRelation && (
          hasSimpleRelation ? (
            <SimpleRelationPanel
              partnerHandle={partnerHandle}
              receivesItems={simpleReceiveItems}
              givesItems={simpleGiveItems}
            />
          ) : (
            <div className="rounded-[10px] border border-dashed border-[#3a324a14] bg-white p-4 text-center text-[12px] text-[#3a324a8c]">
              個別募集経由のマッチはありません
            </div>
          )
        )}

        {/* iter118: 全 listing 横断の結論サマリー（一番下） */}
        {totalSelected > 0 && (
          <GlobalSummary
            givesItems={aggregated.givesItems}
            receivesItems={aggregated.receivesItems}
          />
        )}
      </div>

      {/* フッター（1 件以上選択時のみ） */}
      {totalSelected > 0 && proposeHref && (
        <div className="border-t border-[#3a324a14] bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-[18px] pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <button
              type="button"
              onClick={() => setSelection(new Map())}
              className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-2.5 text-[11px] font-bold text-[#3a324a8c]"
            >
              リセット
            </button>
            <button
              type="button"
              onClick={() => handleProposeClick(false)}
              className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-3 text-center text-[13.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.98]"
            >
              打診に進む（{totalSelected} 件）→
            </button>
          </div>
        </div>
      )}

      {hasSimpleRelation && simpleProposeHref && (
        <div className="border-t border-[#3a324a14] bg-white/96 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-[18px] pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[10px] border border-[#3a324a14] bg-white px-3 py-2.5 text-[11px] font-bold text-[#3a324a8c]"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={handleSimpleProposeClick}
              className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-3 text-center text-[13.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.98]"
            >
              この内容で打診へ →
            </button>
          </div>
        </div>
      )}

      {/* iter111: 在庫超過トースト */}
      {toast && <CapacityToast key={toast.key} message={toast.message} />}

      {/* iter120: 個別募集の条件不一致 確認ダイアログ */}
      {validationAlert && (
        <ValidationAlert
          issues={validationAlert}
          onCancel={() => setValidationAlert(null)}
          onProceed={() => {
            setValidationAlert(null);
            handleProposeClick(true);
          }}
        />
      )}

      {/* iter112: wish 詳細ポップアップ */}
      {popupTarget && (
        <WishPopup
          target={popupTarget}
          partnerHandle={partnerHandle}
          partnerAvatarUrl={partnerAvatarUrl}
          myAvatarUrl={myAvatarUrl}
          isSelected={(cid) => isSelected(popupTarget.listingId, cid)}
          onToggleCandidate={(cid) =>
            toggleCandidate(popupTarget.listingId, cid)
          }
          onClose={() => setPopupTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── iter112: wish 詳細ポップアップ ───
   左：wish 画像（または fallback：listing.have 写真 + 同種/異種/同異種 chip）
   右：候補グリッド（タップで toggle、選択即反映）
   フッター：閉じるボタンのみ（タップごとに即反映するため適用ボタンは無し） */

function WishPopup({
  target,
  partnerHandle,
  partnerAvatarUrl,
  myAvatarUrl,
  isSelected,
  onToggleCandidate,
  onClose,
}: {
  target: PopupTarget;
  partnerHandle: string;
  partnerAvatarUrl: string | null;
  myAvatarUrl: string | null;
  isSelected: (candidateInvId: string) => boolean;
  onToggleCandidate: (candidateInvId: string) => void;
  onClose: () => void;
}) {
  const hasWishPhoto = !!target.wishItem.photoUrl;
  // iter115: 候補側オーナーのアイコン + 「{owner} が譲るもの」ラベル
  //   mine listing: 候補は相手の inv ⇒ "@partnerHandle が譲るもの"
  //   partner listing: 候補は自分の inv ⇒ "あなた が譲るもの"
  const candidateOwnerName =
    target.viewpoint === "mine" ? `@${partnerHandle}` : "あなた";
  const candidateOwnerColor =
    target.viewpoint === "mine" ? "#f3c5d4" : "#a695d8";
  const candidateOwnerAvatarUrl =
    target.viewpoint === "mine" ? partnerAvatarUrl : myAvatarUrl;
  // iter124: selectedCount は撤廃（選択中サムネで十分視覚化）

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[20px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.25)] sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2.5">
          <span className="text-[12px]">🎯</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-extrabold text-[#3a324a]">
              {target.wishItem.label}
            </div>
            <div className="text-[10px] text-[#3a324a8c]">
              wish ×{target.wishQty}・{target.candidates.length} 件の候補
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3a324a08] text-[#3a324a8c]"
          >
            ✕
          </button>
        </div>

        {/* 本体：左 image / 右 候補 */}
        <div className="flex gap-3 p-3">
          {/* 左：wish 画像 or fallback */}
          <div className="flex w-[110px] flex-shrink-0 flex-col items-center">
            {hasWishPhoto ? (
              <>
                <ItemPhoto
                  item={target.wishItem}
                  qty={target.wishQty}
                  size={104}
                  variant="wish"
                />
                <span className="mt-1.5 rounded-full border border-[#f3c5d4] bg-[#f3c5d414] px-2 py-[2px] text-[9.5px] font-extrabold text-[#f3c5d4]">
                  wish 画像
                </span>
              </>
            ) : (
              <>
                <ItemPhoto
                  item={{
                    ...target.wishItem,
                    photoUrl: target.fallbackHavePhoto,
                  }}
                  qty={1}
                  size={104}
                  variant="have"
                />
                <span
                  className="mt-1.5 rounded-full px-2 py-[2px] text-[9.5px] font-extrabold text-white shadow-[0_1px_3px_rgba(58,50,74,0.2)]"
                  style={exchangeChipStyle(target.exchangeType)}
                >
                  {EXCHANGE_LABEL_FULL[target.exchangeType]}
                </span>
                <span className="mt-1 max-w-[110px] truncate px-1 text-center text-[9px] text-[#3a324a8c]">
                  ↑ あなたの譲：{target.fallbackHaveLabel}
                </span>
              </>
            )}
          </div>

          {/* 右：候補グリッド（iter115: アイコン + 「{owner} が譲るもの」） */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.4px]">
              <MiniAvatar
                name={candidateOwnerName}
                color={candidateOwnerColor}
                avatarUrl={candidateOwnerAvatarUrl}
              />
              <span style={{ color: candidateOwnerColor }}>
                {candidateOwnerName} が譲るもの
              </span>
              <span className="text-[#3a324a8c]">（タップで選択）</span>
            </div>
            {target.candidates.length === 0 ? (
              <div className="text-[10.5px] italic text-[#3a324a4d]">
                候補がありません
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {target.candidates.map((c) => (
                  <CandidateButton
                    key={c.item.id}
                    item={c.item}
                    selected={isSelected(c.item.id)}
                    onClick={() => onToggleCandidate(c.item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター：閉じる */}
        <div className="border-t border-[#3a324a08] bg-[#fbf9fc] px-3 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="block w-full rounded-[10px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-2.5 text-center text-[12.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_2px_8px_rgba(166,149,216,0.3)]"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── iter111: 在庫超過トースト ─── */

function CapacityToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[72px] z-[110] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full bg-[#d9826b] px-4 py-2 text-white shadow-[0_8px_24px_rgba(217,130,107,0.45)] backdrop-blur-xl">
        <span className="text-[14px]">⚠️</span>
        <span className="text-[12px] font-bold leading-tight">{message}</span>
      </div>
    </div>
  );
}

/* ─── Section group wrapper ─── */

function SectionGroup({
  title,
  subtitle,
  accentColor,
  children,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div
        className="mb-2 rounded-[10px] px-3 py-2"
        style={{ background: `${accentColor}14` }}
      >
        <div
          className="text-[11px] font-extrabold tracking-[0.4px]"
          style={{ color: accentColor }}
        >
          {title}
        </div>
        <div className="mt-0.5 text-[10px] text-[#3a324a8c]">{subtitle}</div>
      </div>
      {children}
    </section>
  );
}

/* ─── iter152: 通常マッチ用の簡易関係図 ─── */

function SimpleRelationPanel({
  partnerHandle,
  receivesItems,
  givesItems,
}: {
  partnerHandle: string;
  receivesItems: MiniItem[];
  givesItems: MiniItem[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]">
      <div className="border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <div className="text-[11px] font-extrabold tracking-[0.3px] text-[#3a324a]">
          譲 × wish の関係
        </div>
        <div className="mt-0.5 text-[10px] text-[#3a324a8c]">
          個別募集なしで、お互いの登録内容が重なっています
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3">
        <div className="min-w-0 rounded-[12px] bg-[#f3c5d414] px-2.5 py-2">
          <div className="mb-1.5 text-[10px] font-extrabold tracking-[0.4px] text-[#b66f87]">
            あなたが受け取る
          </div>
          <div className="text-[9.5px] font-bold text-[#3a324a8c]">
            @{partnerHandle} の譲
          </div>
          <div className="mt-1.5">
            <SummaryThumbStrip items={receivesItems} max={5} />
          </div>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a324a08] text-[13px] font-extrabold text-[#3a324a8c]">
          ⇄
        </div>

        <div className="min-w-0 rounded-[12px] bg-[#a695d814] px-2.5 py-2">
          <div className="mb-1.5 text-[10px] font-extrabold tracking-[0.4px] text-[#a695d8]">
            あなたが譲る
          </div>
          <div className="text-[9.5px] font-bold text-[#3a324a8c]">
            相手の wish に一致
          </div>
          <div className="mt-1.5">
            <SummaryThumbStrip items={givesItems} max={5} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 1 listing 分のツリー ─── */

function ListingTree({
  listing,
  index,
  viewpoint,
  partnerHandle,
  partnerAvatarUrl,
  myAvatarUrl,
  isSelected,
  isHaveSelected,
  onToggleHave,
  onOpenPopup,
}: {
  listing: MatchCardListingInfo;
  index: number;
  viewpoint: "mine" | "partner";
  partnerHandle: string;
  partnerAvatarUrl: string | null;
  myAvatarUrl: string | null;
  isSelected: (candidateInvId: string) => boolean;
  isHaveSelected: (listingId: string, haveInvId: string) => boolean;
  onToggleHave: (listingId: string, haveInvId: string) => void;
  onOpenPopup: (target: PopupTarget) => void;
}) {
  // iter124: flattenedWishes は撤廃（OptionList が直接 listing.options を参照）
  // ヘッダーの選択肢数は listing.options.filter(!isCashOffer).length で算出

  // fallback 用：listing.haves の先頭
  const fallbackHave = listing.haves[0]?.item ?? null;
  const fallbackHavePhoto = fallbackHave?.photoUrl ?? null;
  const fallbackHaveLabel = fallbackHave?.label ?? "—";

  const cashOption = listing.options.find((o) => o.isCashOffer);

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]">

      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        {/* iter124: ヘッダー表記を「個別募集N（選択肢X件）」に変更 */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-extrabold tracking-[0.3px] text-[#3a324a]">
            個別募集{index + 1}
          </span>
          <span className="ml-1 text-[10px] text-[#3a324a8c]">
            （選択肢 {listing.options.filter((o) => !o.isCashOffer).length} 件）
          </span>
        </div>
        {cashOption && (
          <span className="rounded-full bg-[#7a9a8a14] px-1.5 py-[1px] text-[9.5px] font-bold text-[#7a9a8a]">
            💴 ¥{cashOption.cashAmount?.toLocaleString() ?? "—"} も可
          </span>
        )}
      </div>

      {/* iter116: 左右レイアウト（左=受け取る / 右=譲る、listing 種別問わず統一）
          iter117: 矢印（← →）撤廃 */}
      <div className="flex">
        {/* LEFT：あなたが受け取る側（ピンクアクセント） */}
        <div className="flex-1 border-r border-[#3a324a08] px-2.5 py-2.5">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold tracking-[0.4px]">
            <MiniAvatar
              name={`@${partnerHandle}`}
              color="#f3c5d4"
              avatarUrl={partnerAvatarUrl}
            />
            <span style={{ color: "#f3c5d4" }}>@{partnerHandle} が譲るもの</span>
          </div>
          {viewpoint === "mine" ? (
            // mine: 左 = wishes（option 単位で AND 表現）
            <OptionList
              listing={listing}
              fallbackHavePhoto={fallbackHavePhoto}
              fallbackHaveLabel={fallbackHaveLabel}
              isSelected={isSelected}
              onOpenPopup={onOpenPopup}
              viewpoint={viewpoint}
            />
          ) : (
            // partner: 左 = haves（相手の譲、私が受け取る）
            <HaveList
              listing={listing}
              isHaveSelected={isHaveSelected}
              onToggleHave={onToggleHave}
            />
          )}
        </div>

        {/* RIGHT：あなたが譲る側（紫アクセント） */}
        <div className="flex-1 px-2.5 py-2.5">
          <div className="mb-1.5 flex items-center justify-end gap-1 text-[10px] font-bold tracking-[0.4px]">
            <MiniAvatar
              name="あなた"
              color="#a695d8"
              avatarUrl={myAvatarUrl}
            />
            <span style={{ color: "#a695d8" }}>あなた が譲るもの</span>
          </div>
          {viewpoint === "mine" ? (
            // mine: 右 = haves（自分の譲）
            <HaveList
              listing={listing}
              isHaveSelected={isHaveSelected}
              onToggleHave={onToggleHave}
            />
          ) : (
            // partner: 右 = wishes（option 単位で AND 表現）
            <OptionList
              listing={listing}
              fallbackHavePhoto={fallbackHavePhoto}
              fallbackHaveLabel={fallbackHaveLabel}
              isSelected={isSelected}
              onOpenPopup={onOpenPopup}
              viewpoint={viewpoint}
            />
          )}
        </div>
      </div>

      {/* iter118: per-listing サマリーは撤廃（全体サマリーは modal 下部に一括） */}
    </section>
  );
}

/* ─── iter116: have リスト（iter121: OR の場合は選択可） ───
 * - haveLogic === "or" + haves.length >= 2: 各 have をタップで toggle、
 *   選択中は紫リング + ✓ バッジ
 * - その他（AND or 単一）: 静的表示（タップ不可、全部参加）
 */

function HaveList({
  listing,
  isHaveSelected,
  onToggleHave,
}: {
  listing: MatchCardListingInfo;
  isHaveSelected: (listingId: string, haveInvId: string) => boolean;
  onToggleHave: (listingId: string, haveInvId: string) => void;
}) {
  const interactive =
    listing.haveLogic === "or" && listing.haves.length >= 2;

  return (
    <div className="flex flex-col items-center gap-2">
      {listing.haves.map((h) => {
        if (!interactive) {
          // AND or 単一：そのまま表示
          return (
            <ItemPhoto
              key={h.item.id}
              item={h.item}
              qty={h.qty}
              size={HAVE_THUMB}
              variant="have"
              dim={!h.matched}
            />
          );
        }
        // OR：タップで toggle
        const sel = isHaveSelected(listing.listingId, h.item.id);
        return (
          <button
            key={h.item.id}
            type="button"
            onClick={() => onToggleHave(listing.listingId, h.item.id)}
            aria-pressed={sel}
            className={`relative rounded-md p-0.5 transition-all active:scale-[0.95] ${
              sel
                ? "bg-[#a695d80f] ring-2 ring-[#a695d8]"
                : "opacity-50"
            }`}
          >
            <ItemPhoto
              item={h.item}
              qty={h.qty}
              size={HAVE_THUMB}
              variant="have"
            />
            {sel && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#a695d8] text-[10px] font-extrabold text-white shadow-[0_1px_3px_rgba(166,149,216,0.4)]"
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
      {listing.haves.length > 1 && (
        <span
          className={`rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold ${
            listing.haveLogic === "and"
              ? "bg-[#a695d8] text-white"
              : "border border-[#a695d855] bg-white text-[#a695d8]"
          }`}
        >
          {listing.haveLogic === "and" ? "全部 AND" : "いずれか OR ─ 選択可"}
        </span>
      )}
    </div>
  );
}

/* ─── iter117: option リスト（AND 構造を視覚化） ───
   listing.options を option 単位で表示。
   logic === "and" + wishes.length > 1 → 紫枠で囲み「セットで」バッジ
   logic === "or" or 単一 wish → 通常表示 */

function OptionList({
  listing,
  fallbackHavePhoto,
  fallbackHaveLabel,
  isSelected,
  onOpenPopup,
  viewpoint,
}: {
  listing: MatchCardListingInfo;
  fallbackHavePhoto: string | null;
  fallbackHaveLabel: string;
  isSelected: (candidateInvId: string) => boolean;
  onOpenPopup: (target: PopupTarget) => void;
  viewpoint: "mine" | "partner";
}) {
  const validOptions = listing.options.filter((o) => !o.isCashOffer);
  if (validOptions.length === 0) {
    return (
      <div className="text-[10.5px] italic text-[#3a324a4d]">
        wish が登録されていません
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {validOptions.map((opt) => (
        <OptionGroup
          key={opt.id}
          option={opt}
          listing={listing}
          fallbackHavePhoto={fallbackHavePhoto}
          fallbackHaveLabel={fallbackHaveLabel}
          isSelected={isSelected}
          onOpenPopup={onOpenPopup}
          viewpoint={viewpoint}
        />
      ))}
    </div>
  );
}

/* ─── iter117: 1 option 分のグループ（AND の場合は紫枠 + セットバッジ） ─── */

function OptionGroup({
  option,
  listing,
  fallbackHavePhoto,
  fallbackHaveLabel,
  isSelected,
  onOpenPopup,
  viewpoint,
}: {
  option: MatchCardOption;
  listing: MatchCardListingInfo;
  fallbackHavePhoto: string | null;
  fallbackHaveLabel: string;
  isSelected: (candidateInvId: string) => boolean;
  onOpenPopup: (target: PopupTarget) => void;
  viewpoint: "mine" | "partner";
}) {
  const isAndGroup = option.logic === "and" && option.wishes.length > 1;
  const isOrGroup = option.logic === "or" && option.wishes.length > 1;

  const renderRow = (w: typeof option.wishes[number]) => (
    <WishRow
      key={w.item.id}
      wishItem={w.item}
      qty={w.qty}
      candidates={w.candidates}
      exchangeType={option.exchangeType}
      fallbackHavePhoto={fallbackHavePhoto}
      fallbackHaveLabel={fallbackHaveLabel}
      isSelected={isSelected}
      onOpen={() =>
        onOpenPopup({
          listingId: listing.listingId,
          viewpoint,
          wishItem: w.item,
          wishQty: w.qty,
          candidates: w.candidates,
          exchangeType: option.exchangeType,
          fallbackHavePhoto,
          fallbackHaveLabel,
        })
      }
    />
  );

  // AND グループ：紫枠で囲んで「セット」を強調
  if (isAndGroup) {
    return (
      <div className="rounded-[12px] border-2 border-[#a695d8] bg-[#a695d808] p-1.5">
        <div className="mb-1 flex items-center gap-1 px-1 text-[9px]">
          <span className="rounded-full bg-[#a695d8] px-1.5 py-[1px] font-extrabold text-white">
            #{option.position} セット (AND)
          </span>
          <span className="text-[#3a324a8c]">全部一緒に</span>
        </div>
        <div className="space-y-1">{option.wishes.map(renderRow)}</div>
      </div>
    );
  }

  // OR グループ：薄い紫枠 + 「OR」バッジ
  if (isOrGroup) {
    return (
      <div className="rounded-[12px] border border-dashed border-[#a695d855] bg-[#a695d804] p-1.5">
        <div className="mb-1 flex items-center gap-1 px-1 text-[9px]">
          <span className="rounded-full border border-[#a695d855] bg-white px-1.5 py-[1px] font-extrabold text-[#a695d8]">
            #{option.position} いずれか (OR)
          </span>
          <span className="text-[#3a324a8c]">どれか 1 つで OK</span>
        </div>
        <div className="space-y-1">{option.wishes.map(renderRow)}</div>
      </div>
    );
  }

  // 単一 wish：そのまま 1 行
  return <>{option.wishes.map(renderRow)}</>;
}

/* ─── iter118: 全 listing 横断の結論サマリー ───
   modal の一番下（footer の上）に配置。両 listing 跨ぎの選択を集約。
   横並びで縦に広がらない。 */

function GlobalSummary({
  givesItems,
  receivesItems,
}: {
  givesItems: MiniItem[];
  receivesItems: MiniItem[];
}) {
  return (
    <div className="mt-3 rounded-[12px] border border-[#a695d855] bg-[linear-gradient(135deg,#a695d80a,#f3c5d40a)] px-3 py-2 shadow-[0_2px_8px_rgba(166,149,216,0.10)]">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.4px] text-[#a695d8]">
        <span>📋</span>
        <span>結論：この交換</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* iter119: listing 表示の左右順（左=受け取る / 右=譲る）に合わせて入れ替え */}
        <span className="flex items-center gap-1">
          <span className="rounded-full bg-[#f3c5d4] px-1.5 py-[1px] text-[8.5px] font-extrabold text-white">
            あなたが受
          </span>
          <SummaryThumbStrip items={receivesItems} max={6} />
        </span>
        <span className="text-[12px] font-bold text-[#3a324a8c]">⇄</span>
        <span className="flex items-center gap-1">
          <span className="rounded-full bg-[#a695d8] px-1.5 py-[1px] text-[8.5px] font-extrabold text-white">
            あなたが譲
          </span>
          <SummaryThumbStrip items={givesItems} max={6} />
        </span>
      </div>
    </div>
  );
}

function SummaryThumbStrip({
  items,
  max = 4,
}: {
  items: MiniItem[];
  max?: number;
}) {
  if (items.length === 0) {
    return <span className="text-[10px] italic text-[#3a324a4d]">未選択</span>;
  }
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;
  return (
    <div className="flex flex-shrink-0 gap-0.5">
      {visible.map((item) => (
        <SummaryThumb key={item.id} item={item} />
      ))}
      {overflow > 0 && (
        <span className="self-center text-[9px] font-bold text-[#3a324a8c]">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function SummaryThumb({ item }: { item: MiniItem }) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const hasPhoto = !!item.photoUrl;
  return (
    <div
      className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded border border-white/60 shadow-[0_1px_2px_rgba(58,50,74,0.12)]"
      style={{ background: hasPhoto ? "#3a324a" : stripeBg }}
      title={item.label}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white/95">
          {item.label[0] ?? "?"}
        </span>
      )}
    </div>
  );
}

/* ─── wish 1 行（タップで popup 起動・選択済を inline 表示） ─── */

const EXCHANGE_LABEL_FULL: Record<"same_kind" | "cross_kind" | "any", string> = {
  same_kind: "同種",
  cross_kind: "異種",
  any: "同異種",
};

/**
 * iter123: 同種・異種・同異種の chip 色を自分側（紫）と被らないように差し替え
 *   - 同種 = #5fa884（mint green：「同じ種類」のマッチ感）
 *   - 異種 = #d9826b（coral：「違う種類」の対比感）
 *   - 同異種 = 上記 2 色のグラデ（混ぜたものとして表現）
 */
const EXCHANGE_SAME_COLOR = "#5fa884";
const EXCHANGE_CROSS_COLOR = "#d9826b";

function exchangeChipStyle(
  type: "same_kind" | "cross_kind" | "any",
): React.CSSProperties {
  if (type === "same_kind") return { background: EXCHANGE_SAME_COLOR };
  if (type === "cross_kind") return { background: EXCHANGE_CROSS_COLOR };
  return {
    background: `linear-gradient(135deg, ${EXCHANGE_SAME_COLOR}, ${EXCHANGE_CROSS_COLOR})`,
  };
}

function WishRow({
  wishItem,
  qty,
  candidates,
  exchangeType,
  fallbackHavePhoto,
  isSelected,
  onOpen,
}: {
  wishItem: MiniItem;
  qty: number;
  candidates: { item: MiniItem; qty: number }[];
  exchangeType: "same_kind" | "cross_kind" | "any";
  fallbackHavePhoto: string | null;
  fallbackHaveLabel: string;
  isSelected: (candidateInvId: string) => boolean;
  onOpen: () => void;
}) {
  const hasCandidates = candidates.length > 0;
  const selectedCands = candidates.filter((c) => isSelected(c.item.id));
  const hasWishPhoto = !!wishItem.photoUrl;
  const showFallback = !hasWishPhoto && !!fallbackHavePhoto;

  // iter115: 候補なしの wish は dim（薄め）表示
  const containerCls = hasCandidates
    ? "rounded-[10px] border border-[#3a324a08] bg-[#fbf9fc]"
    : "rounded-[10px] border border-[#3a324a08] bg-[#3a324a04] opacity-55";

  return (
    <div className={containerCls}>
      {/* wish 行（タップで popup） */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left active:bg-[#a695d80a]"
      >
        {/* 左：wish サムネ（写真 or fallback：have 写真 + chip） */}
        <div className="relative flex-shrink-0">
          <ItemPhoto
            item={hasWishPhoto ? wishItem : { ...wishItem, photoUrl: fallbackHavePhoto }}
            qty={1}
            size={42}
            variant="wish"
          />
          {showFallback && (
            <span
              className="absolute -bottom-1 -right-1 rounded-full px-1 py-[1px] text-[8.5px] font-extrabold text-white shadow-[0_1px_3px_rgba(58,50,74,0.3)]"
              style={exchangeChipStyle(exchangeType)}
            >
              {EXCHANGE_LABEL_FULL[exchangeType]}
            </span>
          )}
        </div>

        {/* 中：wish 情報 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11.5px]">
            <span className="text-[10px]">🎯</span>
            <span className="truncate font-extrabold text-[#3a324a]">
              {wishItem.label}
            </span>
            <span className="font-bold tabular-nums text-[#3a324a8c]">
              ×{qty}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-[#3a324a8c]">
            {hasCandidates ? (
              <>候補 {candidates.length} 件</>
            ) : (
              <>候補なし</>
            )}
            {/* iter124: 「N 件選択中」表示は撤廃。選択中候補のサムネは行下に出る */}
          </div>
        </div>

        {/* 右：chevron */}
        <span className="flex-shrink-0 text-[14px] font-bold text-[#a695d8]">
          ›
        </span>
      </button>

      {/* 選択済の候補サムネを inline で表示（fold-out） */}
      {selectedCands.length > 0 && (
        <div className="border-t border-[#3a324a08] px-2.5 py-1.5">
          <div className="mb-1 text-[9.5px] font-bold text-[#3a324a8c]">
            選択中：
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedCands.map((c) => (
              <ItemPhoto
                key={c.item.id}
                item={c.item}
                qty={1}
                size={38}
                variant="candidate"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 候補サムネ（タップ可・選択中は紫枠 + ✓） ─── */

function CandidateButton({
  item,
  selected,
  onClick,
}: {
  item: MiniItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${item.label} ${selected ? "選択解除" : "選択"}`}
      className={`relative flex flex-col items-center gap-0.5 rounded-[10px] p-1 transition-all active:scale-[0.95] ${
        selected
          ? "bg-[#a695d814] ring-2 ring-[#a695d8] ring-offset-1 ring-offset-[#fbf9fc]"
          : "bg-white"
      }`}
    >
      <ItemPhoto item={item} qty={1} size={CAND_THUMB} variant="candidate" />
      <span className="max-w-[64px] truncate text-[9px] font-bold text-[#3a324a]">
        {item.label}
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#a695d8] text-[10px] font-extrabold text-white shadow-[0_1px_3px_rgba(166,149,216,0.4)]"
        >
          ✓
        </span>
      )}
    </button>
  );
}

/* ─── 共通サムネ（写真 / イニシャル fallback） ─── */

function ItemPhoto({
  item,
  qty,
  size,
  variant,
  dim,
}: {
  item: MiniItem;
  qty: number;
  size: number;
  variant: "have" | "candidate" | "wish";
  dim?: boolean;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  // wish / candidate はピンク系、have は水色系
  const borderColor =
    variant === "have" ? "border-[#a8d4e6]" : "border-[#f3c5d4]";

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-[7px] border shadow-[0_1px_3px_rgba(58,50,74,0.15)] ${borderColor} ${
        dim ? "opacity-50" : ""
      }`}
      style={{
        width: size,
        height: size,
        background: hasPhoto ? "#3a324a" : stripeBg,
      }}
      title={`${item.label}${qty > 1 ? ` ×${qty}` : ""}`}
    >
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photoUrl!}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}
      {!hasPhoto && (
        <span
          className="font-extrabold text-white/95"
          style={{
            fontSize: Math.max(14, size * 0.34),
            textShadow: initialShadow,
          }}
        >
          {item.label[0] ?? "?"}
        </span>
      )}
      {qty > 1 && (
        <span className="absolute -right-0.5 -top-0.5 rounded-bl bg-black/70 px-1 text-[9px] font-extrabold leading-tight text-white">
          ×{qty}
        </span>
      )}
    </div>
  );
}

/* ─── iter120: 個別募集の条件不一致 確認ダイアログ ─── */

function ValidationAlert({
  issues,
  onCancel,
  onProceed,
}: {
  issues: { listingLabel: string; reasons: string[] }[];
  onCancel: () => void;
  onProceed: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-[18px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="border-b border-[#3a324a08] bg-[#fff5f0] px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">⚠️</span>
            <span className="text-[14px] font-extrabold text-[#d9826b]">
              個別募集の条件を満たしていません
            </span>
          </div>
        </div>

        {/* 本体：未満足の listing と理由 */}
        <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
          <div className="mb-2 text-[11.5px] leading-relaxed text-[#3a324a]">
            以下の個別募集の条件は未満足のまま打診されます：
          </div>
          <ul className="space-y-2">
            {issues.map((iss, i) => (
              <li
                key={i}
                className="rounded-[10px] border border-[#d9826b40] bg-[#fff5f0] px-3 py-2"
              >
                <div className="text-[11.5px] font-extrabold text-[#3a324a]">
                  {iss.listingLabel}
                </div>
                <ul className="mt-1 space-y-0.5 text-[10.5px] text-[#3a324a8c]">
                  {iss.reasons.map((r, j) => (
                    <li key={j}>・{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[10.5px] leading-relaxed text-[#3a324a8c]">
            このまま進む場合、相手から「条件を満たしていない」と判断されて
            拒否される可能性があります。
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-2 border-t border-[#3a324a08] bg-[#fbf9fc] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[10px] border border-[#3a324a14] bg-white py-2.5 text-[12px] font-extrabold text-[#3a324a]"
          >
            戻って調整
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="flex-1 rounded-[10px] bg-[#d9826b] py-2.5 text-[12px] font-extrabold text-white shadow-[0_2px_6px_rgba(217,130,107,0.35)]"
          >
            このまま打診へ
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── iter115: ミニアバター（誰の譲かを視覚的に示す丸アイコン）
       iter125: avatarUrl があれば実画像、なければイニシャル + 役色 ─── */

function MiniAvatar({
  name,
  color,
  avatarUrl,
}: {
  name: string;
  color: string;
  avatarUrl?: string | null;
}) {
  // name の先頭 1 文字（@ は除外）
  const ch = name.replace(/^@/, "")[0]?.toUpperCase() ?? "?";
  if (avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 flex-shrink-0 overflow-hidden rounded-full shadow-[0_1px_3px_rgba(58,50,74,0.18)]"
        style={{ border: `1.5px solid ${color}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-[0_1px_3px_rgba(58,50,74,0.18)]"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
    >
      {ch}
    </span>
  );
}

/* iter103 信頼度チェックリストは情報量を抑えるため一旦撤去
   （ツリー型の方が「写真で判断」というメッセージが直接伝わる）
   旧 ListingDiagram / OptionRow / WishWithCandidates / CandidateThumb は削除
   （iter104 のレイアウトは iter108 で完全置換） */
