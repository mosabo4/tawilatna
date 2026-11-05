import { useMemo } from 'react'
import { useStore, go } from '../store'
import { leaderboard, allGameStats, daysSince } from '../stats'
import { Avatar, Donut, Section, Empty, Cover, ScoreBadge, ago } from '../ui'
import { PlayCard } from './History'
import { FridayCard } from './Social'
import { useLevels, LevelPill } from './Levels'

export default function Home() {
  const { idx, me } = useStore()
  const board = useMemo(() => leaderboard(idx), [idx])
  const games = useMemo(() => allGameStats(idx), [idx])
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = idx.plays.filter(p => p.played_on.startsWith(month)).length
  const leader = board.find(b => b.plays > 0)

  const topRated = games.filter(g => g.avg != null).sort((a, b) => b.avg - a.avg).slice(0, 4)
  const forgotten = games
    .map(g => ({ ...g, days: daysSince(g.lastPlayed) }))
    .sort((a, b) => (b.days ?? 1e9) - (a.days ?? 1e9))
    .slice(0, 4)

  // ألعابي: اللي لعبتها، وهل قيّمتها
  const myGames = useMemo(() => {
    if (!me) return []
    const m = new Map()
    for (const p of idx.plays) if (p.results.some(r => r.player_id === me.id)) m.set(p.game_id, (m.get(p.game_id) || 0) + 1)
    const rated = new Map(idx.ratings.filter(r => r.player_id === me.id).map(r => [r.game_id, r.score]))
    return [...m.entries()].map(([id, n]) => ({ game: idx.gamesById.get(id), n, score: rated.get(id) }))
      .filter(x => x.game).sort((a, b) => (a.score != null) - (b.score != null) || b.n - a.n)
  }, [idx, me])
  const unrated = myGames.filter(x => x.score == null)
  const levels = useLevels()
  const myLv = me ? levels.get(me.id) : null

  if (!idx.games.length) {
    return (
      <div className="page">
        <Empty title="الطاولة فاضية" text="ابدأ بإضافة ألعابك، بعدها تقدرون تسجلون الأقيام وتقيّمونها."
          action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف أول لعبة</button>} />
      </div>
    )
  }

  return (
    <div className="page stack">
      {leader ? (
        <a className="glass lead" href="#/rank">
          <Donut value={leader.points / 100}><Avatar player={leader.player} size={56} /></Donut>
          <div className="lead-info">
            <small>المتصدر</small>
            <strong>{leader.player.name}</strong>
            <p>المستوى {leader.points} · فاز {leader.wins} من {leader.plays} قيم</p>
            <span className="lead-more">الترتيب الكامل ←</span>
          </div>
        </a>
      ) : (
        <div className="glass lead empty-lead">
          <div className="lead-info"><small>المتصدر</small><strong>ما أحد للحين</strong><p>أول واحد يفوز يتصدّر هنا.</p></div>
        </div>
      )}

      {unrated.length > 0 && (
        <div className="glass rate-nudge">
          <div className="rn-head"><span aria-hidden="true">⭐</span><div><b>{unrated.length === 1 ? 'عندك لعبة لعبتها وما قيّمتها' : `عندك ${unrated.length} ألعاب لعبتها وما قيّمتها`}</b><small>قيّمها عشان يطلع تقييم الشلة صح</small></div></div>
          <div className="rn-list">
            {unrated.slice(0, 3).map(x => (
              <a key={x.game.id} href={`#/game/${x.game.id}`} className="rn-item"><Cover game={x.game} className="xs" /><span>{x.game.name}</span><em>قيّم</em></a>
            ))}
          </div>
          {unrated.length > 3 && <p className="rn-more">والباقي ({unrated.length - 3}) تحت في «ألعابك»</p>}
        </div>
      )}

      {myLv && (
        <a className="glass lv-home" href="#/levels">
          <span className="lv-av"><Avatar player={me} size={44} /><LevelPill level={myLv.level} /></span>
          <span className="lv-main">
            <span className="lv-top"><b>ليفل {myLv.level} · {myLv.title}</b><small>باقي {myLv.need - myLv.into} XP</small></span>
            <span className="lv-bar"><span style={{ width: `${Math.max(3, myLv.progress * 100)}%`, '--c': me.color }} /></span>
            {myLv.nextReward && <small className="lv-hint">الجائزة الجاية: {myLv.nextReward.icon} {myLv.nextReward.name} (ليفل {myLv.nextReward.level})</small>}
          </span>
        </a>
      )}

      <FridayCard />

      <div className="row3">
        <a href="#/history"><b>{idx.plays.length}</b><span>قيم</span></a>
        <a href="#/games"><b>{idx.games.length}</b><span>لعبة</span></a>
        <a href="#/history"><b>{thisMonth}</b><span>هالشهر</span></a>
      </div>

      {myGames.length > 0 && (
        <Section title="ألعابك" action={<span className="muted small">{myGames.length} لعبة لعبتها</span>}>
          <div className="mini-games my-games">
            {myGames.map(x => (
              <a key={x.game.id} className="mini-game" href={`#/game/${x.game.id}`}>
                <Cover game={x.game} className="sm" />
                <span className="mg-name">{x.game.name}</span>
                {x.score != null ? <ScoreBadge value={x.score} /> : <span className="rate-tag">قيّمها</span>}
                <small className="muted">{x.n === 1 ? 'مرة' : `${x.n} مرات`}</small>
              </a>
            ))}
          </div>
        </Section>
      )}

      {idx.plays.length > 0 && (
        <Section title="آخر الأقيام" action={<a className="more" href="#/history">السجل</a>}>
          <div className="play-list">{idx.plays.slice(0, 3).map(p => <PlayCard key={p.id} play={p} />)}</div>
        </Section>
      )}

      {topRated.length > 0 && (
        <Section title="الأعلى تقييماً عندنا" action={<a className="more" href="#/games">الألعاب</a>}>
          <div className="mini-games">
            {topRated.map(g => (
              <a key={g.game.id} className="mini-game" href={`#/game/${g.game.id}`}>
                <Cover game={g.game} className="sm" />
                <span className="mg-name">{g.game.name}</span>
                <ScoreBadge value={g.avg} />
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="صار لها زمان ما انلعبت">
        <ul className="link-list">
          {forgotten.map(g => (
            <li key={g.game.id}><a href={`#/game/${g.game.id}`}>
              <Cover game={g.game} className="xs" />
              <span className="nm">{g.game.name}</span>
              <span className="muted">{ago(g.days)}</span>
            </a></li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
