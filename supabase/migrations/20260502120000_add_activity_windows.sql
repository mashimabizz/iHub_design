-- =====================================================================
-- iter61: activity_windows テーブル追加（AW = Availability Window）
-- =====================================================================
-- 「この時間ここにいる」予定。場所 × 時間 × 半径で表現。
-- マッチング時の「時空交差」計算に使用。

create table public.activity_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 場所
  venue text not null check (length(venue) between 1 and 100),
  -- 緯度経度（マッチング距離計算に使用・任意）
  center_lat numeric(9, 6),
  center_lng numeric(9, 6),
  -- 半径（メートル）
  radius_m integer not null default 500 check (radius_m >= 50 and radius_m <= 5000),

  -- イベント情報（任意）
  event_name text check (event_name is null or length(event_name) <= 100),
  -- イベント無しの「合流可能枠」（駅周辺で柔軟に動ける等）
  eventless boolean not null default false,

  -- 時間範囲
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),

  -- メモ（200文字）
  note text check (note is null or length(note) <= 200),

  -- 手動ステータス（時刻ベースの状態は別途計算）
  status text not null default 'enabled' check (
    status in ('enabled', 'disabled', 'archived')
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.activity_windows is
  'ユーザーの合流可能枠（AW: Availability Window）。場所 × 時間 × 半径';
comment on column public.activity_windows.status is
  'enabled=有効 / disabled=一時無効 / archived=自動アーカイブ済';

create index idx_activity_windows_user on public.activity_windows(user_id);
create index idx_activity_windows_status on public.activity_windows(status);
create index idx_activity_windows_start_at on public.activity_windows(start_at);
create index idx_activity_windows_end_at on public.activity_windows(end_at);

create trigger trg_activity_windows_updated_at
  before update on public.activity_windows
  for each row execute function public.set_updated_at();

alter table public.activity_windows enable row level security;

-- マッチング・公開プロフィールで他人の enabled な AW を参照可
create policy "Anyone can read enabled aw" on public.activity_windows
  for select using (status = 'enabled');

-- 自分の AW は全状態を参照可
create policy "Users can read their own aw" on public.activity_windows
  for select using (auth.uid() = user_id);

create policy "Users can insert their own aw" on public.activity_windows
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own aw" on public.activity_windows
  for update using (auth.uid() = user_id);

create policy "Users can delete their own aw" on public.activity_windows
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 完了
-- =====================================================================
