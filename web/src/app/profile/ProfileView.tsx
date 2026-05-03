"use client";

import Link from "next/link";
import { useTransition } from "react";
import { logout } from "@/app/auth/actions";

type Props = {
  profile: {
    handle: string;
    displayName: string;
    gender: string | null;
    primaryArea: string | null;
    emailVerifiedAt: string | null;
  };
  oshiGroups: {
    groupId: string;
    groupName: string;
    members: { id: string; name: string }[];
  }[];
  awCount: number;
  tradeCount: number;
};

const GENDER_LABEL: Record<string, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  no_answer: "回答しない",
};

/**
 * プロフ画面（モックアップ hub-screens.jsx::ProfileHub 準拠）
 *
 * - アイデンティティ hero（紫グラデ + 統計 4 マス）
 * - コレクションサマリ（Coming soon 表示）
 * - あなたの活動（取引 mock + AW 実データ）
 * - アイデンティティ（プロフィール編集 / 推し設定 / 本人確認）
 * - 設定・サポート（Coming soon）
 * - ログアウト + アカウント削除
 */
export function ProfileView({
  profile,
  oshiGroups,
  awCount,
  tradeCount,
}: Props) {
  const initial = (profile.displayName || profile.handle || "?")
    .charAt(0)
    .toUpperCase();
  const oshiSummaryText = oshiGroups
    .slice(0, 2)
    .map(
      (g) =>
        `${g.groupName}${
          g.members.length ? ` · ${g.members.map((m) => m.name).join(" / ")}` : ""
        }`,
    )
    .join(" ／ ");
  const isVerified = !!profile.emailVerifiedAt;
  const subText = [
    profile.gender ? GENDER_LABEL[profile.gender] ?? "" : "",
    profile.primaryArea ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="flex flex-1 flex-col bg-[#fbf9fc] pb-[88px] text-[#3a324a]">
      {/* ヘッダー（safe-area + タイトル + 設定アイコン） */}
      <div className="border-b border-[#3a324a14] bg-white px-[18px] pb-3 pt-12">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-wide text-gray-900">
            プロフ
          </h1>
          <Link
            href="/profile/edit"
            aria-label="設定"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3a324a14] bg-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#3a324a"
              strokeWidth="1.5"
            >
              <circle cx="7" cy="7" r="2" />
              <path d="M7 1.5v1.5M7 11v1.5M1.5 7H3M11 7h1.5M3 3l1 1M10 10l1 1M3 11l1-1M10 4l1-1" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-[18px] pt-[14px]">
        {/* Identity hero */}
        <div className="relative mb-[18px] overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#a695d8,#a8d4e6)] p-[18px] text-white shadow-[0_10px_24px_rgba(166,149,216,0.22)]">
          <div className="pointer-events-none absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-white/10" />
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/25 text-[22px] font-extrabold">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-extrabold">
                @{profile.handle || "未設定"}
              </div>
              <div className="mt-0.5 text-[11px] leading-[1.5] opacity-90">
                {profile.displayName || "（表示名未設定）"}
                {oshiSummaryText && (
                  <>
                    <br />
                    {oshiSummaryText}
                  </>
                )}
                {subText && (
                  <>
                    <br />
                    {subText}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex border-t border-white/20 pt-3">
            <Stat value="—" label="評価" />
            <DividerV />
            <Stat value={String(tradeCount)} label="取引" />
            <DividerV />
            <Stat value="—" label="コレ" />
            <DividerV />
            <Stat value={String(awCount)} label="AW予定" />
          </div>
        </div>

        {/* コレクションサマリ */}
        <Section label="コレクションサマリ" hint="準備中">
          <Row>
            <RowItem
              icon="📚"
              title="wish 進捗（コレクション機能）"
              sub="次の iter で実装予定"
              comingSoon
            />
          </Row>
        </Section>

        {/* あなたの活動 */}
        <Section label="あなたの活動">
          <Row>
            <RowItem
              icon="📋"
              title="取引履歴"
              sub={
                tradeCount > 0
                  ? `${tradeCount}件 · 取引完了 (まだ詳細画面は準備中)`
                  : "まだ取引なし"
              }
              comingSoon
            />
          </Row>
          <Link href="/" className="block">
            <RowItem
              icon="📅"
              title="自分の AW（合流可能枠）"
              sub={
                awCount > 0
                  ? `${awCount}件設定中 · ホーム > 現地交換モードで管理`
                  : "未設定 · ホームの「現地交換モード」で設定"
              }
              chevron
            />
          </Link>
        </Section>

        {/* アイデンティティ */}
        <Section label="アイデンティティ">
          <Link href="/profile/edit" className="block">
            <RowItem
              icon="👤"
              title="プロフィール編集"
              sub="ハンドル・表示名・性別・エリア"
              chevron
            />
          </Link>
          <Link href="/profile/oshi" className="block">
            <RowItem
              icon="💜"
              title="推し設定"
              sub={
                oshiGroups.length === 0
                  ? "未設定 · タップで追加"
                  : `${oshiGroups.length}グループ · ${oshiSummaryText}`
              }
              chevron
            />
          </Link>
          <Row>
            <RowItem
              icon={isVerified ? "✓" : "!"}
              title="本人確認"
              sub={
                isVerified ? "● メール認証済" : "メール未認証"
              }
              subColor={isVerified ? "#6bb39a" : "#d4866b"}
            />
          </Row>
        </Section>

        {/* 設定・サポート */}
        <Section label="設定・サポート" hint="準備中">
          <Row>
            <RowItem icon="⚙" title="設定" sub="アプリ全体の設定" comingSoon />
          </Row>
          <Row>
            <RowItem icon="🔔" title="通知設定" sub="未実装" comingSoon />
          </Row>
          <Row>
            <RowItem icon="?" title="ヘルプ・問い合わせ" sub="FAQ・運営連絡" comingSoon />
          </Row>
        </Section>

        {/* Logout / Delete */}
        <Section>
          <LogoutRow />
          <Row>
            <button
              type="button"
              disabled
              className="block w-full text-center text-[11.5px] font-semibold text-[#d4866b] opacity-60"
            >
              アカウント削除（準備中）
            </button>
          </Row>
        </Section>

        <div className="pb-3 pt-1 text-center text-[10px] text-[#3a324a4d]">
          iHub MVP · build dev
        </div>
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div
        className="text-[14px] font-extrabold"
        style={{ fontFamily: '"Inter Tight", sans-serif' }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[9.5px] opacity-85">{label}</div>
    </div>
  );
}

function DividerV() {
  return <div className="w-px bg-white/20" />;
}

function Section({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#a695d8]">
            {label}
          </span>
          {hint && (
            <span className="text-[10px] text-[#3a324a8c]">{hint}</span>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-[14px] border border-[#3a324a0f] bg-white">
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-[#3a324a0f] px-3.5 py-3 last:border-0">
      {children}
    </div>
  );
}

function RowItem({
  icon,
  title,
  sub,
  subColor,
  chevron,
  comingSoon,
}: {
  icon: string;
  title: string;
  sub?: string;
  subColor?: string;
  chevron?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 ${
        comingSoon ? "opacity-60" : ""
      }`}
    >
      <span className="w-6 text-center text-[18px]">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold">{title}</div>
        {sub && (
          <div
            className="mt-0.5 text-[10.5px]"
            style={{ color: subColor ?? "#3a324a8c" }}
          >
            {sub}
          </div>
        )}
      </div>
      {chevron && (
        <span className="text-[14px] font-bold text-[#a695d8]">›</span>
      )}
      {comingSoon && (
        <span className="rounded-full bg-[#3a324a08] px-2 py-0.5 text-[9.5px] font-bold text-[#3a324a8c]">
          準備中
        </span>
      )}
    </div>
  );
}

function LogoutRow() {
  const [pending, startTransition] = useTransition();
  return (
    <div className="border-b border-[#3a324a0f] px-3.5 py-3 last:border-0">
      <form
        action={() => {
          startTransition(async () => {
            await logout();
          });
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="block w-full text-center text-[12.5px] font-semibold text-[#3a324a8c] disabled:opacity-50"
        >
          {pending ? "ログアウト中…" : "ログアウト"}
        </button>
      </form>
    </div>
  );
}
