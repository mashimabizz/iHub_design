-- =====================================================================
-- iter96: avatars Storage bucket セットアップ
-- =====================================================================
-- ユーザーアイコン画像用の Supabase Storage バケット。
-- パス構造: {user_id}/avatar.jpg（拡張子は upload 時に決定）
-- 公開バケット（プロフィール表示・チャットヘッダー等で参照されるため）

-- ---------------------------------------------------------------------
-- 1. bucket 作成
-- ---------------------------------------------------------------------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB（クロップ後の avatar は通常 100KB 程度なので余裕）
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. RLS ポリシー
-- ---------------------------------------------------------------------
-- 認証ユーザーは自分のディレクトリにのみアップロード可
create policy "Avatars: users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 公開バケットなので全員 SELECT 可
create policy "Avatars: anyone can view"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 自分の avatar のみ上書き可（upsert に必要）
create policy "Avatars: users can update their own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分の avatar のみ削除可
create policy "Avatars: users can delete their own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- 完了
-- =====================================================================
