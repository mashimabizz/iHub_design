-- =====================================================================
-- iter57: メンバー追加リクエスト機能（character_requests）
-- =====================================================================
-- メンバー選択画面でマスタに無いメンバー/キャラが見つからない場合、
-- ユーザーが運営に追加リクエストできるようにする。
-- 推しグループ追加リクエスト（oshi_requests）と同じパターン。

-- ---------------------------------------------------------------------
-- 1. character_requests テーブル
-- ---------------------------------------------------------------------
create table public.character_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- どのグループのメンバーか（必須）
  group_id uuid not null references public.groups_master(id) on delete cascade,
  -- ユーザー入力
  requested_name text not null check (length(requested_name) between 1 and 100),
  note text check (note is null or length(note) <= 500),
  -- 状態管理
  status text not null default 'pending' check (
    status in ('pending', 'merged', 'approved', 'rejected')
  ),
  -- 承認時に紐付ける characters_master.id
  approved_character_id uuid references public.characters_master(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text check (rejection_reason is null or length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_character_requests_user on public.character_requests(user_id);
create index idx_character_requests_group on public.character_requests(group_id);
create index idx_character_requests_status on public.character_requests(status);

comment on table public.character_requests is 'メンバー追加リクエスト（グループ単位の運営承認）';

create trigger trg_character_requests_updated_at
  before update on public.character_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RLS: 誰でも pending を読める（共有）+ 自分のだけ作成・削除可
-- ---------------------------------------------------------------------
alter table public.character_requests enable row level security;

create policy "Anyone can read character_requests" on public.character_requests
  for select using (true);

create policy "Users can create their own character_requests" on public.character_requests
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own pending character_requests" on public.character_requests
  for delete using (auth.uid() = user_id and status = 'pending');

-- ---------------------------------------------------------------------
-- 3. user_oshi に character_request_id カラム追加
-- ---------------------------------------------------------------------
alter table public.user_oshi
  add column character_request_id uuid references public.character_requests(id) on delete set null;

create index idx_user_oshi_character_request on public.user_oshi(character_request_id);

-- check 制約更新（4種のいずれかが必須）
alter table public.user_oshi drop constraint user_oshi_target_required;

alter table public.user_oshi
  add constraint user_oshi_target_required
  check (
    group_id is not null
    or character_id is not null
    or oshi_request_id is not null
    or character_request_id is not null
  );

-- ---------------------------------------------------------------------
-- 4. 承認トリガー
-- ---------------------------------------------------------------------
create or replace function public.handle_character_request_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.status = 'pending' and new.status in ('merged', 'approved'))
     and new.approved_character_id is not null then

    -- このリクエストを参照している全 user_oshi を character_id 紐付けに変換
    update public.user_oshi
       set character_id = new.approved_character_id,
           character_request_id = null
     where character_request_id = new.id
       and character_id is null;

    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  -- rejected 時は該当 user_oshi を削除
  if (old.status = 'pending' and new.status = 'rejected') then
    delete from public.user_oshi
     where character_request_id = new.id;
  end if;

  return new;
end;
$$;

create trigger trg_character_request_approval
  before update on public.character_requests
  for each row execute function public.handle_character_request_approval();

-- =====================================================================
-- 完了
-- =====================================================================
