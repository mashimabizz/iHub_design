-- =====================================================================
-- iter61.10: goods_inventory に character_request_id を追加
-- =====================================================================
-- 在庫登録時に「追加リクエスト中のメンバー」も選択肢に含めたい。
-- character_id (FK to characters_master) との二者択一で、
-- 承認 trigger で character_id に置換される。

-- ---------------------------------------------------------------------
-- 1. goods_inventory に character_request_id 追加
-- ---------------------------------------------------------------------
alter table public.goods_inventory
  add column if not exists character_request_id uuid
    references public.character_requests(id) on delete set null;

create index if not exists idx_goods_inventory_character_request
  on public.goods_inventory(character_request_id);

-- character_id と character_request_id は同時に持たない
-- （両方 null は OK = 「メンバー指定なし」）
alter table public.goods_inventory
  add constraint goods_inventory_character_xor
    check (character_id is null or character_request_id is null);

-- ---------------------------------------------------------------------
-- 2. handle_character_request_approval を拡張
-- ---------------------------------------------------------------------
-- 既存：user_oshi の character_request_id → character_id 置換
-- 追加：goods_inventory も同じ動作にする
create or replace function public.handle_character_request_approval()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.status = 'pending' and new.status in ('merged', 'approved'))
     and new.approved_character_id is not null then

    -- user_oshi の置換（既存）
    update public.user_oshi
       set character_id = new.approved_character_id,
           character_request_id = null
     where character_request_id = new.id
       and character_id is null;

    -- goods_inventory の置換（新規）
    update public.goods_inventory
       set character_id = new.approved_character_id,
           character_request_id = null
     where character_request_id = new.id
       and character_id is null;

    if new.approved_at is null then
      new.approved_at = now();
    end if;
  end if;

  -- rejected 時は user_oshi 削除（既存）
  -- goods_inventory はユーザーが手動で持っているため、削除はせず
  -- character_request_id を null にしてメンバー指定なしに戻す
  if (old.status = 'pending' and new.status = 'rejected') then
    delete from public.user_oshi
     where character_request_id = new.id;

    update public.goods_inventory
       set character_request_id = null
     where character_request_id = new.id;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- 完了
-- =====================================================================
