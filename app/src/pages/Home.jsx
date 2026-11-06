import { useMemo } from 'react'
import { useStore, go } from '../store'
import { leaderboard } from '../stats'
import { Avatar, Section, Empty, Cover } from '../ui'
import { useFriday } from './Social'
import { usePerks } from '../perks'
import { Stage } from '../characters'
import { buildEvents, getSeen, timeAgo } from '../events'
import { getLive, livePlays } from '../live'

export default function Home() {
  const { idx, me } = useStore()
  const { active } = usePerks()
  const board = useMemo(() => leaderboard(idx), [idx])
  const leader = board.find(b => b.plays > 0)
  const { byGame, mine, picks } = useFriday()
  const live = getLive()
  const events = useMemo(() => buildEvents(idx), [idx])
  const seen = getSeen()

  const unrated = useMemo(() => {
    if (!me) return []
    const played = new Set(idx.plays.filter(p => p.results.some(r => r.player_id === me.id)).map(p => p.game_id))
    const rated = new Set(idx.ratings.filter(r => r.player_id === me.id).map(r => r.game_id))
    return [...played].filter(id => !rated.has(id)).map(id => idx.gamesById.get(id)).filter(Boolean)
  }, [idx, me])
  const newPosts = events.filter(e => e.post && e.at > seen && e.by !== me?.id).length

  if (!idx.games.length) {
    return (
      <div className="page">
        <Empty title="الطاولة فاضية" text="ابدأ بإضافة ألعابك، بعدها تقدرون تسجلون الأقيام وتقيّمونها."
          action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف أول لعبة</button>} />
      </div>
    )
  }

  const top = [...byGame.entries()].sort((a, b) => b[1].length - a[1].length).map(([id, ps]) => ({ g: idx.gamesById.get(id), n: ps.length })).filter(x => x.g)
  const pickers = [...new Set(picks.map(p => p.player_id))].map(id => idx.playersById.get(id)).filter(Boolean)
  const needs = []
  if (me && unrated.length) needs.push({ icon: '⭐', title: unrated.length === 1 ? `قيّم ${unrated[0].name}` : `قيّم ${unrated.length} ألعاب`, sub: unrated.slice(0, 3).map(g => g.name).join('، '), href: `#/game/${unrated[0].id}`, btn: 'قيّم', hot: true })
  if (me && !mine.size) needs.push({ icon: '🎲', title: 'اختر ألعاب الجلسة', sub: 'وش ودك تلعب المرة الجاية؟', href: '#/friday', btn: 'اختر' })
  if (newPosts) needs.push({ icon: '💬', title: `${newPosts} كتابات جديدة`, sub: 'في لوحة الشلة', href: '#/board', btn: 'افتح' })
  const scene = active.scene
  const tonight = live ? livePlays(idx, live).length : 0

  return (
    <div className="page stack home">
      {scene && me && (
        <div className="glass stage-card">
          <Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action} customA={active.char} />
        </div>
      )}

      {live ? (
        <a className="live-card big" href="#/live">
          <div className="row gap center"><span className="pulse" /><b>الجلسة شغّالة</b></div>
          <div className="live-people">{live.players.map(id => idx.playersById.get(id)).filter(Boolean).map(p => <Avatar key={p.id} player={p} size={30} />)}</div>
          <span className="muted small">{tonight} قيم الليلة · اضغط تكمل</span>
        </a>
      ) : (
        <div className="hero-card">
          <small>الجلسة الجاية</small>
          <h2>{top.length ? `الأكثر طلباً: ${top[0].g.name}` : 'وش نلعب؟ 🎲'}</h2>
          <div className="hero-row">
            {pickers.length > 0 && <span className="lr-avs">{pickers.map(p => <Avatar key={p.id} player={p} size={26} />)}</span>}
            <span className="muted small">{pickers.length ? `${pickers.length} اختاروا` : 'ما أحد اختار للحين'}</span>
            <span className="hero-covers">{top.slice(0, 3).map(x => <Cover key={x.g.id} game={x.g} className="xs" />)}</span>
          </div>
          <div className="row gap">
            {me && <button className="btn primary" onClick={() => go('/live')}>▶ ابدأ الجلسة</button>}
            <button className="btn ghost" onClick={() => go('/friday')}>{mine.size ? `اخترت ${mine.size}` : 'اختر ألعابك'}</button>
          </div>
        </div>
      )}

      {needs.length > 0 && (
        <>
          <h2 className="h-sec">يحتاجك</h2>
          <div className="needs">
            {needs.map(n => (
              <a key={n.title} className={`need ${n.hot ? 'hot' : ''}`} href={n.href}>
                <b>{n.icon} {n.title}</b><small>{n.sub}</small><em>{n.btn}</em>
              </a>
            ))}
          </div>
        </>
      )}

      {leader && (
        <a className="glass leader-mini" href="#/rank">
          <Avatar player={leader.player} size={40} />
          <span><small>المتصدر</small><b>{leader.player.name}</b></span>
          <strong>{leader.points}%</strong>
          <span className="more">الترتيب ←</span>
        </a>
      )}

      {events.length > 0 && (
        <Section title="آخر الأحداث" action={<a className="more" href="#/alerts">الكل</a>}>
          <ul className="feed">
            {events.slice(0, 5).map(e => (
              <li key={e.id} className={e.at > seen && e.by !== me?.id ? 'new' : ''}>
                <a href={e.href}>
                  {e.who ? <Avatar player={e.who} size={34} /> : <span className="f-ic">{e.icon}</span>}
                  <span className="f-txt"><b>{e.icon} {e.text}</b><small>{timeAgo(String(e.at))}</small></span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
