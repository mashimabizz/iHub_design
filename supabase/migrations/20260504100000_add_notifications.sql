-- =====================================================================
-- iter92: notifications テーブル新設
-- =====================================================================
-- 仕様（設計議論結果）:
--
-- ユーザーがログインしていない時でも見逃せない重要イベントを記録し、
-- ホームヘッダーのベル🔔 + /notifications 一覧で既読・未読を管理する。
--
-- kind 一覧（コア）：
--   proposal_received   打診を受信した
--   proposal_accepted   自分の打診が承諾された（双方合意）
--   proposal_rejected   打診が拒否された
--   proposal_revised    打診が修正された（再打診）
--   evidence_added      取引証跡が届いた
--   trade_completed     取引が完了した（双方承認）
--   evaluation_received 評価が届いた
--   dispute_received    申告を受けた（被申告者）
--   dispute_responded   申告に反論された（申告者）
--   dispute_closed      申告に運営回答が届いた
--   cancel_requested    取引キャンセル要請
--   expires_soon        期限切れまであと 1 日
--
-- 設計方針:
-- - 1 ユーザーが受信した個別通知を行ベースで管理
-- - 既読は read_at で管理（null = 未読）
-- - link_path に遷移先を持たせる（/transactions/xxx, /disputes/xxx 等）
-- - 関連 proposal/dispute の id を optional FK で保持

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  kind text not null check (
    kind in (
      'proposal_received',
      'proposal_accepted',
      'proposal_rejected',
      'proposal_revised',
      'evidence_added',
      'trade_completed',
      'evaluation_received',
      'dispute_received',
      'dispute_responded',
      'dispute_closed',
      'cancel_requested',
      'expires_soon'
    )
  ),

  title text not null check (length(title) between 1 and 100),
  body text check (body is null or length(body) <= 500),

  link_path text check (link_path is null or length(link_path) <= 500),

  proposal_id uuid references public.proposals(id) on delete cascade,
  dispute_id uuid references public.disputes(id) on delete cascade,

  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread
  on public.notifications(user_id, read_at)
  where read_at is null;

create index idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

comment on table public.notifications is
  'ユーザー宛て通知（打診着信、合意、評価、申告など）。read_at で既読管理';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

-- 自分宛ての通知のみ参照可
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- 自分宛ての通知のみ更新可（既読化）
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- INSERT は service role / server action 経由（RLS 経路では制限）
create policy "Notifications insert disabled for users"
  on public.notifications for insert
  with check (false);

-- =====================================================================
-- 完了
-- =====================================================================
