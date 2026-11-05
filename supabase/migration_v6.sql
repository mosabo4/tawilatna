-- =========================================================
--  طاولتنا — التحديث 6: الإضافات (Expansions)
-- =========================================================
alter table public.games add column if not exists base_game_id uuid references public.games(id) on delete set null;

-- الإضافات الموجودة عندنا
update public.games e set base_game_id = b.id from public.games b
where (e.name, b.name) in (
  ('Catan: 5–6 Player Extension', 'Catan'),
  ('Catan: Cities & Knights', 'Catan'),
  ('Clank! Adventuring Party', 'Clank!: A Deck-Building Adventure'),
  ('Coup: Reformation', 'Coup')
) and e.base_game_id is null;

-- الإضافات اللي انلعبت مع كل قيم
create table if not exists public.play_expansions (
  play_id  uuid not null references public.plays(id) on delete cascade,
  game_id  uuid not null references public.games(id) on delete cascade,
  primary key (play_id, game_id)
);
-- أقيام انسجلت على الإضافة نفسها: نحولها للعبة الأصلية ونعلّم الإضافة
insert into public.play_expansions(play_id, game_id)
select p.id, g.id from public.plays p join public.games g on g.id = p.game_id where g.base_game_id is not null
on conflict do nothing;
update public.plays p set game_id = g.base_game_id from public.games g where g.id = p.game_id and g.base_game_id is not null;

-- تقييم الإضافة = كم تزيد أو تنقص من تقييم اللعبة الأصلية
create table if not exists public.expansion_ratings (
  expansion_id uuid not null references public.games(id) on delete cascade,
  player_id    uuid not null references public.players(id) on delete cascade,
  delta        numeric(2,1) not null check (delta between -3 and 3),
  updated_at   timestamptz not null default now(),
  primary key (expansion_id, player_id)
);

alter table public.play_expansions enable row level security;
alter table public.expansion_ratings enable row level security;
revoke all on public.play_expansions, public.expansion_ratings from anon, authenticated;
grant select on public.play_expansions, public.expansion_ratings to anon, authenticated;
drop policy if exists read_all on public.play_expansions;
drop policy if exists read_all on public.expansion_ratings;
create policy read_all on public.play_expansions for select using (true);
create policy read_all on public.expansion_ratings for select using (true);

create or replace function public.set_exp_rating(p_player uuid, p_pin text, p_exp uuid, p_delta numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not exists (select 1 from games where id = p_exp and base_game_id is not null) then return jsonb_build_object('error','not_found'); end if;
  if p_delta is null then
    delete from expansion_ratings where expansion_id = p_exp and player_id = p_player;
  else
    if p_delta < -3 or p_delta > 3 then return jsonb_build_object('error','bad_score'); end if;
    insert into expansion_ratings(expansion_id, player_id, delta) values (p_exp, p_player, p_delta)
    on conflict (expansion_id, player_id) do update set delta = excluded.delta, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_play_expansions(p_player uuid, p_pin text, p_play uuid, p_games uuid[])
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_base uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  select game_id into v_base from plays where id = p_play;
  if v_base is null then return jsonb_build_object('error','not_found'); end if;
  if not _is_admin(p_player) and not exists (select 1 from play_results where play_id = p_play and player_id = p_player)
     and not exists (select 1 from plays where id = p_play and created_by = p_player) then
    return jsonb_build_object('error','forbidden');
  end if;
  delete from play_expansions where play_id = p_play;
  insert into play_expansions(play_id, game_id)
  select p_play, g.id from games g where g.id = any(coalesce(p_games, '{}')) and g.base_game_id = v_base;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_game_base(p_player uuid, p_pin text, p_game uuid, p_base uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_base = p_game then return jsonb_build_object('error','bad_base'); end if;
  if p_base is not null and exists (select 1 from games where id = p_base and base_game_id is not null) then return jsonb_build_object('error','bad_base'); end if;
  update games set base_game_id = p_base where id = p_game;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.set_exp_rating(uuid, text, uuid, numeric), public.set_play_expansions(uuid, text, uuid, uuid[]), public.set_game_base(uuid, text, uuid, uuid) to anon, authenticated;
