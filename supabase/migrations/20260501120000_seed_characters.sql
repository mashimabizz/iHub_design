-- =====================================================================
-- iter57: K-POP 主要 5グループのメンバー seed
-- =====================================================================
-- BTS / TWICE / NewJeans / IVE / aespa のメンバーを characters_master に
-- 登録する。Onboarding 3/4 のメンバー選択画面で使用。

do $$
declare
  v_bts_id uuid;
  v_twice_id uuid;
  v_newjeans_id uuid;
  v_ive_id uuid;
  v_aespa_id uuid;
  v_kpop_genre_id uuid;
begin
  select id into v_kpop_genre_id from public.genres_master where name = 'K-POP';
  select id into v_bts_id from public.groups_master where name = 'BTS';
  select id into v_twice_id from public.groups_master where name = 'TWICE';
  select id into v_newjeans_id from public.groups_master where name = 'NewJeans';
  select id into v_ive_id from public.groups_master where name = 'IVE';
  select id into v_aespa_id from public.groups_master where name = 'aespa';

  insert into public.characters_master (group_id, genre_id, name, aliases, display_order) values
    -- BTS（リーダー順）
    (v_bts_id, v_kpop_genre_id, 'RM', array['김남준', 'ナムジュン', 'ラップモンスター'], 1),
    (v_bts_id, v_kpop_genre_id, 'ジン', array['김석진', 'Jin', 'ソクジン'], 2),
    (v_bts_id, v_kpop_genre_id, 'SUGA', array['민윤기', 'シュガ', 'ユンギ', 'AgustD'], 3),
    (v_bts_id, v_kpop_genre_id, 'j-hope', array['정호석', 'ジェイホープ', 'ホソク'], 4),
    (v_bts_id, v_kpop_genre_id, 'ジミン', array['박지민', 'Jimin'], 5),
    (v_bts_id, v_kpop_genre_id, 'V', array['김태형', 'テヒョン', 'ブイ'], 6),
    (v_bts_id, v_kpop_genre_id, 'ジョングク', array['전정국', 'JK', 'Jungkook', 'グク'], 7),
    -- TWICE（年齢順）
    (v_twice_id, v_kpop_genre_id, 'ナヨン', array['나연', 'NAYEON'], 1),
    (v_twice_id, v_kpop_genre_id, 'ジョンヨン', array['정연', 'JEONGYEON'], 2),
    (v_twice_id, v_kpop_genre_id, 'モモ', array['모모', 'MOMO'], 3),
    (v_twice_id, v_kpop_genre_id, 'サナ', array['사나', 'SANA'], 4),
    (v_twice_id, v_kpop_genre_id, 'ジヒョ', array['지효', 'JIHYO'], 5),
    (v_twice_id, v_kpop_genre_id, 'ミナ', array['미나', 'MINA'], 6),
    (v_twice_id, v_kpop_genre_id, 'ダヒョン', array['다현', 'DAHYUN'], 7),
    (v_twice_id, v_kpop_genre_id, 'チェヨン', array['채영', 'CHAEYOUNG'], 8),
    (v_twice_id, v_kpop_genre_id, 'ツウィ', array['쯔위', 'TZUYU'], 9),
    -- NewJeans
    (v_newjeans_id, v_kpop_genre_id, 'ミンジ', array['민지', 'MINJI'], 1),
    (v_newjeans_id, v_kpop_genre_id, 'ハニ', array['하니', 'HANNI'], 2),
    (v_newjeans_id, v_kpop_genre_id, 'ダニエル', array['다니엘', 'DANIELLE'], 3),
    (v_newjeans_id, v_kpop_genre_id, 'ヘリン', array['해린', 'HAERIN'], 4),
    (v_newjeans_id, v_kpop_genre_id, 'ヘイン', array['혜인', 'HYEIN'], 5),
    -- IVE
    (v_ive_id, v_kpop_genre_id, 'ユジン', array['유진', 'YUJIN', 'アンユジン'], 1),
    (v_ive_id, v_kpop_genre_id, 'ガウル', array['가을', 'GAEUL'], 2),
    (v_ive_id, v_kpop_genre_id, 'レイ', array['레이', 'REI'], 3),
    (v_ive_id, v_kpop_genre_id, 'ウォニョン', array['원영', 'WONYOUNG', 'チャンウォニョン'], 4),
    (v_ive_id, v_kpop_genre_id, 'リズ', array['리즈', 'LIZ'], 5),
    (v_ive_id, v_kpop_genre_id, 'イソ', array['이서', 'LEESEO'], 6),
    -- aespa
    (v_aespa_id, v_kpop_genre_id, 'カリナ', array['카리나', 'KARINA'], 1),
    (v_aespa_id, v_kpop_genre_id, 'ジゼル', array['지젤', 'GISELLE'], 2),
    (v_aespa_id, v_kpop_genre_id, 'ウィンター', array['윈터', 'WINTER'], 3),
    (v_aespa_id, v_kpop_genre_id, 'ニンニン', array['닝닝', 'NINGNING'], 4);
end $$;

-- =====================================================================
-- 完了
-- =====================================================================
