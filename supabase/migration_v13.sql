-- مختبر المسؤول: انتخابات، لعبة الشهر، الدوري (يتخزن كله في app_settings.lab)
alter table public.app_settings add column if not exists lab jsonb not null default '{}'::jsonb;

create or replace function public.set_lab(p_player uuid, p_pin text, p_lab jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error', 'forbidden'); end if;
  update app_settings set lab = coalesce(p_lab, '{}'::jsonb) where id = 1;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_lab(uuid, text, jsonb) to anon, authenticated;
