-- =====================================================================
-- iter68-C: chat-photos Storage バケット作成
-- =====================================================================
-- 用途：取引チャットの写真メッセージ / 服装写真 / 取引証跡 すべて
-- 命名：{proposal_id}/{type}-{timestamp}.jpg
-- 公開：参加者のみ read（他は不可）

insert into storage.buckets (id, name, public)
values ('chat-photos', 'chat-photos', false)
on conflict (id) do nothing;

-- 自分が proposal の参加者なら read 可
create policy "Participants can read chat-photos"
  on storage.objects for select
  using (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from public.proposals p
      where p.id = (split_part(name, '/', 1))::uuid
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

-- 自分が proposal の参加者なら upload 可（パスは {proposal_id}/... のみ）
create policy "Participants can upload chat-photos"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from public.proposals p
      where p.id = (split_part(name, '/', 1))::uuid
        and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
    )
  );

-- 自分のアップロードした写真は削除可（誤投稿対応）
create policy "Users can delete their own chat-photos"
  on storage.objects for delete
  using (
    bucket_id = 'chat-photos'
    and owner = auth.uid()
  );

-- =====================================================================
-- 完了
-- =====================================================================
