-- =====================================================================
-- iter67.1: 待ち合わせを「時間帯 + 地図座標」型に統一
-- =====================================================================
-- 旧: meetup_type ('now'/'scheduled') + meetup_now_minutes + meetup_scheduled_custom JSONB
-- 新: meetup_start_at + meetup_end_at + meetup_place_name + meetup_lat + meetup_lng
--
-- 背景：
--   オーナー指示（iter67.1）で「いますぐ/日時指定」のトグル切替を廃止。
--   1 つのフォームで時間帯（start〜end）と地図上の座標を入力する形式に統一。
--   相手が現地交換モードなら、相手の AW の値が pre-fill される（UI 側の責務）。
--
-- データ移行：proposals テーブルの既存レコードは旧スキーマで status != 'draft' な
--   テストデータが残っている可能性がある。新スキーマの constraint を満たさないため
--   一旦全削除する（運用前なのでデータロストの懸念無し）。

-- 0. 既存レコードを全削除（テスト/旧スキーマデータ掃除）
delete from public.proposals;

-- 1. 新しいカラムを追加
alter table public.proposals
  add column meetup_start_at timestamptz,
  add column meetup_end_at timestamptz,
  add column meetup_place_name text,
  add column meetup_lat numeric(9, 6),
  add column meetup_lng numeric(9, 6);

-- 2. 制約：place_name 長さ
alter table public.proposals
  add constraint proposals_meetup_place_name_length
  check (meetup_place_name is null or length(meetup_place_name) <= 200);

-- 3. 旧列を削除
alter table public.proposals
  drop column if exists meetup_type,
  drop column if exists meetup_now_minutes,
  drop column if exists meetup_scheduled_custom;

-- 4. status='draft' 以外なら待ち合わせ必須
alter table public.proposals
  add constraint proposals_meetup_required
  check (
    status = 'draft'
    or (
      meetup_start_at is not null
      and meetup_end_at is not null
      and meetup_end_at > meetup_start_at
      and meetup_place_name is not null
      and meetup_lat is not null
      and meetup_lng is not null
    )
  );

-- =====================================================================
-- 完了
-- =====================================================================
