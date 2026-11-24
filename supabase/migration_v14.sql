-- v14: ترشيح 3 ألعاب مشترك للجلسة الجاية (بدل التصويت القديم) + أفعال جديدة للجوائز
-- غرفة وحدة (id=1) فيها: round, cands, seen, ballots, note
create table if not exists public.pick_room (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.pick_room enable row level security;
revoke all on public.pick_room from anon, authenticated;
grant select on public.pick_room to anon, authenticated;
drop policy if exists read_all on public.pick_room;
create policy read_all on public.pick_room for select using (true);

-- يغيّر الغرفة كلها (ترشيح جديد، فيتو، إعادة ترشيح). p_expect = رقم الجولة اللي شافها اللاعب (0 لو ما فيه غرفة).
-- لو الجولة تغيّرت قبله يرجع stale ويعيد التحميل بدون ما يكسر شي
create or replace function public.set_pick_room(p_player uuid, p_pin text, p_expect int, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); cur int;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then return jsonb_build_object('error', 'bad_input'); end if;
  select coalesce((data->>'round')::int, 0) into cur from pick_room where id = 1;
  cur := coalesce(cur, 0);
  if cur <> coalesce(p_expect, 0) then return jsonb_build_object('error', 'stale'); end if;
  insert into pick_room(id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- ورقة لاعب واحد (ذرّي: ما تمسح أوراق غيره). ترتيب فاضي = يسحب ورقته
create or replace function public.set_pick_ballot(p_player uuid, p_pin text, p_round int, p_ballot jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); n int;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_ballot is null or jsonb_typeof(p_ballot) <> 'object' or length(p_ballot::text) > 2000 then return jsonb_build_object('error', 'bad_input'); end if;
  if jsonb_array_length(coalesce(p_ballot->'order', '[]'::jsonb)) = 0 then
    update pick_room set data = jsonb_set(data, '{ballots}', coalesce(data->'ballots', '{}'::jsonb) - p_player::text), updated_at = now()
      where id = 1 and (data->>'round')::int = p_round;
  else
    if jsonb_array_length(p_ballot->'order') > 3 then return jsonb_build_object('error', 'bad_input'); end if;
    update pick_room set data = jsonb_set(data, '{ballots}', coalesce(data->'ballots', '{}'::jsonb) || jsonb_build_object(p_player::text, p_ballot || jsonb_build_object('at', now()))), updated_at = now()
      where id = 1 and (data->>'round')::int = p_round;
  end if;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('error', 'stale'); end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_pick_room(uuid, text, int, jsonb), public.set_pick_ballot(uuid, text, int, jsonb) to anon, authenticated;

-- أفعال جديدة: double (ضعف الأولى) و against (نقاط سالبة)
create or replace function public.add_action(p_player uuid, p_pin text, p_kind text, p_target uuid, p_game uuid, p_play uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text := _auth(p_player, p_pin); v_id uuid;
begin
  if s <> 'ok' then return jsonb_build_object('error', s); end if;
  if p_kind not in ('react','tease','baby','retitle','predict','bet','challenge','rematch','thanks','veto','opener','lucky','shelf','award','board','firstturn','gift','alert','immune','teampick','houserule','seat','swap','caption','hotseat','nick','godfather','box','guarantee','story','luckbox','risk','double','against') then return jsonb_build_object('error', 'bad_input'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 1000 then return jsonb_build_object('error', 'bad_input'); end if;
  if p_target = p_player and p_kind in ('tease','baby','retitle','challenge','lucky','caption','nick','godfather','gift','hotseat','swap') then return jsonb_build_object('error', 'bad_input'); end if;
  insert into actions(player_id, kind, target, game_id, play_id, data) values (p_player, p_kind, p_target, p_game, p_play, p_data) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
grant execute on function public.add_action(uuid, text, text, uuid, uuid, uuid, jsonb) to anon, authenticated;
