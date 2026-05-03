-- =====================================================================
-- iter68-D/E/F: 取引証跡 + 双方承認 + 評価 のサポート
-- =====================================================================
-- 仕様：
--   C-3 撮影：proposals.evidence_photo_url + evidence_taken_at + evidence_taken_by
--   C-3 双方承認：proposals.approved_by_sender / approved_by_receiver
--   C-3 完了：proposals.status='completed' + completed_at
--   C-3 評価：user_evaluations テーブル（1 取引につき 1 ユーザー 1 件）

-- 1. proposals に列追加
alter table public.proposals
  add column evidence_photo_url text,
  add column evidence_taken_at timestamptz,
  add column evidence_taken_by uuid references auth.users(id),
  add column approved_by_sender boolean not null default false,
  add column approved_by_receiver boolean not null default false,
  add column completed_at timestamptz;

-- 2. status 'completed' を許可（旧 CHECK を更新）
alter table public.proposals
  drop constraint if exists proposals_status_check;
alter table public.proposals
  add constraint proposals_status_check check (
    status in (
      'draft', 'sent', 'negotiating', 'agreement_one_side',
      'agreed', 'rejected', 'expired', 'cancelled', 'completed'
    )
  );

-- 3. user_evaluations テーブル新設
create table public.user_evaluations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  ratee_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  created_at timestamptz not null default now(),
  -- 1 proposal × 1 rater 1 件まで
  unique (proposal_id, rater_id)
);

comment on table public.user_evaluations is
  '取引完了後の相互評価（1 取引につき双方 1 件ずつ）';

create index idx_user_evaluations_proposal on public.user_evaluations(proposal_id);
create index idx_user_evaluations_ratee on public.user_evaluations(ratee_id);

-- RLS
alter table public.user_evaluations enable row level security;

-- 自分の評価は自分のみ作成可、両者が読める
create policy "Participants can read evaluations"
  on public.user_evaluations for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = user_evaluations.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

create policy "Users can create their own evaluations"
  on public.user_evaluations for insert
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from public.proposals p
      where p.id = user_evaluations.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
        and p.status = 'completed'
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
