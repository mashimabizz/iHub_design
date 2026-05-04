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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  MatchCardListingInfo,
  MiniItem,
} from "./MatchCard";

const HAVE_THUMB = 56;
const CAND_THUMB = 56;

/**
 * 選択状態（iter109: 複数 listing 跨ぎに対応）
 *   listingId → 選択された候補 inv id の Set
 */
type Selection = Map<string, Set<string>>;

export function MatchDetailModal({
  partnerHandle,
  partnerId,
  myListings,
  partnerListings,
  myInventoryQty,
  onClose,
}: {
  partnerHandle: string;
  partnerId: string;
  myListings: MatchCardListingInfo[];
  partnerListings: MatchCardListingInfo[];
  /** iter111: 自分の inventory id → 在庫数（quantity）の Map。capacity 超過判定用 */
  myInventoryQty: Record<string, number>;
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
        // 私の listing → haves（私の inv）を qty 分出す
        for (const h of listing.haves) {
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
  const proposeHref = useMemo(() => {
    if (totalSelected === 0) return null;

    const allListings = [...myListings, ...partnerListings];
    const listingById = new Map(
      allListings.map((l) => [l.listingId, l] as const),
    );

    const gives = new Set<string>();
    const receives = new Set<string>();
    const referencedListings = new Set<string>();

    for (const [listingId, candidateIds] of selection) {
      const listing = listingById.get(listingId);
      if (!listing) continue;
      referencedListings.add(listingId);

      if (listing.isMyListing) {
        // 私の listing：listing.haves（私の inv）を出す + 候補（相手の inv）を受け取る
        for (const h of listing.haves) gives.add(h.item.id);
        for (const cid of candidateIds) receives.add(cid);
      } else {
        // 相手の listing：候補（私の inv）を出す + listing.haves（相手の inv）を受け取る
        for (const cid of candidateIds) gives.add(cid);
        for (const h of listing.haves) receives.add(h.item.id);
      }
    }

    const params = new URLSearchParams();
    if (gives.size > 0) params.set("gives", [...gives].join(","));
    if (receives.size > 0) params.set("receives", [...receives].join(","));
    if (referencedListings.size > 0)
      params.set("listings", [...referencedListings].join(","));

    return `/propose/${partnerId}?${params.toString()}`;
  }, [selection, totalSelected, myListings, partnerListings, partnerId]);

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
            関係図（個別募集）
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
          各 wish の候補を<b>写真で確認</b>して、受け取りたい / 出せるものを
          タップで選択。下の「打診に進む」で確認画面に進みます。
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
                isSelected={(cid) => isSelected(l.listingId, cid)}
                onToggleCandidate={(cid) => toggleCandidate(l.listingId, cid)}
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
                isSelected={(cid) => isSelected(l.listingId, cid)}
                onToggleCandidate={(cid) => toggleCandidate(l.listingId, cid)}
              />
            ))}
          </SectionGroup>
        )}

        {myListings.length === 0 && partnerListings.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-[#3a324a14] bg-white p-4 text-center text-[12px] text-[#3a324a8c]">
            個別募集経由のマッチはありません
          </div>
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
            <Link
              href={proposeHref}
              onClick={onClose}
              className="flex-1 rounded-[12px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] py-3 text-center text-[13.5px] font-extrabold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)] active:scale-[0.98]"
            >
              打診に進む（{totalSelected} 件）→
            </Link>
          </div>
        </div>
      )}

      {/* iter111: 在庫超過トースト */}
      {toast && <CapacityToast key={toast.key} message={toast.message} />}
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

/* ─── 1 listing 分のツリー ─── */

function ListingTree({
  listing,
  index,
  viewpoint,
  isSelected,
  onToggleCandidate,
}: {
  listing: MatchCardListingInfo;
  index: number;
  viewpoint: "mine" | "partner";
  isSelected: (candidateInvId: string) => boolean;
  onToggleCandidate: (candidateInvId: string) => void;
}) {
  // 全 option から wish を flat にして集計（同一 wishId は merge）
  const flattenedWishes = useMemo(() => {
    type Entry = {
      wishId: string;
      item: MiniItem;
      qty: number;
      candidates: { item: MiniItem; qty: number }[];
    };
    const map = new Map<string, Entry>();
    for (const opt of listing.options) {
      if (opt.isCashOffer) continue;
      for (const w of opt.wishes) {
        const existing = map.get(w.item.id);
        if (existing) {
          // candidates をマージ（重複排除）
          const seen = new Set(existing.candidates.map((c) => c.item.id));
          for (const c of w.candidates) {
            if (!seen.has(c.item.id)) {
              existing.candidates.push(c);
              seen.add(c.item.id);
            }
          }
          // qty は最大値を採用
          existing.qty = Math.max(existing.qty, w.qty);
        } else {
          map.set(w.item.id, {
            wishId: w.item.id,
            item: w.item,
            qty: w.qty,
            candidates: [...w.candidates],
          });
        }
      }
    }
    return Array.from(map.values());
  }, [listing.options]);

  const cashOption = listing.options.find((o) => o.isCashOffer);

  // ラベル：viewpoint に応じて
  const haveLabel = viewpoint === "mine" ? "あなたが出す（譲）" : "あなたが受け取る（相手の譲）";
  const candidateOriginLabel =
    viewpoint === "mine"
      ? "相手の譲から候補"
      : "あなたの譲から候補（出せるもの）";

  // iter109: 複数 listing を同時に選択可能にしたので、dim 処理は撤廃

  // ヘッダー summary
  const totalCandidates = flattenedWishes.reduce(
    (s, w) => s + w.candidates.length,
    0,
  );

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-[#3a324a14] bg-white shadow-[0_2px_8px_rgba(58,50,74,0.04)]">

      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-[#3a324a08] bg-[#fbf9fc] px-3 py-2">
        <span className="text-[10px] font-bold tracking-[0.4px] text-[#3a324a8c]">
          #{index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[10.5px] font-bold text-[#3a324a]">
            {flattenedWishes.length} wish · 候補 {totalCandidates} 件
          </span>
        </div>
        {cashOption && (
          <span className="rounded-full bg-[#7a9a8a14] px-1.5 py-[1px] text-[9.5px] font-bold text-[#7a9a8a]">
            💴 ¥{cashOption.cashAmount?.toLocaleString() ?? "—"} も可
          </span>
        )}
      </div>

      {/* 譲ブロック */}
      <div className="border-b border-[#3a324a08] px-3 py-2.5">
        <div className="mb-1.5 text-[10px] font-bold tracking-[0.4px] text-[#a8d4e6]">
          🎁 {haveLabel}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {listing.haves.map((h) => (
            <ItemPhoto
              key={h.item.id}
              item={h.item}
              qty={h.qty}
              size={HAVE_THUMB}
              variant="have"
              dim={!h.matched}
            />
          ))}
          {listing.haves.length > 1 && (
            <span
              className={`rounded-full px-1.5 py-[2px] text-[9.5px] font-extrabold ${
                listing.haveLogic === "and"
                  ? "bg-[#a695d8] text-white"
                  : "border border-[#a695d855] bg-white text-[#a695d8]"
              }`}
            >
              {listing.haveLogic === "and" ? "全部 AND" : "いずれか OR"}
            </span>
          )}
        </div>
      </div>

      {/* wish + 候補ブロック */}
      <div className="space-y-2.5 px-3 py-3">
        {flattenedWishes.length === 0 ? (
          <div className="text-[11px] italic text-[#3a324a4d]">
            wish が登録されていません
          </div>
        ) : (
          flattenedWishes.map((w) => (
            <WishRow
              key={w.wishId}
              wishItem={w.item}
              qty={w.qty}
              candidates={w.candidates}
              candidateOriginLabel={candidateOriginLabel}
              isSelected={isSelected}
              onToggleCandidate={onToggleCandidate}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ─── wish 1 件 + 候補サムネ群 ─── */

function WishRow({
  wishItem,
  qty,
  candidates,
  candidateOriginLabel,
  isSelected,
  onToggleCandidate,
}: {
  wishItem: MiniItem;
  qty: number;
  candidates: { item: MiniItem; qty: number }[];
  candidateOriginLabel: string;
  isSelected: (candidateInvId: string) => boolean;
  onToggleCandidate: (candidateInvId: string) => void;
}) {
  const hasCandidates = candidates.length > 0;
  return (
    <div className="rounded-[10px] border border-[#3a324a08] bg-[#fbf9fc] p-2.5">
      {/* wish 情報 */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[10px]">🎯</span>
        <span className="text-[11.5px] font-extrabold text-[#3a324a]">
          wish: {wishItem.label}
        </span>
        <span className="text-[10.5px] font-bold tabular-nums text-[#3a324a8c]">
          ×{qty}
        </span>
        <div className="flex-1" />
        <span
          className={`rounded-full px-1.5 py-[1px] text-[9px] font-extrabold ${
            hasCandidates
              ? "bg-[#a695d814] text-[#a695d8]"
              : "bg-[#3a324a08] text-[#3a324a8c]"
          }`}
        >
          候補 {candidates.length}
        </span>
      </div>

      {/* 候補サムネ群（タップで選択） */}
      {hasCandidates ? (
        <>
          <div className="mb-1 px-0.5 text-[9.5px] text-[#3a324a8c]">
            {candidateOriginLabel}（タップで選択）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((c) => (
              <CandidateButton
                key={c.item.id}
                item={c.item}
                selected={isSelected(c.item.id)}
                onClick={() => onToggleCandidate(c.item.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-[10.5px] italic text-[#3a324a4d]">
          候補がありません（タグや具体的なシリーズで wish を絞ると見つかる可能性があります）
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
  variant: "have" | "candidate";
  dim?: boolean;
}) {
  const stripeBg = `repeating-linear-gradient(135deg, hsl(${item.hue}, 28%, 86%) 0 4px, hsl(${item.hue}, 28%, 78%) 4px 8px)`;
  const initialShadow = `0 1px 2px hsla(${item.hue}, 30%, 30%, 0.5)`;
  const hasPhoto = !!item.photoUrl;
  const borderColor = variant === "have" ? "border-[#a8d4e6]" : "border-[#f3c5d4]";

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

/* iter103 信頼度チェックリストは情報量を抑えるため一旦撤去
   （ツリー型の方が「写真で判断」というメッセージが直接伝わる）
   旧 ListingDiagram / OptionRow / WishWithCandidates / CandidateThumb は削除
   （iter104 のレイアウトは iter108 で完全置換） */
