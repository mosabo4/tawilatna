import { useMemo } from 'react'
import { useStore, go } from '../store'
import { playerStats, versus } from '../stats'
import { Avatar, Donut, TopBar, Section, Empty, Cover, fmtDate, fmtScore, ScoreBadge } from '../ui'
import { PlayCard } from './History'
import { useLevels, LevelPill } from './Levels'
import { usePerks, TitleBadge } from '../perks'
import { Character } from '../characters'

export function PlayerView({ id }) {
  const { idx, me, logout } = useStore()
  const player = idx.playersById.get(id)
  const st = useMemo(() => (player ? playerStats(idx, id) : null), [idx, id, player])
  const levels = useLevels()
  const { active } = usePerks()
  const mine = me?.id === id
  if (!player) return <div className="page"><TopBar title="لاعب" backTo="/players" /><Empty title="هذا اللاعب غير موجود" /></div>
  const ratings = idx.ratings.filter(r => r.player_id === id).sort((x, y) => y.score - x.score)
  const records = [...st.games].sort((x, y) => y.plays - x.plays)
  const others = idx.players.filter(p => p.id !== id)
  const lv = levels.get(id)

  return (
    <div className="page">
      <TopBar title={player.name} backTo="/rank" right={me?.id === id && <button className="btn small ghost" onClick={() => go('/me')}>حسابي</button>} />
      <div className="stack">
        <div className={`glass lead ${mine && active.legend ? 'legend' : ''}`}>
          <Donut value={(st.points ?? 0) / 100}><Avatar player={player} size={56} /></Donut>
          <div className="lead-info">
            <small>{mine && active.title ? `🏷️ ${active.title}` : 'المستوى'}</small>
            <strong className={mine && active.legend ? 'legend-name' : ''}>{player.name}</strong>
            <p>{st.plays ? `المستوى ${st.points ?? '—'} · فاز ${st.wins} من ${st.plays} قيم` : 'ما لعب للحين'}</p>
          </div>
        </div>
        {lv && (
          <a className="glass lv-home" href="#/levels">
            <span className="lv-main">
              <span className="lv-top"><b>ليفل {lv.level} · {lv.title}</b><small>{lv.xp} XP</small></span>
              <span className="lv-bar"><span style={{ width: `${Math.max(3, lv.progress * 100)}%`, '--c': player.color }} /></span>
              <small className="lv-hint">🏅 {lv.achievements.filter(a => a.done).length} من {lv.achievements.length} إنجاز</small>
            </span>
          </a>
        )}
        <div className="row3">
          <div><b>{st.wins}</b><span>فوز</span></div>
          <div><b>{st.plays}</b><span>قيم</span></div>
          <div><b>{st.points ?? '—'}</b><span>المستوى</span></div>
        </div>
      </div>

      <div className="stack">
        <div className="glass facts">
          <dl>
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

// قائمة الشلة بشخصياتهم
export default function PlayersList() {
  const { idx, me } = useStore()
  const { active } = usePerks()
  const levels = useLevels()
  const list = [...idx.players].sort((a, b) => (levels.get(b.id)?.xp || 0) - (levels.get(a.id)?.xp || 0))
  return (
    <div className="page">
      <div className="stack">
        <div className="crew">
          {list.map(p => {
            const lv = levels.get(p.id)
            const mine = p.id === me?.id
            return (
              <a key={p.id} className={`glass crew-card ${mine && active.legend ? 'legend' : ''}`} href={`#/player/${p.id}`} style={{ '--c': (mine && active.color) || p.color }}>
                <span className="crew-char"><Character player={p} custom={mine ? active.char : undefined} size={92} /></span>
                <b>{p.name}</b>
                {mine && active.title ? <TitleBadge title={active.title} small /> : <small>{lv?.title}</small>}
                {lv && <span className="crew-lv"><LevelPill level={lv.level} /> ليفل</span>}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ألعابي (لصفحة حسابي)
export function MyGames() {
  const { idx, me } = useStore()
  const games = useMemo(() => {
    const m = new Map()
    for (const p of idx.plays) if (p.results.some(r => r.player_id === me.id)) m.set(p.game_id, (m.get(p.game_id) || 0) + 1)
    const rated = new Map(idx.ratings.filter(r => r.player_id === me.id).map(r => [r.game_id, r.score]))
    return [...m.entries()].map(([id, n]) => ({ game: idx.gamesById.get(id), n, score: rated.get(id) }))
      .filter(x => x.game).sort((a, b) => (a.score != null) - (b.score != null) || b.n - a.n)
  }, [idx, me])
  if (!games.length) return null
  return (
    <Section title="ألعابك" action={<span className="muted small">{games.length} لعبة</span>}>
      <div className="mini-games my-games">
        {games.map(x => (
          <a key={x.game.id} className="mini-game" href={`#/game/${x.game.id}`}>
            <Cover game={x.game} className="sm" />
            <span className="mg-name">{x.game.name}</span>
            {x.score != null ? <ScoreBadge value={x.score} /> : <span className="rate-tag">قيّمها</span>}
            <small className="muted">{x.n === 1 ? 'مرة' : `${x.n} مرات`}</small>
          </a>
        ))}
      </div>
    </Section>
  )
}
