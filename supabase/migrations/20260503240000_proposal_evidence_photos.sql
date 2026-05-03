-- =====================================================================
-- iter68.1-A: proposal_evidence_photos テーブル新設（複数枚対応）
-- =====================================================================
-- 旧：proposals.evidence_photo_url（単一）→ keep するが新規ロジックは別テーブル
-- 新：proposal_evidence_photos に複数枚保存、position で並び順管理

create table public.proposal_evidence_photos (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  photo_url text not null,
  position integer not null,
  taken_at timestamptz not null default now(),
  taken_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, position)
);

comment on table public.proposal_evidence_photos is
  '取引証跡（複数枚対応、追記＋撮影者削除可）';

create index idx_proposal_evidence_photos_proposal
  on public.proposal_evidence_photos(proposal_id);

-- RLS
alter table public.proposal_evidence_photos enable row level security;

create policy "Participants can read evidence photos"
  on public.proposal_evidence_photos for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_evidence_photos.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

create policy "Participants can insert evidence photos"
  on public.proposal_evidence_photos for insert
  with check (
    auth.uid() = taken_by
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_evidence_photos.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
        and p.status = 'agreed'
    )
  );

create policy "Users can delete their own evidence photos"
  on public.proposal_evidence_photos for delete
  using (
    taken_by = auth.uid()
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_evidence_photos.proposal_id
        and p.status = 'agreed'
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
