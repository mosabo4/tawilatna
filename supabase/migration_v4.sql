-- =========================================================
--  طاولتنا — التحديث 4: قفل الدخول مؤقتاً (المسؤول بس يدخل)
-- =========================================================
create table if not exists public.app_settings (
  id            int primary key default 1 check (id = 1),
  login_locked  boolean not null default false
);
insert into public.app_settings(id, login_locked) values (1, true)
on conflict (id) do update set login_locked = true;

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
drop policy if exists read_all on public.app_settings;
create policy read_all on public.app_settings for select using (true);

-- نفس التحقق السابق، وإذا الدخول مقفل يرفض غير المسؤول (بعد ما يتأكد من الرمز)
create or replace function public._auth(p_player uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare h text; fails int; adm boolean;
begin
  select pin_hash, is_admin into h, adm from players where id = p_player;
  if h is null then return 'no_player'; end if;
  select count(*) into fails from pin_failures where player_id = p_player and at > now() - interval '10 minutes';
  if fails >= 8 then return 'locked'; end if;
  if crypt(coalesce(p_pin,''), h) = h then
    delete from pin_failures where player_id = p_player;
    if not adm and coalesce((select login_locked from app_settings where id = 1), false) then return 'closed'; end if;
    return 'ok';
  end if;
  insert into pin_failures(player_id) values (p_player);
  return 'bad_pin';
end $$;
revoke all on function public._auth(uuid, text) from public, anon, authenticated;

create or replace function public.set_login_lock(p_player uuid, p_pin text, p_locked boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error', 'forbidden'); end if;
  update app_settings set login_locked = p_locked where id = 1;
  return jsonb_build_object('ok', true, 'locked', p_locked);
end $$;
grant execute on function public.set_login_lock(uuid, text, boolean) to anon, authenticated;
