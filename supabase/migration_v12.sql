-- أصوات متعددة للجلسة الجاية + منع التصويت على لعبة جربتها
alter table public.friday_picks add column if not exists votes smallint not null default 1 check (votes between 1 and 4);

create or replace function public.toggle_friday(p_player uuid, p_pin text, p_week date, p_game uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if extract(isodow from p_week) <> 5 then return jsonb_build_object('error', 'bad_week'); end if;
  if exists (select 1 from friday_picks where week = p_week and game_id = p_game and player_id = p_player) then
    delete from friday_picks where week = p_week and game_id = p_game and player_id = p_player;
    return jsonb_build_object('ok', true, 'picked', false);
  end if;
  if exists (select 1 from plays pl join play_results r on r.play_id = pl.id where pl.game_id = p_game and r.player_id = p_player) then
    return jsonb_build_object('error', 'already_played');
  end if;
  insert into friday_picks(week, game_id, player_id, votes) values (p_week, p_game, p_player, 1);
  return jsonb_build_object('ok', true, 'picked', true);
end $$;

create or replace function public.set_friday_votes(p_player uuid, p_pin text, p_week date, p_game uuid, p_votes int)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if extract(isodow from p_week) <> 5 then return jsonb_build_object('error', 'bad_week'); end if;
  if p_votes <= 0 then
    delete from friday_picks where week = p_week and game_id = p_game and player_id = p_player;
    return jsonb_build_object('ok', true);
  end if;
  if exists (select 1 from plays pl join play_results r on r.play_id = pl.id where pl.game_id = p_game and r.player_id = p_player) then
    return jsonb_build_object('error', 'already_played');
  end if;
  insert into friday_picks(week, game_id, player_id, votes) values (p_week, p_game, p_player, least(p_votes, 4))
  on conflict (week, game_id, player_id) do update set votes = least(p_votes, 4);
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.toggle_friday(uuid, text, date, uuid), public.set_friday_votes(uuid, text, date, uuid, int) to anon, authenticated;
