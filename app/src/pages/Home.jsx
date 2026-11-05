import { useMemo } from 'react'
import { useStore, go } from '../store'
import { leaderboard, allGameStats, daysSince } from '../stats'
import { Avatar, Donut, Section, Empty, Cover, ScoreBadge, ago } from '../ui'
import { PlayCard } from './History'
import { FridayCard } from './Social'

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
        <a className="glass lead" href={`#/player/${leader.player.id}`}>
          <Donut value={leader.points / 100}><Avatar player={leader.player} size={56} /></Donut>
          <div className="lead-info">
            <small>المتصدر</small>
            <strong>{leader.player.name}</strong>
            <p>{leader.points} نقطة · فاز {leader.wins} من {leader.plays} قيم</p>
          </div>
        </a>
      ) : (
        <div className="glass lead empty-lead">
          <div className="lead-info"><small>المتصدر</small><strong>ما أحد للحين</strong><p>أول واحد يفوز يتصدّر هنا.</p></div>
        </div>
      )}

      <FridayCard />

      <div className="row3">
        <a href="#/history"><b>{idx.plays.length}</b><span>قيم</span></a>
        <a href="#/games"><b>{idx.games.length}</b><span>لعبة</span></a>
        <a href="#/history"><b>{thisMonth}</b><span>هالشهر</span></a>
      </div>

      <Section title="الترتيب بالنقاط" action={<a className="more" href="#/players">كيف تنحسب؟</a>}>
        {board.some(b => b.plays) ? (
          <ol className="rank-list">
            {board.map((b, i) => (
              <li key={b.player.id} className={b.player.id === me?.id ? 'mine' : ''}>
                <a href={`#/player/${b.player.id}`}>
                  <span className="rk">{i + 1}</span>
                  <Avatar player={b.player} size={28} />
                  <span className="nm">{b.player.name}</span>
                  <span className="pc">{b.plays ? `${b.wins} فوز من ${b.plays}` : 'ما لعب'}</span>
                  <span className="w">{b.points ?? '—'}</span>
                </a>
              </li>
            ))}
          </ol>
        ) : <p className="muted pad">ما سجلتوا أي قيم للحين. أول ما تخلصون قيم، سجلوه من زر الزائد تحت.</p>}
      </Section>

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
