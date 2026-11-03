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
