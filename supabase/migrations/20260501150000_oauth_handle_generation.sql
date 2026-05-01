-- =====================================================================
-- iter57: Google OAuth 対応 — handle/display_name 自動生成
-- =====================================================================
-- 既存 handle_new_user() は metadata に handle/display_name が必須前提だが、
-- Google OAuth でログインした場合は metadata に含まれないので NOT NULL 違反になる。
--
-- 改修内容:
-- - handle が無い場合 user_xxxxxxxx 形式でランダム生成（ユニーク保証）
-- - display_name は Google プロフィール（full_name, name）→ handle の順で fallback
-- - email_confirmed_at が既にある場合（OAuth など）は account_status='verified' で開始

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_handle text;
  v_display_name text;
  v_email_confirmed boolean;
begin
  v_handle := new.raw_user_meta_data->>'handle';
  v_display_name := new.raw_user_meta_data->>'display_name';
  v_email_confirmed := new.email_confirmed_at is not null;

  -- handle が無い or 短すぎる場合は user_xxxxxxxx 形式で自動生成（ユニーク保証）
  if v_handle is null or length(v_handle) < 3 then
    loop
      v_handle := 'user_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
      exit when not exists (select 1 from public.users where handle = v_handle);
    end loop;
  end if;

  -- display_name が無い場合: Google プロフィール → handle の順で fallback
  if v_display_name is null or length(v_display_name) < 1 then
    v_display_name := coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      v_handle
    );
  end if;

  insert into public.users (
    id,
    handle,
    display_name,
    account_status,
    email_verified_at
  ) values (
    new.id,
    v_handle,
    v_display_name,
    case when v_email_confirmed then 'verified' else 'registered' end,
    case when v_email_confirmed then now() else null end
  );
  return new;
end;
$$;

-- =====================================================================
-- 完了
-- =====================================================================
