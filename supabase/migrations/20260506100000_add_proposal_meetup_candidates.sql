-- =====================================================================
-- iter154.34: 打診の待ち合わせを「交換できる候補」複数件へ拡張
-- =====================================================================
-- 既存の meetup_start_at / meetup_end_at / meetup_place_name / meetup_lat / meetup_lng
-- は候補1（主候補）として維持する。新しい meetup_candidates には最大3件の
-- 候補を JSONB 配列で保存し、旧表示・取引チャットとの互換性を保つ。

alter table public.proposals
  add column if not exists meetup_candidates jsonb not null default '[]'::jsonb;

update public.proposals
set meetup_candidates = jsonb_build_array(
  jsonb_build_object(
    'startAt', meetup_start_at,
    'endAt', meetup_end_at,
    'placeName', meetup_place_name,
    'lat', meetup_lat,
    'lng', meetup_lng,
    'mode', 'scheduled'
  )
)
where meetup_start_at is not null
  and meetup_end_at is not null
  and meetup_place_name is not null
  and meetup_lat is not null
  and meetup_lng is not null
  and meetup_candidates = '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposals_meetup_candidates_array'
  ) then
    alter table public.proposals
      add constraint proposals_meetup_candidates_array
      check (
        jsonb_typeof(meetup_candidates) = 'array'
        and jsonb_array_length(meetup_candidates) <= 3
      );
  end if;
end $$;

comment on column public.proposals.meetup_candidates is
  '交換できる候補（最大3件）。候補1は既存 meetup_* 列にもミラーする。';

-- =====================================================================
-- 完了
-- =====================================================================
