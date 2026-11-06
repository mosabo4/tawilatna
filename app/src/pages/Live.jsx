import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { standings } from '../stats'
import { getLive, setLive, livePlays, todayStr } from '../live'
import { Avatar, TopBar, Section, Cover } from '../ui'
import { StandingRows } from './Ranking'
import { Character } from '../characters'

const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? `${m} دقيقة` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} ساعة` }

export default function Live() {
  const { idx, me } = useStore()
  const [live, setL] = useState(getLive)
  const [pick, setPick] = useState(() => (me ? [me.id] : []))
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(null)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  const save = v => { setLive(v); setL(v) }
  const plays = useMemo(() => (live ? livePlays(idx, live) : []), [idx, live])
  const table = useMemo(() => (live ? standings(idx, p => plays.includes(p)) : []), [idx, live, plays])

  if (done) {
    const top = done.table.find(r => r.plays > 0)
    return (
      <div className="page">
        <TopBar title="ملخص الجلسة" backTo="/" />
        <div className="stack">
          <div className="glass live-end">
            {top ? <>
              <Character player={top.player} pose="jump" size={120} />
              <small>نجم الليلة</small><strong>{top.player.name}</strong>
              <p>{top.wins} فوز من {top.plays} · مستواه الليلة {top.points}%</p>
            </> : <p>ما انسجل أي قيم في هالجلسة.</p>}
            <div className="row3 live-nums"><div><b>{done.plays.length}</b><span>قيم</span></div><div><b>{done.players.length}</b><span>حاضر</span></div><div><b>{dur(done.end - new Date(done.start))}</b><span>مدة</span></div></div>
          </div>
          {top && <Section title="ترتيب الليلة"><StandingRows rows={done.table} me={me} /></Section>}
          <button className="btn primary wide" onClick={() => go('/')}>تم</button>
        </div>
      </div>
    )
  }

  if (!live) {
    const toggle = id => setPick(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
    return (
      <div className="page">
        <TopBar title="ابدأ الجلسة" backTo="/" />
        <div className="stack">
          <Section title="مين حاضر الليلة؟">
            <div className="live-who">
              {idx.players.map(p => (
                <button key={p.id} className={pick.includes(p.id) ? 'on' : ''} onClick={() => toggle(p.id)} aria-pressed={pick.includes(p.id)}>
                  <Avatar player={p} size={48} /><span>{p.name}</span>
                </button>
              ))}
            </div>
          </Section>
          <p className="hint pad-x">الحضور يتعبّى لحاله في كل قيم تسجّله الليلة، وتقدر تعدّله قبل الحفظ.</p>
          <button className="btn primary wide" disabled={pick.length < 2} onClick={() => save({ start: new Date().toISOString(), date: todayStr(), players: pick })}>▶ ابدأ ({pick.length} حاضرين)</button>
        </div>
      </div>
    )
  }

  const people = live.players.map(id => idx.playersById.get(id)).filter(Boolean)
  const others = idx.players.filter(p => !live.players.includes(p.id))
  return (
    <div className="page has-action">
      <TopBar title="جلسة الليلة" backTo="/" />
      <div className="stack">
        <div className="live-card">
          <div className="row gap center"><span className="pulse" /><b>شغّالة من {dur(now - new Date(live.start))}</b></div>
          <div className="live-people">
            {people.map(p => <button key={p.id} title="شيله" onClick={() => save({ ...live, players: live.players.filter(x => x !== p.id) })}><Avatar player={p} size={34} /></button>)}
            {others.length > 0 && (
              <select className="live-add" value="" onChange={e => e.target.value && save({ ...live, players: [...live.players, e.target.value] })} aria-label="أضف حاضر">
                <option value="">+ أضف</option>
                {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <Section title={`أقيام الليلة (${plays.length})`}>
          {plays.length ? (
            <ul className="live-plays">
              {plays.map(p => {
                const g = idx.gamesById.get(p.game_id)
                const w = p.results.filter(r => r.position === 1).map(r => idx.playersById.get(r.player_id)?.name).join(' و')
                return <li key={p.id}><a href={`#/play/${p.id}`}><Cover game={g} className="xs" /><span>{g?.name}</span><em>🥇 {w}</em></a></li>
              })}
            </ul>
          ) : <p className="muted pad">ما سجلتوا شي للحين. اضغط الزر تحت بعد أول قيم.</p>}
        </Section>

        {plays.length > 0 && <Section title="ترتيب الليلة"><StandingRows rows={table} me={me} /></Section>}

        <button className="btn ghost wide" onClick={() => { setDone({ ...live, plays, table, end: Date.now() }); save(null) }}>🏁 خلّص الجلسة وشوف الملخص</button>
      </div>
      <div className="action-bar"><button className="btn primary wide" onClick={() => go('/log?live=1')}>+ سجّل قيم بالحضور</button></div>
    </div>
  )
}
