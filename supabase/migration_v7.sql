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
