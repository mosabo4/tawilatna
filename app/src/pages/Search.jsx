import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { buildEvents, getSeen, markSeen, markRead, readIds, isNew, isMine, within, TYPES, DAY_MS, dayLabel, CATS, timeAgo } from '../events'
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
  const [rs, setRs] = useState(() => readIds())
  const [cat, setCat] = useState('all')
  const [onlyNew, setOnlyNew] = useState(false)
  const [hist, setHist] = useState(false)
  const all = useMemo(() => within(buildEvents(idx, me).filter(e => !e.post), hist ? 7 * DAY_MS : DAY_MS), [idx, me, hist])
  const fresh = e => isNew(e, me, seen, rs)
  const inCat = (e, c) => c === 'all' || (c === 'me' ? isMine(e, me) : e.cat === c)
  const ev = all.filter(e => inCat(e, cat) && (!onlyNew || fresh(e)))
  const n = c => all.filter(e => inCat(e, c) && fresh(e)).length
  const read = e => { markRead(e.id); setRs(readIds()) }
  const markAll = () => { markSeen(); setRs(new Set()) }
  let last = ''
  return (
    <div className="page">
      <TopBar title="التنبيهات وآخر الأحداث" backTo="/" />
      <div className="stack">
        <div className="al-tabs" role="tablist">
          {CATS.map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{l}{n(k) > 0 && <i>{n(k)}</i>}</button>)}
        </div>
        <div className="al-bar">
          <label className="al-only"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} /> الجديد بس</label>
          <button type="button" className="link-btn" disabled={!n('all')} onClick={markAll}>✓ علّم الكل مقروء</button>
        </div>
        {ev.length === 0 && <p className="muted pad">{onlyNew ? 'ما عندك شي جديد 🎉' : hist ? 'ما فيه أحداث هالأسبوع.' : 'هادي آخر 24 ساعة 🌙'}</p>}
        <ul className="feed glass">
          {ev.map(e => {
            const dl = dayLabel(e.at); const head = dl !== last ? dl : null; last = dl
            return (
              <li key={e.id} className={fresh(e) ? 'new' : ''}>
                {head && <p className="al-day">{head}</p>}
                <a href={e.href} onClick={() => read(e)}>
                  {e.whos?.length > 1 ? <span className="al-stack">{e.whos.slice(0, 5).map(w => <Avatar key={w.id} player={w} size={26} />)}{e.whos.length > 5 && <em>+{e.whos.length - 5}</em>}</span> : e.who ? <Avatar player={e.who} size={36} /> : <span className="f-ic">{e.icon}</span>}
                  <span className="f-txt"><b>{e.icon} {e.text}</b>{e.sub && <small className="f-sub">{e.sub}</small>}<small><em className="al-chip" style={{ '--c': TYPES[e.t]?.[1] || '#8A94A8' }}>{TYPES[e.t]?.[0] || 'تفاعل'}</em> {timeAgo(String(e.at))}</small></span>
                  {fresh(e) && <i className="al-dot" aria-label="جديد" />}
                </a>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn ghost al-hist" onClick={() => setHist(!hist)}>{hist ? '↩️ رجوع لآخر 24 ساعة' : '📜 سجل الإشعارات (آخر أسبوع)'}</button>
      </div>
    </div>
  )
}
