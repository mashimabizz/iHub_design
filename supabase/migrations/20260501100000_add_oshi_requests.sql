-- =====================================================================
-- iter57: oshi_requests テーブル追加（推し追加リクエスト機能）
-- =====================================================================
-- 推し選択画面でマスタに無い推しが見つからない場合、ユーザーが
-- 運営に追加リクエストできるようにする。
-- 運営承認時に既存マスタへ統合（merged）or 新規追加（approved）の
-- いずれかを行い、自動で user_oshi に紐付ける。

-- ---------------------------------------------------------------------
-- 1. oshi_requests テーブル
-- ---------------------------------------------------------------------
create table public.oshi_requests (
  id uuid primary key default gen_random_uuid(),
  -- リクエスト主
  user_id uuid not null references auth.users(id) on delete cascade,
  -- ユーザー入力
  requested_name text not null check (length(requested_name) between 1 and 100),
  requested_genre_id uuid references public.genres_master(id) on delete set null,
  requested_kind text check (requested_kind in ('group', 'work', 'solo')),
  note text check (note is null or length(note) <= 500),
  -- 状態管理
  status text not null default 'pending' check (
    status in ('pending', 'merged', 'approved', 'rejected')
  ),
  -- 承認時に紐付ける groups_master の id
  --   merged   = 既存 master と統合 → その既存 ID
  --   approved = 新規追加 → その新規 ID
  approved_group_id uuid references public.groups_master(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text check (rejection_reason is null or length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_oshi_requests_user on public.oshi_requests(user_id);
create index idx_oshi_requests_status on public.oshi_requests(status);

comment on table public.oshi_requests is '推し追加リクエスト（運営承認管理）';
comment on column public.oshi_requests.status is 'pending=審査中, merged=既存master統合, approved=新規追加, rejected=却下';

-- updated_at 自動更新（既存の set_updated_at() を再利用）
create trigger trg_oshi_requests_updated_at
  before update on public.oshi_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RLS: ユーザーは自分のリクエストのみ操作可
-- ---------------------------------------------------------------------
alter table public.oshi_requests enable row level security;

create policy "Users can read their own requests" on public.oshi_requests
  for select using (auth.uid() = user_id);

create policy "Users can create their own requests" on public.oshi_requests
  for insert with check (auth.uid() = user_id);

-- pending な自分のリクエストのみ取り下げ可（rejected 等は履歴として残す）
create policy "Users can delete their own pending requests" on public.oshi_requests
  for delete using (auth.uid() = user_id and status = 'pending');

-- ※ status の更新は運営（service role）経由のみ。policy なし = denied

-- ---------------------------------------------------------------------
-- 3. 承認時に自動で user_oshi へ反映するトリガー
-- ---------------------------------------------------------------------
-- status が 'pending' から 'merged' / 'approved' に遷移し、かつ
-- approved_group_id がセットされていれば、user_oshi に自動追加する。

create or replace function public.handle_oshi_request_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_max_priority integer;
begin
  if (old.status = 'pending' and new.status in ('merged', 'approved'))
     and new.approved_group_id is not null then
    -- ユーザーの既存推し数を確認して priority を決める
    select coalesce(max(priority), 0) into v_max_priority
    from public.user_oshi
    where user_id = new.user_id;

    -- user_oshi に追加（同じ group_id が既にある場合はスキップ）
    insert into public.user_oshi (user_id, group_id, kind, priority)
    select new.user_id, new.approved_group_id, 'box', v_max_priority + 1
    where not exists (
      select 1 from public.user_oshi
      where user_id = new.user_id and group_id = new.approved_group_id
    );

    -- approved_at が未設定なら自動設定
    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_oshi_request_approval
  before update on public.oshi_requests
  for each row execute function public.handle_oshi_request_approval();

-- =====================================================================
-- 完了
-- =====================================================================
