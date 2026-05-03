-- =====================================================================
-- iter67-A: proposals + schedules テーブル新設
-- =====================================================================
-- 仕様: notes/05 §5 / notes/09 §1 / notes/18 §A-5
--
-- オーナー回答（iter67 着手時）反映:
-- - meetup_scheduled_aw_id 列は **作らない**（AW はマッチング専用）
-- - 待ち合わせ日時指定は meetup_scheduled_custom JSONB に集約
-- - 個人カレンダー = schedules（AW とは別の自分の予定）

-- ---------------------------------------------------------------------
-- 1. proposals（打診）
-- ---------------------------------------------------------------------

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,

  match_type text not null check (
    match_type in ('perfect', 'forward', 'backward')
  ),

  -- 提示物
  sender_have_ids uuid[] not null default '{}',
  sender_have_qtys integer[] not null default '{}',
  receiver_have_ids uuid[] not null default '{}',
  receiver_have_qtys integer[] not null default '{}',

  -- メッセージ
  message text check (message is null or length(message) <= 2000),
  message_tone text check (message_tone is null or message_tone in ('standard', 'casual', 'polite')),

  -- ステータス（09 §1 と一致）
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'negotiating', 'agreement_one_side', 'agreed', 'rejected', 'expired', 'cancelled')
  ),
  agreed_by_sender boolean not null default false,
  agreed_by_receiver boolean not null default false,

  -- 7日期限・延長
  last_action_at timestamptz,
  expires_at timestamptz,
  extension_count integer not null default 0,

  rejected_template text,

  -- 待ち合わせ
  meetup_type text check (meetup_type in ('now', 'scheduled')),
  meetup_now_minutes integer check (meetup_now_minutes in (5, 10, 15, 30)),
  -- meetup_scheduled_custom は { date, time, place_name, lat?, lng? }
  meetup_scheduled_custom jsonb,

  -- カレンダー公開（送信者の schedules + AW を相手が overlay 閲覧可）
  expose_calendar boolean not null default false,

  -- 個別募集経由の打診ならその id（直接打診なら null）
  listing_id uuid references public.listings(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.proposals is '打診（提案）。sender → receiver。09 §1 ライフサイクル。';

create index idx_proposals_sender on public.proposals(sender_id);
create index idx_proposals_receiver on public.proposals(receiver_id);
create index idx_proposals_status on public.proposals(status);
create index idx_proposals_expires_at on public.proposals(expires_at);

create trigger trg_proposals_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

alter table public.proposals enable row level security;

-- 自分が送信者 or 受信者の打診を読める
create policy "Users can read own proposals"
  on public.proposals for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 送信者として作成可
create policy "Users can insert proposals as sender"
  on public.proposals for insert
  with check (auth.uid() = sender_id);

-- 自分が送信者 or 受信者の打診を更新可
create policy "Users can update own proposals"
  on public.proposals for update
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 削除はステータス遷移経由で行うため、明示的な delete policy は作らない
-- （cancelled など status 更新で対応）

-- ---------------------------------------------------------------------
-- 2. schedules（自分の予定 = 個人カレンダー）
-- ---------------------------------------------------------------------
-- AW（合流可能枠）とは別の概念。仕事・友人との予定など、交換と無関係なスケジュール。
-- 打診時の「カレンダー公開」で AW + schedules を相手が overlay で閲覧可能。

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  all_day boolean not null default false,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schedules is '個人スケジュール（AW とは別、交換無関係の予定）';

create index idx_schedules_user on public.schedules(user_id);
create index idx_schedules_start_at on public.schedules(start_at);

create trigger trg_schedules_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

alter table public.schedules enable row level security;

-- 自分のスケジュールは自由に管理
create policy "Users manage own schedules"
  on public.schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 相手と打診関係 + expose_calendar=true なら、相手のスケジュールも閲覧可
create policy "Calendar disclosure: counterpart can read"
  on public.schedules for select
  using (
    exists (
      select 1 from public.proposals p
      where p.expose_calendar = true
        and p.status in ('sent', 'negotiating', 'agreement_one_side', 'agreed')
        and (
          (p.sender_id = schedules.user_id and p.receiver_id = auth.uid())
          or
          (p.receiver_id = schedules.user_id and p.sender_id = auth.uid())
        )
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
