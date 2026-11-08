-- التقييم فقط للي جرّب اللعبة + مسح تقييمات مصعب للألعاب اللي ما لعبها
create or replace function public.set_rating(p_player uuid, p_pin text, p_game uuid, p_score numeric)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_cat text;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_score is null then
    delete from ratings where game_id = p_game and player_id = p_player;
  else
    if not exists (
      select 1 from plays pl join play_results pr on pr.play_id = pl.id
      where pr.player_id = p_player
        and (pl.game_id = p_game or exists (select 1 from games gx where gx.id = pl.game_id and gx.base_game_id = p_game))
    ) then return jsonb_build_object('error','not_played'); end if;
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

-- امسح تقييمات مصعب للألعاب اللي ما جرّبها
delete from ratings r
using players pl0
where pl0.id = r.player_id and pl0.name = 'مصعب'
  and not exists (
    select 1 from plays pl join play_results pr on pr.play_id = pl.id
    where pr.player_id = r.player_id
      and (pl.game_id = r.game_id or exists (select 1 from games gx where gx.id = pl.game_id and gx.base_game_id = r.game_id))
  );
