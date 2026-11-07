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
-- =========================================================
--  طاولتنا — التحديث 7
--  نظام فوز لكل لعبة، تقييم 11، مين جهّز ورتّب ووقت القيم، ترتيب الدولاب، ألعاب جديدة
-- =========================================================

-- ---------- أعمدة جديدة ----------
alter table public.games add column if not exists scoring text not null default 'rank'
  check (scoring in ('rank','points','low','winner','elim','teams','coop'));
alter table public.games add column if not exists shelf_order integer;
alter table public.plays add column if not exists setup_by uuid[] not null default '{}';
alter table public.plays add column if not exists cleanup_by uuid[] not null default '{}';
alter table public.plays add column if not exists started_at timestamptz;
alter table public.plays add column if not exists ended_at timestamptz;
alter table public.ratings drop constraint if exists ratings_score_check;
alter table public.ratings add constraint ratings_score_check check (score >= 1 and score <= 11);

-- ---------- تعديل التصانيف ----------
update public.games set category = 'family' where name in ('The Vale of Eternity', '7 Wonders');

-- ---------- الألعاب الجديدة ----------
insert into public.games (name, category, bgg_id, year, min_players, max_players, play_minutes, max_minutes, weight, image_url, owner_id, added_by)
select v.name, v.category, v.bgg_id, v.year, v.min_players, v.max_players, v.play_minutes, v.max_minutes, v.weight, v.image_url, p.id, p.id
from (values
  ('Cluedo', 'family', 1294, 1949, 2, 6, 45, null, 1.64, 'https://cf.geekdo-images.com/wNcbhLJGGjakYjjm1gV_kQ__previewthumb/img/sZwgRJmw2NC49mHugn9Z1vj9eYI=/fit-in/300x320/filters:strip_icc()/pic7563466.png'),
  ('King of Tokyo', 'family', 70323, 2011, 2, 6, 30, null, 1.48, 'https://cf.geekdo-images.com/m_RzXpHURC0_xLkvRSR_sw__previewthumb/img/QSlVpVg11D4_b8uXcADhP8iSoYc=/fit-in/300x320/filters:strip_icc()/pic3043734.jpg'),
  ('Dungeon Mayhem', 'light', 260300, 2018, 2, 4, 10, null, 1.14, 'https://cf.geekdo-images.com/faJfKYz6tG8JvDYqYHBjHg__previewthumb/img/2ym1PDb1Ftc919s77uRQecVMijk=/fit-in/300x320/filters:strip_icc()/pic5322689.jpg'),
  ('Chabyrinthe', 'coop', 33088, 2007, 1, 4, 15, null, 1.23, 'https://cf.geekdo-images.com/RM_C5nIUi0RiIf-fa848uw__previewthumb/img/pKZsQZ0duuFk6kwojKodvi3_-nw=/fit-in/300x320/filters:strip_icc()/pic6481693.jpg'),
  ('قول بس لا تقولها', 'light', null, null, 4, 12, 30, null, 1.10, 'covers/gool.jpg'),
  ('Dumb Ways to Die', 'light', 392173, 2023, 2, 5, 10, 30, 1.13, 'https://cf.geekdo-images.com/DpAxsNlEVqo4wOcVRkHUGw__previewthumb/img/2SGQbFdShFs6yV8RsIw9qDwLVdo=/fit-in/300x320/filters:strip_icc()/pic7642240.png'),
  ('Splendor', 'family', 148228, 2014, 2, 4, 30, null, 1.77, 'https://cf.geekdo-images.com/vNFe4JkhKAERzi4T0Ntwpw__previewthumb/img/UpYSCLFjM_oFFxqgCFP3ymfqZGk=/fit-in/300x320/filters:strip_icc()/pic8234167.png'),
  ('The Mind', 'coop', 244992, 2018, 2, 4, 20, null, 1.07, 'https://cf.geekdo-images.com/q_JGK291hrhnhiRB0667oA__previewthumb/img/_nT7WcPKhPZEvixVt83sGm2HSlc=/fit-in/300x320/filters:strip_icc()/pic3979766.png'),
  ('Virus!', 'light', 180020, 2015, 2, 6, 20, null, 1.06, 'https://cf.geekdo-images.com/7Xx4ipXV4lf0Q9mWwitf2w__previewthumb/img/p49nGO7ztl72Y2sQ_pFrrAoUTo0=/fit-in/300x320/filters:strip_icc()/pic6008974.jpg'),
  ('Deep Sea Adventure', 'family', 169654, 2014, 2, 6, 30, null, 1.19, 'https://cf.geekdo-images.com/owyKXaa5SPB2HG9F_MueNQ__previewthumb/img/DGo2i41EBclabIX0EzhMUQlX6fs=/fit-in/300x320/filters:strip_icc()/pic3169827.png'),
  ('Saudi Deal', 'family', null, null, 2, 5, 15, null, 1.31, 'covers/saudi_deal.jpg'),
  ('Liar''s Pub', 'bluff', null, null, 2, 4, 20, null, 1.30, 'covers/liars_pub.jpg'),
  ('Dictator Game: Medieval Chaos', 'bluff', null, null, 3, 8, 30, null, 1.50, 'covers/dictator.jpg'),
  ('Shallow Regrets', 'light', 434870, 2025, 2, 3, 15, null, 1.69, 'https://cf.geekdo-images.com/doymdy9lSftznRpufRMg_g__previewthumb/img/JfpyoZ-MBYKHN2B4RKAdw4BOGo0=/fit-in/300x320/filters:strip_icc()/pic8652897.png'),
  ('O-1953', 'bluff', null, null, 4, 10, 30, null, 1.50, 'covers/o1953.jpg'),
  ('UNO: Mosab Edition', 'light', 2223, null, 2, 10, 30, null, 1.10, 'covers/uno_mosab.jpg'),
  ('Saboteur', 'bluff', 9220, 2004, 3, 10, 30, null, 1.32, 'https://cf.geekdo-images.com/oeN-MHAJKsC2KCI3avKj9w__previewthumb/img/3cOZXSYd7aqLcbJ9usvdUzo6bhE=/fit-in/300x320/filters:strip_icc()/pic8679622.jpg')
) as v(name, category, bgg_id, year, min_players, max_players, play_minutes, max_minutes, weight, image_url)
cross join (select id from public.players where name = 'مصعب') p
where not exists (select 1 from public.games g where g.name = v.name);

-- Virus! 2 Evolution صارت إضافة لـ Virus!
update public.games e set base_game_id = b.id from public.games b
where e.name = 'Virus! 2 Evolution' and b.name = 'Virus!' and e.base_game_id is null;

-- ---------- طريقة الفوز لكل لعبة ----------
update public.games set scoring = 'points' where name in ('Ticket to Ride: Europe','Brass: Birmingham','Root','Raccoon Tycoon','Catan','Carcassonne','Faraway','The Vale of Eternity','Dragonrealm','Citadels','Trash Pandas','Jaipur','Clank! Catacombs','Clank!: A Deck-Building Adventure','Tabannusi: Builders of Ur','The Manhattan Project 2: Minutes to Midnight','Sea Salt & Paper','Skull King','7 Wonders','7 Wonders Duel','Splendor','Deep Sea Adventure','Shallow Regrets','Inca Treasure','Pixies','The Fox in the Forest','Air, Land & Sea','Twilight Struggle');
update public.games set scoring = 'low' where name in ('Cabo Deluxe Edition');
update public.games set scoring = 'winner' where name in ('UNO: Mosab Edition','Trio','The Lord of the Rings: Duel for Middle-earth','Virus!','King of Tokyo','Cluedo','Saudi Deal','Dictator Game: Medieval Chaos');
update public.games set scoring = 'elim' where name in ('Coup','Exploding Kittens','Exploding Kittens: Party Pack','Exploding Kittens: Good vs Evil','Dungeon Mayhem','Dumb Ways to Die','Liar''s Pub');
update public.games set scoring = 'teams' where name in ('The Resistance: Avalon','Scotland Yard','Saboteur','O-1953','قول بس لا تقولها');
update public.games set scoring = 'coop' where category = 'coop' or name in ('Pandemic','The Crew: The Quest for Planet Nine','EXIT: The Game – The Sunken Treasure','Moon Adventure','Bandido','Bandida','The Mind','Chabyrinthe');

-- ---------- حفظ القيم مع التجهيز والترتيب والوقت ----------
create or replace function public.save_play(p_player uuid, p_pin text, p_play jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid; v_creator uuid; r jsonb;
  v_setup uuid[] := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p_play->'setup_by','[]'::jsonb)) x), '{}');
  v_clean uuid[] := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p_play->'cleanup_by','[]'::jsonb)) x), '{}');
  v_start timestamptz := nullif(p_play->>'started_at','')::timestamptz;
  v_end timestamptz := nullif(p_play->>'ended_at','')::timestamptz;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if jsonb_array_length(coalesce(p_play->'results','[]'::jsonb)) < 1 then
    return jsonb_build_object('error','no_players');
  end if;
  v_id := nullif(p_play->>'id','')::uuid;
  if v_id is null then
    insert into plays(game_id, played_on, notes, created_by, setup_by, cleanup_by, started_at, ended_at)
    values ((p_play->>'game_id')::uuid, coalesce((p_play->>'played_on')::date, current_date),
            nullif(p_play->>'notes',''), p_player, v_setup, v_clean, v_start, v_end)
    returning id into v_id;
  else
    select created_by into v_creator from plays where id = v_id;
    if not found then return jsonb_build_object('error','not_found'); end if;
    if v_creator is distinct from p_player and not _is_admin(p_player) then
      return jsonb_build_object('error','forbidden');
    end if;
    update plays set game_id = (p_play->>'game_id')::uuid,
                     played_on = coalesce((p_play->>'played_on')::date, played_on),
                     notes = nullif(p_play->>'notes',''),
                     setup_by = v_setup, cleanup_by = v_clean, started_at = v_start, ended_at = v_end
    where id = v_id;
    delete from play_results where play_id = v_id;
  end if;
  for r in select * from jsonb_array_elements(p_play->'results') loop
    insert into play_results(play_id, player_id, position, score)
    values (v_id, (r->>'player_id')::uuid, (r->>'position')::smallint, nullif(r->>'score','')::int);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ---------- تقييم 11 من 10: لعبة وحدة بس لكل تصنيف ----------
create or replace function public.set_rating(p_player uuid, p_pin text, p_game uuid, p_score numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_cat text;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_score is null then
    delete from ratings where game_id = p_game and player_id = p_player;
  else
    if p_score < 1 or p_score > 11 or (p_score > 10 and p_score < 11) then return jsonb_build_object('error','bad_score'); end if;
    if p_score = 11 then
      select category into v_cat from games where id = p_game;
      if exists (select 1 from ratings r join games g on g.id = r.game_id
                 where r.player_id = p_player and r.score = 11 and r.game_id <> p_game
                   and coalesce(g.category,'') = coalesce(v_cat,'')) then
        return jsonb_build_object('error','eleven_used');
      end if;
    end if;
    insert into ratings(game_id, player_id, score) values (p_game, p_player, round(p_score*2)/2)
    on conflict (game_id, player_id) do update set score = excluded.score, updated_at = now();
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- المسؤول يرتّب الدولاب ----------
create or replace function public.move_game(p_player uuid, p_pin text, p_game uuid, p_category text, p_order integer)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin);
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if not _is_admin(p_player) then return jsonb_build_object('error','forbidden'); end if;
  update games set category = nullif(p_category,''), shelf_order = p_order where id = p_game;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.move_game(uuid, text, uuid, text, integer) to anon, authenticated;
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
  if p_kind not in ('react','tease','baby','retitle','predict','bet','challenge','rematch','thanks','veto','opener','lucky','shelf','award') then return jsonb_build_object('error', 'bad_input'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 1000 then return jsonb_build_object('error', 'bad_input'); end if;
  if p_target = p_player and p_kind in ('tease','baby','retitle','challenge','lucky') then return jsonb_build_object('error', 'bad_input'); end if;
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
