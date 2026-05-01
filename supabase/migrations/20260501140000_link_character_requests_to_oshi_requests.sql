-- =====================================================================
-- iter57: 審査中グループに紐づくメンバーリクエストにも対応
-- =====================================================================
-- 例: ユーザーA が新グループ「LUMENA」を推しリクエスト（oshi_requests pending）
--    → ユーザーA or B が「LUMENA のスア」をメンバーリクエストしたい
-- character_requests に oshi_request_id を追加し、親が groups_master か
-- oshi_requests のいずれかを参照可能にする。

-- ---------------------------------------------------------------------
-- 1. character_requests に oshi_request_id を追加
-- ---------------------------------------------------------------------
alter table public.character_requests
  add column oshi_request_id uuid references public.oshi_requests(id) on delete cascade;

-- group_id を NULL 許可に変更（oshi_request_id を使う場合は group_id NULL）
alter table public.character_requests
  alter column group_id drop not null;

-- check 制約：group_id か oshi_request_id のいずれかが必須
alter table public.character_requests
  add constraint character_requests_parent_required
  check (group_id is not null or oshi_request_id is not null);

create index idx_character_requests_oshi_request
  on public.character_requests(oshi_request_id);

-- ---------------------------------------------------------------------
-- 2. oshi_request の承認時、紐づく character_requests も自動更新
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

    -- リンクされている全 user_oshi を group_id 紐付けに変換
    update public.user_oshi
       set group_id = new.approved_group_id,
           oshi_request_id = null
     where oshi_request_id = new.id
       and group_id is null;

    -- 紐づく character_requests を group_id 紐付けに変換
    update public.character_requests
       set group_id = new.approved_group_id,
           oshi_request_id = null
     where oshi_request_id = new.id
       and group_id is null;

    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  -- rejected 時はリンクされた user_oshi を全削除
  -- character_requests は ON DELETE CASCADE 経由で連鎖削除される
  if (old.status = 'pending' and new.status = 'rejected') then
    delete from public.user_oshi
     where oshi_request_id = new.id;
    delete from public.character_requests
     where oshi_request_id = new.id;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- 完了
-- =====================================================================
