import { useMemo } from 'react'
import { useStore, go } from '../store'
import { leaderboard, allGameStats, daysSince } from '../stats'
import { Pawn, Section, Empty, Cover, ScoreBadge, ago, pct } from '../ui'
import { PlayCard } from './History'

function Podium({ board }) {
  const top = board.filter(b => b.plays > 0).slice(0, 3)
  if (!top.length) return null
  // ترتيب العرض: الثاني، الأول، الثالث
  const order = [top[1], top[0], top[2]]
  const heights = [62, 92, 44]
  return (
    <div className="podium" aria-label="صدارة الطاولة">
      {order.map((b, i) => b ? (
        <a key={b.player.id} className={`pod pod-${i}`} href={`#/player/${b.player.id}`}>
          <Pawn color={b.player.color} size={i === 1 ? 54 : 42} crown={i === 1} />
          <span className="pod-name">{b.player.name}</span>
          <span className="pod-block" style={{ height: heights[i] }}>
            <b>{b.wins}</b><small>فوز</small>
          </span>
        </a>
      ) : <span key={i} className="pod pod-empty" />)}
    </div>
  )
}

export default function Home() {
  const { idx, me } = useStore()
  const board = useMemo(() => leaderboard(idx), [idx])
  const games = useMemo(() => allGameStats(idx), [idx])
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = idx.plays.filter(p => p.played_on.startsWith(month)).length

  const topRated = games.filter(g => g.avg != null).sort((a, b) => b.avg - a.avg).slice(0, 3)
  const forgotten = games
    .map(g => ({ ...g, days: daysSince(g.lastPlayed) }))
    .sort((a, b) => (b.days ?? 1e9) - (a.days ?? 1e9))
    .slice(0, 3)

  if (!idx.games.length) {
    return (
      <div className="page">
        <Empty title="الطاولة فاضية" text="ابدأ بإضافة ألعابك، بعدها تقدرون تسجلون القيمات وتقيّمونها."
          action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف أول لعبة</button>} />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="hero">
        <Podium board={board} />
        <p className="hero-line">
          <span><b>{idx.plays.length}</b> قيم</span>
          <span><b>{idx.games.length}</b> لعبة</span>
          <span><b>{thisMonth}</b> هالشهر</span>
        </p>
      </div>

      <div className="sheet-stack">
        <Section title="الترتيب" action={<a className="more" href="#/players">كل اللاعبين</a>}>
          {board.some(b => b.plays) ? (
            <table className="scorepad">
              <thead><tr><th></th><th>اللاعب</th><th>فوز</th><th>قيم</th><th>نسبة</th></tr></thead>
              <tbody>
                {board.map((b, i) => (
                  <tr key={b.player.id} onClick={() => go(`/player/${b.player.id}`)} className={b.player.id === me?.id ? 'me' : ''}>
                    <td className="rank">{i + 1}</td>
                    <td><span className="ptag"><Pawn color={b.player.color} size={20} /><span>{b.player.name}</span></span></td>
                    <td className="num strong">{b.wins}</td>
                    <td className="num">{b.plays}</td>
                    <td className="num">{b.plays ? pct(b.winRate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted pad">ما سجلتوا أي قيم للحين.</p>}
        </Section>

        <Section title="آخر القيمات" action={<a className="more" href="#/history">السجل كامل</a>}>
          {idx.plays.length
            ? <div className="play-list">{idx.plays.slice(0, 3).map(p => <PlayCard key={p.id} play={p} />)}</div>
            : <Empty title="ما فيه قيمات" text="أول ما تخلصون قيم، سجلوه من زر الزائد تحت." />}
        </Section>

        {topRated.length > 0 && (
          <Section title="الأعلى تقييماً عندنا">
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
          <ul className="plain-list">
            {forgotten.map(g => (
              <li key={g.game.id}><a href={`#/game/${g.game.id}`}><span>{g.game.name}</span><span className="muted">{ago(g.days)}</span></a></li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}
