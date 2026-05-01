-- =====================================================================
-- iter57: 審査中の oshi_requests を全ユーザーで共有可能に
-- =====================================================================
-- 同じ推しを複数人がリクエストする無駄を避け、誰かがリクエストした
-- 「審査中」アイテムを他のユーザーも選択できるようにする。
-- 承認時には、そのリクエストにリンクされている全ユーザーの user_oshi に
-- 一括で group_id を反映する。

-- ---------------------------------------------------------------------
-- 1. user_oshi に oshi_request_id カラム追加
-- ---------------------------------------------------------------------
alter table public.user_oshi
  add column oshi_request_id uuid references public.oshi_requests(id) on delete set null;

create index idx_user_oshi_request on public.user_oshi(oshi_request_id);

-- 既存 check 制約（group_id or character_id）を更新
-- → group_id / character_id / oshi_request_id のどれかが必須
alter table public.user_oshi
  drop constraint user_oshi_check;

alter table public.user_oshi
  add constraint user_oshi_target_required
  check (
    group_id is not null
    or character_id is not null
    or oshi_request_id is not null
  );

-- ---------------------------------------------------------------------
-- 2. oshi_requests の RLS 緩和：pending は誰でも読める
-- ---------------------------------------------------------------------
-- 既存の「自分のだけ読める」policy をいったん削除して、より緩い policy を入れる
drop policy if exists "Users can read their own requests" on public.oshi_requests;

-- 誰でも全ステータスを読める（履歴表示・他人の審査中アイテム選択用）
-- 個人情報は requested_name 等に含まないため公開可
create policy "Anyone can read oshi_requests" on public.oshi_requests
  for select using (true);

-- ---------------------------------------------------------------------
-- 3. 承認トリガー改修：リンクされている全 user_oshi を一括更新
-- ---------------------------------------------------------------------
-- 既存の handle_oshi_request_approval を上書き

create or replace function public.handle_oshi_request_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.status = 'pending' and new.status in ('merged', 'approved'))
     and new.approved_group_id is not null then

    -- このリクエストを oshi_request_id で参照している全ての user_oshi を
    -- group_id 紐付けに変換（複数ユーザー対応）
    update public.user_oshi
       set group_id = new.approved_group_id,
           oshi_request_id = null
     where oshi_request_id = new.id
       and group_id is null;

    -- approved_at が未設定なら自動設定
    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  -- rejected 時はリンクされている user_oshi を全削除
  if (old.status = 'pending' and new.status = 'rejected') then
    delete from public.user_oshi
     where oshi_request_id = new.id;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- 完了
-- =====================================================================
