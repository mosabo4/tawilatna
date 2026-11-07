-- v10: جوائز يشوفها الكل + أفعال الجوائز (طقطقة، توقعات، تحديات، فيتو...)
create table if not exists public.perks (
  player_id uuid primary key references public.players(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  kind text not null,
  target uuid references public.players(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  play_id uuid references public.plays(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists actions_time_idx on public.actions(created_at desc);
alter table public.perks enable row level security;
alter table public.actions enable row level security;
drop policy if exists perks_read on public.perks;
create policy perks_read on public.perks for select using (true);
drop policy if exists actions_read on public.actions;
create policy actions_read on public.actions for select using (true);
grant select on public.perks, public.actions to anon, authenticated;

create or replace function public.set_perks(p_player uuid, p_pin text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 4000 then return jsonb_build_object('error', 'bad_input'); end if;
  insert into perks(player_id, data, updated_at) values (p_player, p_data, now())
  on conflict (player_id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.add_action(p_player uuid, p_pin text, p_kind text, p_target uuid, p_game uuid, p_play uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_kind not in ('react','tease','baby','retitle','predict','bet','challenge','rematch','thanks','veto','opener','lucky','shelf','award','board','firstturn','gift','alert','immune','teampick','houserule','seat','swap','caption','hotseat','nick','godfather','box','guarantee','story','luckbox','risk') then return jsonb_build_object('error', 'bad_input'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 1000 then return jsonb_build_object('error', 'bad_input'); end if;
  if p_target = p_player and p_kind in ('tease','baby','retitle','challenge','lucky','caption','nick','godfather','gift','hotseat','swap') then return jsonb_build_object('error', 'bad_input'); end if;
  insert into actions(player_id, kind, target, game_id, play_id, data) values (p_player, p_kind, p_target, p_game, p_play, p_data) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.delete_action(p_player uuid, p_pin text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  delete from actions where id = p_id and (player_id = p_player or _is_admin(p_player));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_perks(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.add_action(uuid, text, text, uuid, uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.delete_action(uuid, text, uuid) to anon, authenticated;
