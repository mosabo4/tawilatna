import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { leaderboard, playerStats, versus } from '../stats'
import { Pawn, TopBar, Section, Empty, pct, fmtDate, fmtScore, ScoreBadge } from '../ui'
import { PlayCard } from './History'

export default function Players() {
  const { idx, me } = useStore()
  const board = useMemo(() => leaderboard(idx), [idx])
  const [a, setA] = useState(me?.id || idx.players[0]?.id || '')
  const [b, setB] = useState(() => idx.players.find(p => p.id !== (me?.id || idx.players[0]?.id))?.id || '')
  return (
    <div className="page">
      <header className="topbar"><h1>اللاعبين</h1></header>
      <div className="sheet-stack">
        <div className="player-list">
          {board.map((s, i) => (
            <a key={s.player.id} className="player-row" href={`#/player/${s.player.id}`} style={{ '--c': s.player.color }}>
              <span className="rank">{i + 1}</span>
              <Pawn color={s.player.color} size={34} crown={i === 0 && s.wins > 0} />
              <span className="pr-name">{s.player.name}{s.player.id === me?.id && <small> (أنت)</small>}</span>
              <span className="pr-stat"><b>{s.wins}</b><small>فوز</small></span>
              <span className="pr-stat"><b>{s.plays}</b><small>قيم</small></span>
              <span className="pr-stat"><b>{s.plays ? pct(s.winRate) : '—'}</b><small>نسبة</small></span>
            </a>
          ))}
        </div>

        {idx.players.length > 1 && (
          <Section title="مين يغلب مين؟">
            <div className="vs-pick pad-x">
              <select className="input" value={a} onChange={e => setA(e.target.value)} aria-label="اللاعب الأول">
                {idx.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="vs-x">ضد</span>
              <select className="input" value={b} onChange={e => setB(e.target.value)} aria-label="اللاعب الثاني">
                {idx.players.filter(p => p.id !== a).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="pad-x pad-b"><button className="btn primary wide" disabled={!a || !b || a === b} onClick={() => go(`/vs/${a}/${b}`)}>قارن</button></div>
          </Section>
        )}
      </div>
    </div>
  )
}

export function PlayerView({ id }) {
  const { idx, me, logout } = useStore()
  const player = idx.playersById.get(id)
  const st = useMemo(() => (player ? playerStats(idx, id) : null), [idx, id, player])
  if (!player) return <div className="page"><TopBar title="لاعب" backTo="/players" /><Empty title="هذا اللاعب غير موجود" /></div>
  const ratings = idx.ratings.filter(r => r.player_id === id).sort((x, y) => y.score - x.score)
  const records = [...st.games].sort((x, y) => y.plays - x.plays)
  const others = idx.players.filter(p => p.id !== id)

  return (
    <div className="page">
      <TopBar title={player.name} backTo="/players" right={me?.id === id && <button className="btn small ghost-light" onClick={() => go('/me')}>حسابي</button>} />
      <div className="player-hero" style={{ '--c': player.color }}>
        <Pawn color={player.color} size={72} crown={st.currentStreak >= 2} />
        <div className="ph-stats">
          <div><b>{st.wins}</b><span>فوز</span></div>
          <div><b>{st.plays}</b><span>قيم</span></div>
          <div><b>{st.plays ? pct(st.winRate) : '—'}</b><span>نسبة الفوز</span></div>
        </div>
      </div>

      <div className="sheet-stack">
        <div className="paper facts">
          <dl>
            <div><dt>بالمراكز الثلاثة الأولى</dt><dd>{st.podiums} مرة</dd></div>
            <div><dt>سلسلة الفوز الحالية</dt><dd>{st.currentStreak ? `${st.currentStreak} على التوالي` : 'ما فيه'}</dd></div>
            <div><dt>أطول سلسلة فوز</dt><dd>{st.bestStreak}</dd></div>
            <div><dt>ملعبه</dt><dd>{st.bestGame ? <a href={`#/game/${st.bestGame.game.id}`}>{st.bestGame.game.name} ({st.bestGame.wins} فوز)</a> : '—'}</dd></div>
            <div><dt>أكثر لعبة لعبها</dt><dd>{st.mostPlayed ? <a href={`#/game/${st.mostPlayed.game.id}`}>{st.mostPlayed.game.name}</a> : '—'}</dd></div>
            <div><dt>لعبته المفضلة</dt><dd>{st.favorite ? <a href={`#/game/${st.favorite.game.id}`}>{st.favorite.game.name} ({fmtScore(st.favorite.score)})</a> : '—'}</dd></div>
            <div><dt>آخر قيم</dt><dd>{st.lastPlayed ? fmtDate(st.lastPlayed) : '—'}</dd></div>
          </dl>
        </div>

        {others.length > 0 && (
          <Section title="قارنه مع">
            <div className="chips pad-x pad-b">
              {others.map(o => <a key={o.id} className="chip" href={`#/vs/${id}/${o.id}`}><Pawn color={o.color} size={16} />{o.name}</a>)}
            </div>
          </Section>
        )}

        {records.length > 0 && (
          <Section title="سجله في كل لعبة">
            <table className="scorepad">
              <thead><tr><th>اللعبة</th><th>قيم</th><th>فوز</th><th>تقييمه</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.game.id} onClick={() => go(`/game/${r.game.id}`)}>
                    <td>{r.game.name}</td>
                    <td className="num">{r.plays}</td>
                    <td className="num strong">{r.wins}</td>
                    <td className="num">{fmtScore(ratings.find(x => x.game_id === r.game.id)?.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {ratings.length > 0 && (
          <Section title={`تقييماته (${ratings.length})`}>
            <ul className="plain-list">
              {ratings.map(r => {
                const g = idx.gamesById.get(r.game_id)
                return g && <li key={r.game_id}><a href={`#/game/${g.id}`}><span>{g.name}</span><ScoreBadge value={r.score} /></a></li>
              })}
            </ul>
          </Section>
        )}

        <Section title="آخر قيماته">
          {st.recent.length
            ? <div className="play-list">{st.recent.map(p => <PlayCard key={p.id} play={p} />)}</div>
            : <Empty title="ما لعب للحين" />}
        </Section>
        {me?.id === id && <button className="btn danger-link" onClick={logout}>اطلع من الحساب</button>}
      </div>
    </div>
  )
}

export function VersusView({ a, b }) {
  const { idx } = useStore()
  const pa = idx.playersById.get(a), pb = idx.playersById.get(b)
  const v = useMemo(() => (pa && pb ? versus(idx, a, b) : null), [idx, a, b, pa, pb])
  if (!pa || !pb) return <div className="page"><TopBar title="مقارنة" backTo="/players" /><Empty title="اختر لاعبين موجودين" /></div>
  const total = v.aAhead + v.bAhead + v.tie
  return (
    <div className="page">
      <TopBar title="مين يغلب مين" backTo="/players" />
      <div className="vs-hero">
        <a className="vs-side" href={`#/player/${a}`}>
          <Pawn color={pa.color} size={60} crown={v.aAhead > v.bAhead} />
          <span>{pa.name}</span>
          <b>{v.aAhead}</b>
        </a>
        <span className="vs-mid">ضد</span>
        <a className="vs-side" href={`#/player/${b}`}>
          <Pawn color={pb.color} size={60} crown={v.bAhead > v.aAhead} />
          <span>{pb.name}</span>
          <b>{v.bAhead}</b>
        </a>
      </div>
      {total > 0 && (
        <div className="vs-bar" aria-hidden="true">
          <span style={{ flex: v.aAhead, background: pa.color }} />
          {v.tie > 0 && <span style={{ flex: v.tie, background: 'var(--muted)' }} />}
          <span style={{ flex: v.bAhead, background: pb.color }} />
        </div>
      )}
      <p className="vs-sub">{total ? `لعبوا مع بعض ${total} قيم${v.tie ? `، وتعادلوا ${v.tie}` : ''}. الرقم يعني كم مرة خلّص قدّام الثاني.` : 'ما لعبوا مع بعض للحين.'}</p>
      <div className="sheet-stack">
        {v.shared.length > 0 && <Section title="قيماتهم مع بعض"><div className="play-list">{v.shared.slice(0, 30).map(p => <PlayCard key={p.id} play={p} />)}</div></Section>}
      </div>
    </div>
  )
}
