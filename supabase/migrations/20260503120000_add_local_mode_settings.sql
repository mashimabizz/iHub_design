-- =====================================================================
-- iter63 (Phase B): user_local_mode_settings 追加
-- =====================================================================
-- ホームの「現地交換モード」設定を永続化。
-- 1 ユーザー 1 行。
-- 仕様: notes/18 §B-3, notes/05 §3 (新節), notes/09 §10

create table public.user_local_mode_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  aw_id uuid references public.activity_windows(id) on delete set null,
  radius_m integer not null default 500
    check (radius_m >= 50 and radius_m <= 5000),
  selected_carrying_ids uuid[] not null default '{}',
  selected_wish_ids uuid[] not null default '{}',
  last_lat numeric(9, 6),
  last_lng numeric(9, 6),
  updated_at timestamptz not null default now()
);

comment on table public.user_local_mode_settings is
  'ホーム現地交換モードの設定永続化。1ユーザー1行。位置情報は ON 時に毎回 GPS で上書き。';

create trigger trg_user_local_mode_settings_updated_at
  before update on public.user_local_mode_settings
  for each row execute function public.set_updated_at();

alter table public.user_local_mode_settings enable row level security;

create policy "Users manage own local mode settings"
  on public.user_local_mode_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- 完了
-- =====================================================================
