"use client";

/**
 * iter81: パートナーの公開プロフィール画面
 * iter97: 「譲るグッズ」一覧をマイ在庫と同じ ItemCard 形式で追加。
 *         チャットヘッダー → このプロフ画面で、相手のグッズが一目で分かる導線。
 *
 * iHub/hub-screens.jsx の ProfileHub の hero 構造を参考に、
 * 受信側打診画面 (ProposalDetailView) や マッチカード、
 * チャットヘッダーから遷移。
 *
 * 表示：
 * - hero card：avatar 大 / handle / display_name / primary_area
 *   ★ ・ 取引数 ・ 譲るグッズ数 のメトリクス
 * - 「打診を始める」CTA（自分の場合は表示しない、page.tsx で /profile に redirect 済み）
 * - iter97: 譲るグッズ一覧（マイ在庫と同じ ItemCard・3 列グリッド・閲覧専用）
 * - 公開中の個別募集 一覧（最大 5 件、譲：group×goodsType / 求：選択肢ごと）
 * - 最近の評価コメント（最大 5 件）
 */

import Link from "next/link";
import { ItemCard, type ItemCardData } from "@/app/inventory/ItemCard";

export type PartnerInventoryItem = {
  id: string;
  memberName: string;
  goodsType: string;
  qty: number;
  hue: number;
  photoUrl: string | null;
};

export type UserProfileData = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  primaryArea: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  completedTradeCount: number;
  /** iter97: 譲るグッズ一覧（kind='for_trade', status='active'） */
  inventoryItems: PartnerInventoryItem[];
  activeListingsCount: number;
  activeListingsPreview: {
    id: string;
    haveGroupName: string | null;
    haveGoodsTypeName: string | null;
    wishOptions: { groupName: string | null; goodsTypeName: string | null }[];
  }[];
  recentComments: {
    stars: number;
    comment: string;
    createdAt: string;
    raterHandle: string;
  }[];
};

export function UserProfileView({ profile }: { profile: UserProfileData }) {
  return (
    <div className="space-y-3.5 pb-20">
      {/* hero */}
      <div
        className="overflow-hidden rounded-2xl p-5 text-white shadow-[0_10px_24px_rgba(166,149,216,0.30)]"
        style={{
          background: "linear-gradient(135deg, #a695d8, #a8d4e6)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] border-2 border-white/30"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.handle}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[22px] font-extrabold">
                {profile.displayName[0] || "?"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-extrabold">
              @{profile.handle}
            </div>
            <div className="mt-0.5 text-[12px] font-bold opacity-90">
              {profile.displayName}
            </div>
            <div className="mt-0.5 text-[10.5px] opacity-85">
              {profile.primaryArea ?? "エリア未設定"} ・ 取引マナー◎
            </div>
          </div>
        </div>
        <div className="mt-3 flex border-t border-white/20 pt-3">
          {[
            {
              v:
                profile.ratingAvg !== null
                  ? `★${profile.ratingAvg.toFixed(1)}`
                  : "★—",
              l: "評価",
            },
            { v: String(profile.completedTradeCount), l: "取引" },
            // iter97: 「譲るグッズ」を主要メトリクスに昇格
            { v: String(profile.inventoryItems.length), l: "譲" },
            { v: String(profile.activeListingsCount), l: "個別募集" },
          ].map((s, i) => (
            <div
              key={s.l}
              className="flex-1 text-center"
              style={{
                borderLeft:
                  i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none",
              }}
            >
              <div
                className="text-[14px] font-extrabold"
                style={{ fontFamily: '"Inter Tight", sans-serif' }}
              >
                {s.v}
              </div>
              <div className="mt-0.5 text-[9.5px] opacity-85">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/propose/${profile.id}`}
        className="block w-full rounded-[14px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] px-6 py-[14px] text-center text-[14px] font-bold tracking-[0.3px] text-white shadow-[0_4px_14px_rgba(166,149,216,0.33)]"
      >
        💬 このユーザーに打診する →
      </Link>

      {/* iter97: 譲るグッズ一覧（マイ在庫と同じ ItemCard を使った 3 列グリッド・閲覧専用） */}
      <Section
        label="譲るグッズ"
        hint={`${profile.inventoryItems.length} 件`}
      >
        {profile.inventoryItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-6 text-center text-[11px] text-[#3a324a8c]">
            譲る候補のグッズはまだありません
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {profile.inventoryItems.map((it) => {
              const card: ItemCardData = {
                id: it.id,
                memberName: it.memberName,
                goodsType: it.goodsType,
                series: null,
                qty: it.qty,
                hue: it.hue,
                carrying: false,
                photoUrl: it.photoUrl,
                isPending: false,
              };
              return <ItemCard key={it.id} item={card} />;
            })}
          </div>
        )}
      </Section>

      {/* 公開中の個別募集 */}
      <Section
        label="公開中の個別募集"
        hint={`${profile.activeListingsCount} 件`}
      >
        {profile.activeListingsPreview.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-6 text-center text-[11px] text-[#3a324a8c]">
            公開中の個別募集はありません
          </div>
        ) : (
          <div className="space-y-2">
            {profile.activeListingsPreview.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl border border-[#3a324a14] bg-white px-3.5 py-3"
              >
                <div className="mb-1 text-[10.5px] font-bold tracking-[0.4px] text-[#a8d4e6]">
                  譲（{l.haveGroupName ?? "—"} × {l.haveGoodsTypeName ?? "—"}）
                </div>
                <div className="my-1.5 flex items-center justify-center text-[12px] text-[#3a324a8c]">
                  ↔
                </div>
                <div className="mb-1 text-[10.5px] font-bold tracking-[0.4px] text-[#f3c5d4]">
                  求（{l.wishOptions.length} 選択肢）
                </div>
                <div className="space-y-0.5">
                  {l.wishOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="text-[11.5px] text-[#3a324a]"
                    >
                      <span className="text-[#3a324a8c]">#{i + 1}</span>{" "}
                      {opt.groupName ?? "—"} × {opt.goodsTypeName ?? "—"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 最近の評価コメント */}
      <Section label="最近の評価コメント">
        {profile.recentComments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3a324a14] bg-white py-6 text-center text-[11px] text-[#3a324a8c]">
            まだ評価コメントはありません
          </div>
        ) : (
          <div className="space-y-2">
            {profile.recentComments.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#3a324a14] bg-white px-3.5 py-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#3a324a]">
                    @{c.raterHandle}
                  </span>
                  <span className="text-[10.5px] tabular-nums text-[#3a324a8c]">
                    {"★".repeat(c.stars)}
                    <span className="text-[#3a324a14]">
                      {"★".repeat(5 - c.stars)}
                    </span>
                  </span>
                  <div className="flex-1" />
                  <span className="text-[10px] text-[#3a324a8c]">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#3a324a]">
                  {c.comment}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
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
      <div className="mb-1.5 flex items-baseline justify-between px-1">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
          {label}
        </span>
        {hint && (
          <span className="text-[9.5px] font-bold text-[#a695d8]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
