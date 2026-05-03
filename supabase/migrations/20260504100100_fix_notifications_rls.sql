-- =====================================================================
-- iter92: notifications RLS 修正（insert ポリシーを参加者経由に）
-- =====================================================================
-- 当初 insert 不可にしたが、server action から auth user として挿入する
-- 必要があるため、proposal / dispute の参加者なら参加者宛て通知を
-- 挿入できるようにする（自分宛ても相手宛ても OK）。

drop policy if exists "Notifications insert disabled for users"
  on public.notifications;

create policy "Participants insert notifications"
  on public.notifications for insert
  with check (
    -- proposal_id 紐づき：proposal 参加者経由
    (
      proposal_id is not null
      and exists (
        select 1 from public.proposals p
        where p.id = proposal_id
          and (p.sender_id = auth.uid() or p.receiver_id = auth.uid())
          and (p.sender_id = user_id or p.receiver_id = user_id)
      )
    )
    or
    -- dispute_id 紐づき：dispute 参加者経由
    (
      dispute_id is not null
      and exists (
        select 1 from public.disputes d
        where d.id = dispute_id
          and (d.reporter_id = auth.uid() or d.respondent_id = auth.uid())
          and (d.reporter_id = user_id or d.respondent_id = user_id)
      )
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
