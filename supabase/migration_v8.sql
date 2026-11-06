-- v8: أسلوب رسم الشخصيات يحدده المسؤول لكل لاعب
alter table public.players add column if not exists char_style text;
grant select (char_style) on public.players to anon, authenticated;

create or replace function public.set_char_style(p_player uuid, p_pin text, p_target uuid, p_style text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error', 'forbidden'); end if;
  if p_style is not null and p_style !~ '^[a-z]{1,8}$' then return jsonb_build_object('error', 'bad_input'); end if;
  update players set char_style = p_style where id = p_target;
  if not found then return jsonb_build_object('error', 'no_player'); end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_char_style(uuid, text, uuid, text) to anon, authenticated;
