import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { leaderboard, playerStats, versus } from '../stats'
import { Avatar, Donut, TopBar, Section, Empty, pct, fmtDate, fmtScore, ScoreBadge } from '../ui'
import { PlayCard } from './History'

export default function Players() {
  const { idx, me } = useStore()
  const board = useMemo(() => leaderboard(idx), [idx])
  const [a, setA] = useState(me?.id || idx.players[0]?.id || '')
  const [b, setB] = useState(() => idx.players.find(p => p.id !== (me?.id || idx.players[0]?.id))?.id || '')
  return (
    <div className="page">
      <header className="page-head"><h1>اللاعبين</h1></header>
      <div className="stack">
        <div className="player-list">
          {board.map((s, i) => (
            <a key={s.player.id} className="player-row" href={`#/player/${s.player.id}`}>
              <span className="rank">{i + 1}</span>
              <Avatar player={s.player} size={40} />
              <span className="pr-name">{s.player.name}{s.player.id === me?.id && <small> (أنت)</small>}</span>
              <span className="pr-stat"><b>{s.plays}</b><small>قيم</small></span>
              <span className="pr-stat"><b>{s.wins}</b><small>فوز</small></span>
              <span className="pr-stat main"><b>{s.points ?? '—'}</b><small>نقطة</small></span>
            </a>
          ))}
        </div>

        <Section title="كيف تنحسب النقاط؟" className="how">
          <div className="pad-x pad-b how-body">
            <p>كل قيم ياخذ فيه اللاعب نقاط حسب مركزه، مو بس الأول:</p>
            <ul>
              <li>الأول ياخذ <b>100</b> والأخير <b>0</b>، واللي بينهم بالتدريج. في قيم من 5: الأول 100، الثاني 75، الثالث 50، الرابع 25، الخامس 0.</li>
              <li>التعادل يتقسم بالنص بين المتعادلين.</li>
              <li>النقاط النهائية = معدّل كل أقيامك.</li>
              <li>عشان اللي لعب قليل ما يتصدر بالحظ، ينضاف لكل واحد 4 أقيام «متوسطة» (50). مع الوقت يقل أثرها وتبان نقاطك الحقيقية.</li>
            </ul>
            <p className="muted small">مثال: اللي لعب 3 وفاز فيها كلها نقاطه {Math.round((3 + 2) / 7 * 100)}، واللي لعب 10 وكلها أول نقاطه {Math.round((10 + 2) / 14 * 100)}.</p>
          </div>
        </Section>

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
      <TopBar title={player.name} backTo="/players" right={me?.id === id && <button className="btn small ghost" onClick={() => go('/me')}>حسابي</button>} />
      <div className="stack">
        <div className="glass lead">
          <Donut value={(st.points ?? 0) / 100}><Avatar player={player} size={56} /></Donut>
          <div className="lead-info">
            <small>{st.currentStreak >= 2 ? `على سلسلة ${st.currentStreak} فوز` : 'النقاط'}</small>
            <strong>{player.name}</strong>
            <p>{st.plays ? `${st.points} نقطة · يفوز في ${pct(st.winRate)} من أقيامه` : 'ما لعب للحين'}</p>
          </div>
        </div>
        <div className="row3">
          <div><b>{st.wins}</b><span>فوز</span></div>
          <div><b>{st.plays}</b><span>قيم</span></div>
          <div><b>{st.podiums}</b><span>بالثلاثة الأوائل</span></div>
        </div>
      </div>

      <div className="stack">
        <div className="glass facts">
          <dl>
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
              {others.map(o => <a key={o.id} className="chip" href={`#/vs/${id}/${o.id}`}><Avatar player={o} size={20} />{o.name}</a>)}
            </div>
          </Section>
        )}

        {records.length > 0 && (
          <Section title="سجله في كل لعبة">
            <table className="table">
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
            <ul className="link-list">
              {ratings.map(r => {
                const g = idx.gamesById.get(r.game_id)
                return g && <li key={r.game_id}><a href={`#/game/${g.id}`}><span className="nm">{g.name}</span><ScoreBadge value={r.score} /></a></li>
              })}
            </ul>
          </Section>
        )}

        <Section title="آخر أقيامه">
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
      <div className="glass vs-hero">
        <a className="vs-side" href={`#/player/${a}`}>
          <Avatar player={pa} size={64} ring={v.aAhead > v.bAhead} />
          <span>{pa.name}</span>
          <b>{v.aAhead}</b>
        </a>
        <span className="vs-mid">ضد</span>
        <a className="vs-side" href={`#/player/${b}`}>
          <Avatar player={pb} size={64} ring={v.bAhead > v.aAhead} />
          <span>{pb.name}</span>
          <b>{v.bAhead}</b>
        </a>
      </div>
      {total > 0 && (
        <div className="vs-bar" aria-hidden="true">
          <span className="a" style={{ flex: v.aAhead }} />
          {v.tie > 0 && <span className="t" style={{ flex: v.tie }} />}
          <span className="b" style={{ flex: v.bAhead }} />
        </div>
      )}
      <p className="vs-sub">{total ? `لعبوا مع بعض ${total} قيم${v.tie ? `، وتعادلوا ${v.tie}` : ''}. الرقم يعني كم مرة خلّص قدّام الثاني.` : 'ما لعبوا مع بعض للحين.'}</p>
      <div className="stack">
        {v.shared.length > 0 && <Section title="أقيامهم مع بعض"><div className="play-list">{v.shared.slice(0, 30).map(p => <PlayCard key={p.id} play={p} />)}</div></Section>}
      </div>
    </div>
  )
}
