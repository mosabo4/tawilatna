-- =========================================================
--  طاولتنا — التحديث 2: التصانيف ومعلومات BGG
-- =========================================================
alter table public.games add column if not exists category    text;
alter table public.games add column if not exists bgg_id      integer;
alter table public.games add column if not exists year        smallint;
alter table public.games add column if not exists max_minutes smallint;
alter table public.games add column if not exists weight      numeric(3,2);
create unique index if not exists games_bgg_idx on public.games(bgg_id) where bgg_id is not null;
grant select on public.games to anon, authenticated;

create or replace function public.save_game(p_player uuid, p_pin text, p_game jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid; v_added uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if coalesce(trim(p_game->>'name'),'') = '' then return jsonb_build_object('error','no_name'); end if;
  v_id := nullif(p_game->>'id','')::uuid;
  if v_id is null then
    insert into games(name, image_url, min_players, max_players, play_minutes, max_minutes, category, weight, bgg_id, year, owner_id, added_by)
    values (trim(p_game->>'name'), nullif(p_game->>'image_url',''),
            nullif(p_game->>'min_players','')::smallint, nullif(p_game->>'max_players','')::smallint,
            nullif(p_game->>'play_minutes','')::smallint, nullif(p_game->>'max_minutes','')::smallint,
            nullif(p_game->>'category',''), nullif(p_game->>'weight','')::numeric,
            nullif(p_game->>'bgg_id','')::integer, nullif(p_game->>'year','')::smallint,
            coalesce(nullif(p_game->>'owner_id','')::uuid, p_player), p_player)
    returning id into v_id;
  else
    select added_by into v_added from games where id = v_id;
    if not found then return jsonb_build_object('error','not_found'); end if;
    if v_added is distinct from p_player and not _is_admin(p_player) then
      return jsonb_build_object('error','forbidden');
    end if;
    update games set name = trim(p_game->>'name'),
      image_url = nullif(p_game->>'image_url',''),
      min_players = nullif(p_game->>'min_players','')::smallint,
      max_players = nullif(p_game->>'max_players','')::smallint,
      play_minutes = nullif(p_game->>'play_minutes','')::smallint,
      max_minutes = nullif(p_game->>'max_minutes','')::smallint,
      category = nullif(p_game->>'category',''),
      weight = nullif(p_game->>'weight','')::numeric,
      bgg_id = nullif(p_game->>'bgg_id','')::integer,
      year = nullif(p_game->>'year','')::smallint,
      owner_id = nullif(p_game->>'owner_id','')::uuid
    where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('error','dup_game');
end $$;
grant execute on function public.save_game(uuid, text, jsonb) to anon, authenticated;
