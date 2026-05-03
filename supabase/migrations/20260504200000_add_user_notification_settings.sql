-- =====================================================================
-- iter93: 通知設定テーブル新設
-- =====================================================================
-- ユーザーが通知チャネルを ON/OFF できるようにする。
--
-- MVP 設計：
-- - in_app は常時 ON（無効化不可、ホームのベルアイコンは常に動作）
-- - email はマスター ON/OFF + kind 別の重要度設定（次フェーズ）
-- - push は将来 PWA 対応時に追加
--
-- iter93 段階では「保存のみ」。実際のメール送信は次フェーズで実装。

create table public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- メール通知（auth.users.email を送信先として使用）
  email_enabled boolean not null default true,

  -- 重要度別の細かい設定（reserved、次フェーズで利用）
  -- email_kinds text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_notification_settings_updated_at
  before update on public.user_notification_settings
  for each row execute function public.set_updated_at();

comment on table public.user_notification_settings is
  'ユーザー通知設定（in_app は常時 ON、email チャネルの ON/OFF を保存）';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.user_notification_settings enable row level security;

create policy "Users manage own notification settings"
  on public.user_notification_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- 完了
-- =====================================================================
