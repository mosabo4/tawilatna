-- =========================================================
--  طاولتنا — قاعدة بيانات Supabase
--  شغّل هذا الملف كاملاً مرة واحدة في: SQL Editor ← New query ← Run
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- الجداول ----------
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  color       text not null default '#888888',
  is_admin    boolean not null default false,
  pin_hash    text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.games (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  image_url     text,
  min_players   smallint,
  max_players   smallint,
  play_minutes  smallint,
  owner_id      uuid references public.players(id) on delete set null,
  added_by      uuid references public.players(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.plays (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  played_on   date not null default current_date,
  notes       text,
  created_by  uuid references public.players(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.play_results (
  play_id    uuid not null references public.plays(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  position   smallint not null check (position >= 1),
  score      integer,
  primary key (play_id, player_id)
);

create table if not exists public.ratings (
  game_id     uuid not null references public.games(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  score       numeric(3,1) not null check (score >= 1 and score <= 10),
  updated_at  timestamptz not null default now(),
  primary key (game_id, player_id)
);

create table if not exists public.pin_failures (
  player_id  uuid not null references public.players(id) on delete cascade,
  at         timestamptz not null default now()
);

create index if not exists plays_game_idx on public.plays(game_id);
create index if not exists results_player_idx on public.play_results(player_id);
create index if not exists pin_failures_idx on public.pin_failures(player_id, at);

-- ---------- الصلاحيات: القراءة للجميع، الكتابة فقط عبر الدوال ----------
alter table public.players      enable row level security;
alter table public.games        enable row level security;
alter table public.plays        enable row level security;
alter table public.play_results enable row level security;
alter table public.ratings      enable row level security;
alter table public.pin_failures enable row level security;

revoke all on public.players, public.games, public.plays, public.play_results,
              public.ratings, public.pin_failures from anon, authenticated;

grant select (id, name, color, is_admin, created_at) on public.players to anon, authenticated;
grant select on public.games, public.plays, public.play_results, public.ratings to anon, authenticated;

drop policy if exists read_all on public.players;
drop policy if exists read_all on public.games;
drop policy if exists read_all on public.plays;
drop policy if exists read_all on public.play_results;
drop policy if exists read_all on public.ratings;
create policy read_all on public.players      for select using (true);
create policy read_all on public.games        for select using (true);
create policy read_all on public.plays        for select using (true);
create policy read_all on public.play_results for select using (true);
create policy read_all on public.ratings      for select using (true);

-- ---------- التحقق من الرمز (يقفل بعد 8 محاولات خاطئة خلال 10 دقائق) ----------
create or replace function public._auth(p_player uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare h text; fails int;
begin
  select pin_hash into h from players where id = p_player;
  if h is null then return 'no_player'; end if;
  select count(*) into fails from pin_failures where player_id = p_player and at > now() - interval '10 minutes';
  if fails >= 8 then return 'locked'; end if;
  if crypt(coalesce(p_pin,''), h) = h then
    delete from pin_failures where player_id = p_player;
    return 'ok';
  end if;
  insert into pin_failures(player_id) values (p_player);
  return 'bad_pin';
end $$;

create or replace function public._is_admin(p_player uuid)
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select is_admin from players where id = p_player), false)
$$;

-- دخول
create or replace function public.login(p_player uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  return jsonb_build_object('ok', true);
end $$;

-- تقييم لعبة (score = null يحذف التقييم)
create or replace function public.set_rating(p_player uuid, p_pin text, p_game uuid, p_score numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_score is null then
    delete from ratings where game_id = p_game and player_id = p_player;
  else
    if p_score < 1 or p_score > 10 then return jsonb_build_object('error','bad_score'); end if;
    insert into ratings(game_id, player_id, score) values (p_game, p_player, round(p_score*2)/2)
    on conflict (game_id, player_id) do update set score = excluded.score, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- تسجيل قيم أو تعديله
-- p_play = {"id": اختياري, "game_id": "...", "played_on": "2026-10-31", "notes": "...",
--           "results": [{"player_id": "...", "position": 1, "score": 54}, ...]}
create or replace function public.save_play(p_player uuid, p_pin text, p_play jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid; v_creator uuid; r jsonb;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if jsonb_array_length(coalesce(p_play->'results','[]'::jsonb)) < 1 then
    return jsonb_build_object('error','no_players');
  end if;
  v_id := nullif(p_play->>'id','')::uuid;
  if v_id is null then
    insert into plays(game_id, played_on, notes, created_by)
    values ((p_play->>'game_id')::uuid, coalesce((p_play->>'played_on')::date, current_date),
            nullif(p_play->>'notes',''), p_player)
    returning id into v_id;
  else
    select created_by into v_creator from plays where id = v_id;
    if not found then return jsonb_build_object('error','not_found'); end if;
    if v_creator is distinct from p_player and not _is_admin(p_player) then
      return jsonb_build_object('error','forbidden');
    end if;
    update plays set game_id = (p_play->>'game_id')::uuid,
                     played_on = coalesce((p_play->>'played_on')::date, played_on),
                     notes = nullif(p_play->>'notes','')
    where id = v_id;
    delete from play_results where play_id = v_id;
  end if;
  for r in select * from jsonb_array_elements(p_play->'results') loop
    insert into play_results(play_id, player_id, position, score)
    values (v_id, (r->>'player_id')::uuid, (r->>'position')::smallint, nullif(r->>'score','')::int);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.delete_play(p_player uuid, p_pin text, p_play uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_creator uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  select created_by into v_creator from plays where id = p_play;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if v_creator is distinct from p_player and not _is_admin(p_player) then
    return jsonb_build_object('error','forbidden');
  end if;
  delete from plays where id = p_play;
  return jsonb_build_object('ok', true);
end $$;

-- إضافة لعبة أو تعديلها (الإضافة لأي لاعب، التعديل لمن أضافها أو المسؤول)
create or replace function public.save_game(p_player uuid, p_pin text, p_game jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid; v_added uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if coalesce(trim(p_game->>'name'),'') = '' then return jsonb_build_object('error','no_name'); end if;
  v_id := nullif(p_game->>'id','')::uuid;
  if v_id is null then
    insert into games(name, image_url, min_players, max_players, play_minutes, owner_id, added_by)
    values (trim(p_game->>'name'), nullif(p_game->>'image_url',''),
            nullif(p_game->>'min_players','')::smallint, nullif(p_game->>'max_players','')::smallint,
            nullif(p_game->>'play_minutes','')::smallint,
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
      owner_id = nullif(p_game->>'owner_id','')::uuid
    where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.delete_game(p_player uuid, p_pin text, p_game uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error','forbidden'); end if;
  delete from games where id = p_game;
  return jsonb_build_object('ok', true);
end $$;

-- تغيير رمزي
create or replace function public.change_pin(p_player uuid, p_pin text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_new_pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error','bad_new_pin'); end if;
  update players set pin_hash = crypt(p_new_pin, gen_salt('bf')) where id = p_player;
  return jsonb_build_object('ok', true);
end $$;

-- المسؤول: إضافة/تعديل لاعب (p_data = {"id"?, "name", "color", "is_admin", "pin"?})
create or replace function public.save_player(p_player uuid, p_pin text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid; v_pin text := nullif(p_data->>'pin','');
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error','forbidden'); end if;
  if v_pin is not null and v_pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error','bad_new_pin'); end if;
  v_id := nullif(p_data->>'id','')::uuid;
  if v_id is null then
    if v_pin is null then return jsonb_build_object('error','bad_new_pin'); end if;
    insert into players(name, color, is_admin, pin_hash)
    values (trim(p_data->>'name'), coalesce(p_data->>'color','#888888'),
            coalesce((p_data->>'is_admin')::boolean, false), crypt(v_pin, gen_salt('bf')))
    returning id into v_id;
  else
    update players set name = trim(p_data->>'name'),
      color = coalesce(p_data->>'color', color),
      is_admin = case when id = p_player then true else coalesce((p_data->>'is_admin')::boolean, is_admin) end,
      pin_hash = case when v_pin is null then pin_hash else crypt(v_pin, gen_salt('bf')) end
    where id = v_id;
    delete from pin_failures where player_id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('error','name_taken');
end $$;

revoke all on function public._auth(uuid, text), public._is_admin(uuid) from public, anon, authenticated;
grant execute on function
  public.login(uuid, text),
  public.set_rating(uuid, text, uuid, numeric),
  public.save_play(uuid, text, jsonb),
  public.delete_play(uuid, text, uuid),
  public.save_game(uuid, text, jsonb),
  public.delete_game(uuid, text, uuid),
  public.change_pin(uuid, text, text),
  public.save_player(uuid, text, jsonb)
to anon, authenticated;
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

-- =========================================================
--  طاولتنا — التحديث 3
--  رموز جديدة، إلغاء تغيير الرمز الذاتي، الجمعة الجاية، تعليق لكل لعبة، لوحة الشلة
-- =========================================================

-- ---------- الرموز: المسؤول بس يغيّرها ----------
drop function if exists public.change_pin(uuid, text, text);

-- ---------- الجمعة الجاية: كل لاعب يختار الألعاب اللي يبي يجربها ----------
create table if not exists public.friday_picks (
  week        date not null,
  game_id     uuid not null references public.games(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (week, game_id, player_id)
);

-- ---------- تعليق واحد لكل لاعب على كل لعبة ----------
create table if not exists public.game_comments (
  game_id     uuid not null references public.games(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  updated_at  timestamptz not null default now(),
  primary key (game_id, player_id)
);

-- ---------- لوحة الشلة ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists posts_time_idx on public.posts(created_at desc);

alter table public.friday_picks  enable row level security;
alter table public.game_comments enable row level security;
alter table public.posts         enable row level security;
revoke all on public.friday_picks, public.game_comments, public.posts from anon, authenticated;
grant select on public.friday_picks, public.game_comments, public.posts to anon, authenticated;
drop policy if exists read_all on public.friday_picks;
drop policy if exists read_all on public.game_comments;
drop policy if exists read_all on public.posts;
create policy read_all on public.friday_picks  for select using (true);
create policy read_all on public.game_comments for select using (true);
create policy read_all on public.posts         for select using (true);

-- اختيار/إلغاء لعبة للجمعة
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
  insert into friday_picks(week, game_id, player_id) values (p_week, p_game, p_player);
  return jsonb_build_object('ok', true, 'picked', true);
end $$;

-- كتابة/تعديل/مسح تعليقي على لعبة (body فاضي = مسح)
create or replace function public.set_comment(p_player uuid, p_pin text, p_game uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); b text := nullif(trim(p_body), '');
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if b is null then
    delete from game_comments where game_id = p_game and player_id = p_player;
  else
    if char_length(b) > 500 then return jsonb_build_object('error', 'too_long'); end if;
    insert into game_comments(game_id, player_id, body) values (p_game, p_player, b)
    on conflict (game_id, player_id) do update set body = excluded.body, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- كتابة على لوحة الشلة
create or replace function public.add_post(p_player uuid, p_pin text, p_body text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); b text := nullif(trim(p_body), ''); v_id uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if b is null then return jsonb_build_object('error', 'empty'); end if;
  if char_length(b) > 1000 then return jsonb_build_object('error', 'too_long'); end if;
  insert into posts(player_id, body) values (p_player, b) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- حذف كتابة (صاحبها أو المسؤول)
create or replace function public.delete_post(p_player uuid, p_pin text, p_post uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_owner uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  select player_id into v_owner from posts where id = p_post;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if v_owner <> p_player and not _is_admin(p_player) then return jsonb_build_object('error', 'forbidden'); end if;
  delete from posts where id = p_post;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  public.toggle_friday(uuid, text, date, uuid),
  public.set_comment(uuid, text, uuid, text),
  public.add_post(uuid, text, text),
  public.delete_post(uuid, text, uuid)
to anon, authenticated;
