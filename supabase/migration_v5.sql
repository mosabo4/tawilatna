-- =========================================================
--  طاولتنا — التحديث 5: مفتاح المسؤول (رمز ثانوي يفتح أي حساب)
--  قيمة المفتاح نفسها ما تنحفظ هنا، تنضاف من ملف خاص عند المسؤول
-- =========================================================
create table if not exists public.master_key (
  id        int primary key default 1 check (id = 1),
  pin_hash  text not null
);
alter table public.master_key enable row level security;
revoke all on public.master_key from public, anon, authenticated;

create or replace function public._is_master(p_pin text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from master_key where pin_hash = crypt(coalesce(p_pin, ''), pin_hash));
$$;
revoke all on function public._is_master(text) from public, anon, authenticated;

create or replace function public._auth(p_player uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare h text; fails int; adm boolean;
begin
  select pin_hash, is_admin into h, adm from players where id = p_player;
  if h is null then return 'no_player'; end if;
  select count(*) into fails from pin_failures where player_id = p_player and at > now() - interval '10 minutes';
  if fails >= 8 then return 'locked'; end if;
  if _is_master(p_pin) then
    delete from pin_failures where player_id = p_player;
    return 'ok';
  end if;
  if crypt(coalesce(p_pin,''), h) = h then
    delete from pin_failures where player_id = p_player;
    if not adm and coalesce((select login_locked from app_settings where id = 1), false) then return 'closed'; end if;
    return 'ok';
  end if;
  insert into pin_failures(player_id) values (p_player);
  return 'bad_pin';
end $$;
revoke all on function public._auth(uuid, text) from public, anon, authenticated;

create or replace function public.login(p_player uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if _is_master(p_pin) then return jsonb_build_object('ok', true, 'm', true); end if;
  return jsonb_build_object('ok', true);
end $$;
