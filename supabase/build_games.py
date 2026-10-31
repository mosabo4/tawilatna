import json
MAP = [
 (14996,'Ticket to Ride: Europe','family'),(247367,'Air, Land & Sea','duel'),(172225,'Exploding Kittens','light'),
 (256804,'Exploding Kittens: Party Pack','light'),(395906,'Exploding Kittens: Good vs Evil','light'),(352515,'Trio','light'),
 (271321,'Cabo Deluxe Edition','light'),(15512,'Inca Treasure','light'),(224517,'Brass: Birmingham','strategy'),
 (237182,'Root','strategy'),(254386,'Raccoon Tycoon','strategy'),(13,'Catan','family'),
 (2807,'Catan: 5–6 Player Extension','family'),(926,'Catan: Cities & Knights','family'),(822,'Carcassonne','family'),
 (385761,'Faraway','light'),(385529,'The Vale of Eternity','strategy'),(272993,'Dragonrealm','light'),
 (478,'Citadels','bluff'),(216439,'Trash Pandas','light'),(284083,'The Crew: The Quest for Planet Nine','coop'),
 (30549,'Pandemic','coop'),(54043,'Jaipur','duel'),(365717,'Clank! Catacombs','adventure'),
 (201808,'Clank!: A Deck-Building Adventure','adventure'),(308918,'Clank! Adventuring Party','adventure'),
 (12333,'Twilight Struggle','duel'),(316786,'Tabannusi: Builders of Ur','strategy'),
 (177659,'The Manhattan Project 2: Minutes to Midnight','strategy'),(438,'Scotland Yard','family'),
 (226518,'EXIT: The Game – The Sunken Treasure','coop'),(330403,'Moon Adventure','coop'),(367220,'Sea Salt & Paper','light'),
 (128882,'The Resistance: Avalon','bluff'),(150145,'Skull King','light'),(191925,'Bandido','coop'),(299571,'Bandida','coop'),
 (411875,'Pixies','light'),(266667,'Virus! 2 Evolution','light'),(221965,'The Fox in the Forest','duel'),
 (421006,'The Lord of the Rings: Duel for Middle-earth','duel'),(68448,'7 Wonders','strategy'),(173346,'7 Wonders Duel','duel'),
 (131357,'Coup','bluff'),(148931,'Coup: Reformation','bluff'),
]
raw = {}
for line in open('bgg_raw.txt'):
    if not line.strip(): continue
    i,y,a,b,t1,t2,w,img = line.strip().split('|',7)
    raw[int(i)] = dict(year=int(y),minp=int(a),maxp=int(b),mint=int(t1),maxt=int(t2),weight=float(w),img='https://cf.geekdo-images.com/'+img)
assert len(MAP)==45 and all(i in raw for i,_,_ in MAP), [i for i,_,_ in MAP if i not in raw]
games=[]
for i,name,cat in MAP:
    r=raw[i]
    games.append(dict(bgg_id=i,name=name,category=cat,year=r['year'],min_players=r['minp'],max_players=r['maxp'],play_minutes=r['mint'],max_minutes=r['maxt'] if r['maxt']!=r['mint'] else None,weight=r['weight'],image_url=r['img']))
json.dump(games, open('../app/src/seedGames.json','w'), ensure_ascii=False, indent=0)
q=lambda s: "'"+s.replace("'","''")+"'"
n=lambda v: 'null' if v is None else str(v)
vals=',\n'.join(f"  ({q(g['name'])}, {q(g['category'])}, {g['bgg_id']}, {g['year']}, {g['min_players']}, {g['max_players']}, {g['play_minutes']}, {n(g['max_minutes'])}, {g['weight']}, {q(g['image_url'])})" for g in games)
open('games_seed.sql','w').write(f"""-- ألعاب مصعب (45 لعبة) من BoardGameGeek
insert into public.games (name, category, bgg_id, year, min_players, max_players, play_minutes, max_minutes, weight, image_url, owner_id, added_by)
select v.name, v.category, v.bgg_id, v.year, v.min_players, v.max_players, v.play_minutes, v.max_minutes, v.weight, v.image_url, p.id, p.id
from (values
{vals}
) as v(name, category, bgg_id, year, min_players, max_players, play_minutes, max_minutes, weight, image_url)
cross join (select id from public.players where name = 'مصعب') p
where not exists (select 1 from public.games g where g.bgg_id = v.bgg_id);
""")
from collections import Counter; print(Counter(c for _,_,c in MAP))
