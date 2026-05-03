"use client";

/**
 * iter93: 通知設定画面
 *
 * 現状は in-app（ベル + /notifications）が常時 ON、メール通知のマスター
 * ON/OFF だけを保存できる。実際のメール送信は次フェーズで実装予定。
 */

import { useState, useTransition } from "react";
import { updateNotificationSettings } from "./actions";

export function NotificationSettingsView({
  emailEnabled: initialEmailEnabled,
  email,
}: {
  emailEnabled: boolean;
  email: string | null;
}) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleEmail() {
    const next = !emailEnabled;
    setEmailEnabled(next);
    setError(null);
    startTransition(async () => {
      const r = await updateNotificationSettings({ emailEnabled: next });
      if (r?.error) {
        setError(r.error);
        setEmailEnabled(!next); // 巻き戻し
      } else {
        setSavedAt(Date.now());
      }
    });
  }

  return (
    <div className="space-y-3.5">
      {/* in-app 通知（常時 ON） */}
      <Section
        label="アプリ内通知"
        sub="ホームヘッダーのベルと /notifications で確認"
      >
        <Row
          icon="🔔"
          title="アプリ内通知"
          sub="常時 ON（無効化できません）"
          control={
            <span className="rounded-full bg-emerald-500 px-2 py-[2px] text-[9.5px] font-extrabold text-white">
              ON
            </span>
          }
        />
      </Section>

      {/* メール */}
      <Section
        label="メール通知"
        sub={email ? `送信先：${email}` : "メールアドレス未設定"}
      >
        <Row
          icon="✉"
          title="メール通知"
          sub="重要イベント（打診着信・合意・申告など）をメールで通知"
          control={
            <Toggle
              on={emailEnabled}
              onClick={toggleEmail}
              disabled={pending}
            />
          }
        />
      </Section>

      <div className="rounded-[10px] bg-[#a695d80a] px-3 py-2.5 text-[10.5px] leading-[1.6] text-[#3a324a]">
        <b>📝 メール送信について</b>
        <br />
        現在は設定の保存のみ動作します。実際のメール送信機能は次フェーズで対応します。
      </div>

      {savedAt && !pending && !error && (
        <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-2.5 text-center text-[11px] font-bold text-emerald-700">
          ✓ 設定を保存しました
        </div>
      )}
      {error && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 p-2.5 text-center text-[11px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 px-1">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-[#3a324a8c]">
          {label}
        </div>
        {sub && (
          <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">{sub}</div>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#3a324a14] bg-white">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  sub,
  control,
}: {
  icon: string;
  title: string;
  sub?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-[18px] leading-none">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-[#3a324a]">{title}</div>
        {sub && <div className="mt-0.5 text-[10.5px] text-[#3a324a8c]">{sub}</div>}
      </div>
      {control}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={`relative h-[26px] w-[44px] flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-emerald-500" : "bg-[#3a324a30]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${
          on ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}
