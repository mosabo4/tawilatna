import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { buildEvents, getSeen, markSeen, timeAgo } from '../events'
import { Avatar, Cover, TopBar, ScoreBadge } from '../ui'
import { gameStats } from '../stats'

const SHORTCUTS = [['🎲', 'الجلسة الجاية', '#/friday'], ['▶', 'ابدأ جلسة', '#/live'], ['🏆', 'الترتيب', '#/rank'], ['🎁', 'الجوائز والتقدّم', '#/progress'], ['🏷️', 'الألقاب', '#/progress/titles'], ['📜', 'السجل', '#/history'], ['💬', 'اللوحة', '#/board'], ['🗄️', 'الدولاب', '#/games']]

export function Search() {
  const { idx } = useStore()
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  const games = t ? (idx.allGames || idx.games).filter(g => g.name.toLowerCase().includes(t)).slice(0, 8) : []
  const players = t ? idx.players.filter(p => p.name.includes(q.trim())) : []
  return (
    <div className="page">
      <TopBar title="بحث" backTo="/" />
      <div className="stack">
        <input className="input search-big" type="search" autoFocus placeholder="دوّر على لعبة أو لاعب…" value={q} onChange={e => setQ(e.target.value)} />
        {t && !games.length && !players.length && <p className="muted pad">ما لقيت شي بهالاسم.</p>}
        {games.length > 0 && <><p className="s-head">ألعاب</p>{games.map(g => {
          const st = gameStats(idx, g.base_game_id || g.id)
          return <a key={g.id} className="s-row" href={`#/game/${g.id}`}><Cover game={g} className="xs" /><span>{g.name}</span><em>{st.plays.length} قيم</em><ScoreBadge value={st.avg} /></a>
        })}</>}
        {players.length > 0 && <><p className="s-head">لاعبين</p>{players.map(p => <a key={p.id} className="s-row" href={`#/player/${p.id}`}><Avatar player={p} size={34} /><span>{p.name}</span></a>)}</>}
        {!t && <><p className="s-head">اختصارات</p><div className="shortcuts">{SHORTCUTS.map(([i, n, h]) => <a key={h} href={h}><span>{i}</span>{n}</a>)}</div></>}
      </div>
    </div>
  )
}

export function Alerts() {
  const { idx, me } = useStore()
  const [seen] = useState(getSeen)
  const ev = useMemo(() => buildEvents(idx).filter(e => !e.post), [idx])
  useEffect(() => { markSeen() }, [])
  return (
    <div className="page">
      <TopBar title="التنبيهات وآخر الأحداث" backTo="/" />
      <div className="stack">
        <ul className="feed glass">
          {ev.map(e => (
            <li key={e.id} className={e.at > seen && e.by !== me?.id ? 'new' : ''}>
              <a href={e.href}>
                {e.who ? <Avatar player={e.who} size={36} /> : <span className="f-ic">{e.icon}</span>}
                <span className="f-txt"><b>{e.icon} {e.text}</b>{e.sub && <small className="f-sub">{e.sub}</small>}<small>{timeAgo(String(e.at))}</small></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
