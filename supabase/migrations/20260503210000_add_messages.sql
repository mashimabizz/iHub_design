-- =====================================================================
-- iter68-A: messages テーブル新設（C-2 取引チャット用）
-- =====================================================================
-- 仕様：notes/05 §5、notes/08 §iter68-A
--
-- 1 proposal に紐づく取引チャット。合意 (status=agreed) 後の当日運用に使用。
-- ネゴ中（status=negotiating）にも使用可能（C-1.5 ネゴチャット）。
--
-- message_type:
--   text          : テキストメッセージ（body 必須）
--   photo         : 通常写真（photo_url 必須）
--   outfit_photo  : 服装写真（合流時の目印用）
--   location      : 現在地共有（lat / lng / label）
--   arrival_status: 到着ステータス変更（meta.status: enroute / arrived / left）
--   system        : システムメッセージ（合意・拒否・ネゴ等の自動投稿）

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,

  message_type text not null check (
    message_type in ('text', 'photo', 'outfit_photo', 'location', 'arrival_status', 'system')
  ),

  body text check (body is null or length(body) <= 2000),
  photo_url text,

  -- location 用
  location_lat numeric(9, 6),
  location_lng numeric(9, 6),
  location_label text check (location_label is null or length(location_label) <= 200),

  -- arrival_status / その他拡張
  meta jsonb,

  created_at timestamptz not null default now(),

  -- 型ごとの整合性 CHECK
  constraint messages_type_consistency check (
    case message_type
      when 'text' then body is not null
      when 'photo' then photo_url is not null
      when 'outfit_photo' then photo_url is not null
      when 'location' then location_lat is not null and location_lng is not null
      when 'arrival_status' then meta is not null
      when 'system' then body is not null
      else true
    end
  )
);

comment on table public.messages is
  '取引チャット（C-2）/ ネゴチャット（C-1.5）共用。1 proposal に紐づく';

create index idx_messages_proposal on public.messages(proposal_id);
create index idx_messages_proposal_created
  on public.messages(proposal_id, created_at);
create index idx_messages_sender on public.messages(sender_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.messages enable row level security;

-- 自分が proposal の sender or receiver なら SELECT 可
create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.proposals p
      where p.id = messages.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

-- 自分が participant かつ自分が sender なら INSERT 可
create policy "Participants can insert their own messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.proposals p
      where p.id = messages.proposal_id
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

-- UPDATE/DELETE は許可しない（チャットは追記型）
-- 必要なら個別に policy 追加

-- =====================================================================
-- 完了
-- =====================================================================
