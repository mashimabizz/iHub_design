-- =====================================================================
-- iter59: goods-photos Storage bucket セットアップ
-- =====================================================================
-- グッズ写真用の Supabase Storage バケット。
-- パス構造: {user_id}/{timestamp}_{random}.{ext}
-- 公開バケット（マッチング・公開プロフィール表示用）

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
  'goods-photos',
  'goods-photos',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. RLS ポリシー
-- ---------------------------------------------------------------------
-- 認証ユーザーは自分のディレクトリにのみアップロード可
create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'goods-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 公開バケットなので全員 SELECT 可
create policy "Anyone can view goods photos"
  on storage.objects for select
  using (bucket_id = 'goods-photos');

-- 自分の写真のみ削除可
create policy "Users can delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'goods-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分の写真のみ更新可（メタデータ等）
create policy "Users can update their own photos"
  on storage.objects for update
  using (
    bucket_id = 'goods-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- 完了
-- =====================================================================
