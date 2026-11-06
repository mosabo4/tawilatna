-- v9: مشاهد الرئيسية تنحفظ في القاعدة عشان يشوفها الكل
create table if not exists public.scenes (
  player_id uuid primary key references public.players(id) on delete cascade,
  target uuid not null references public.players(id) on delete cascade,
  action text not null default 'punch',
  updated_at timestamptz not null default now()
);
alter table public.scenes enable row level security;
drop policy if exists scenes_read on public.scenes;
create policy scenes_read on public.scenes for select using (true);
grant select on public.scenes to anon, authenticated;

create or replace function public.set_scene(p_player uuid, p_pin text, p_target uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_target is null then delete from scenes where player_id = p_player; return jsonb_build_object('ok', true); end if;
  if p_target = p_player or coalesce(p_action, '') !~ '^[a-z]{1,12}$' then return jsonb_build_object('error', 'bad_input'); end if;
  insert into scenes(player_id, target, action, updated_at) values (p_player, p_target, p_action, now())
  on conflict (player_id) do update set target = excluded.target, action = excluded.action, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_scene(uuid, text, uuid, text) to anon, authenticated;
