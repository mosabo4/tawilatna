import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { standings } from '../stats'
import { xpSince } from '../levels'
import { getLive, setLive, livePlays, todayStr } from '../live'
import { TopBar, Section, Cover } from '../ui'
import { StandingRows } from './Ranking'
import { Character } from '../characters'
import { usePerks } from '../perks'
import { boardSide, cooldownLeft } from '../actions'

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
          {done.xp && (
            <Section title="⚡ XP الليلة">
              <ul className="xp-night">
                {done.players.map(id => done.xp.get(id)).filter(Boolean).sort((a, b) => b.total - a.total).map(x => (
                  <li key={x.player.id}>
                    <span className="xn-chr"><Character player={x.player} pose={x.to > x.from ? 'cheer' : 'idle'} size={46} /></span>
                    <div className="xn-body">
                      <div className="xn-top"><b>{x.player.name}</b>{x.to > x.from && <em className="xn-up">⬆ ليفل {x.to}!</em>}<strong>+{x.total}<small> XP</small></strong></div>
                      <div className="xn-parts">
                        {x.parts.map(p => <span key={p.id}>{p.icon} +{p.got}</span>)}
                        {x.ach.map(a => <span key={a.id} className="ach">{a.icon} {a.name} +{a.xp}</span>)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
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
                  <span className="lw-chr"><Character player={p} pose={pick.includes(p.id) ? 'cheer' : 'idle'} size={62} /></span><span>{p.name}</span>
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
            {people.map(p => <button key={p.id} className="lp-chr" title="شيله" onClick={() => save({ ...live, players: live.players.filter(x => x !== p.id) })}><Character player={p} size={44} /><small>{p.name}</small></button>)}
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

        <BoardSide />
        <Forecast live={live} people={people} />

        {plays.length > 0 && <Section title="ترتيب الليلة"><StandingRows rows={table} me={me} /></Section>}

        <button className="btn ghost wide" onClick={() => { setDone({ ...live, plays, table, end: Date.now(), xp: xpSince(idx, live.start) }); save(null) }}>🏁 خلّص الجلسة وشوف الملخص</button>
      </div>
      <div className="action-bar"><button className="btn primary wide" onClick={() => go('/log?live=1')}>+ سجّل قيم بالحضور</button></div>
    </div>
  )
}

// التوقعات (ليفل 8) والرهان (ليفل 16) قبل القيم الجاي
function Forecast({ live, people }) {
  const { idx, me } = useStore()
  const { can, doAction, fx } = usePerks()
  const [game, setGame] = useState('')
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)
  if (!me || !can('predict')) return null
  const run = async (...a) => { setBusy(true); try { await doAction(...a) } catch { /* toast */ } finally { setBusy(false) } }
  const tonight = [...(fx?.predictions || [])].filter(a => a.created_at >= live.start).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const games = [...idx.games].sort((a, b) => a.name.localeCompare(b.name))
  const status = a => a.ok == null ? <em className="fc-wait">⏳ ينتظر القيم</em> : a.ok ? <em className="fc-ok">✓ +15 XP</em> : <em className="fc-no">✗ غلط</em>
  return (
    <Section title="🔮 قبل القيم الجاي">
      <div className="pad-x pad-b form fc">
        <select className="input" value={game} onChange={e => setGame(e.target.value)}>
          <option value="">وش اللعبة الجاية؟</option>
          {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {can('predict') && (
          <div className="fc-row">
            <select className="input" value={who} onChange={e => setWho(e.target.value)}>
              <option value="">مين بيفوز؟</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn primary small" disabled={busy || !game || !who} onClick={() => run('predict', { target: who, game }, '🔮 انحفظ توقعك')}>توقّع</button>
          </div>
        )}
        {tonight.length > 0 && (
          <ul className="fc-list">
            {tonight.map(a => (
              <li key={a.id}>
                <span>🔮</span>
                <span className="fc-t"><b>{idx.playersById.get(a.player_id)?.name}</b> يتوقع {idx.playersById.get(a.target)?.name} يفوز في {idx.gamesById.get(a.game_id)?.name}</span>
                {status(a)}
              </li>
            ))}
          </ul>
        )}
        <p className="hint">ينحسب على أول قيم تسجّلونه من هاللعبة خلال يومين.</p>
      </div>
    </Section>
  )
}

// البورد على جهتك (ليفل 7): جلسة وحدة بالشهر
function BoardSide() {
  const { idx, me } = useStore()
  const { can, doAction } = usePerks()
  const cur = boardSide(idx)
  if (cur) return <div className="glass board-side">🎯 البورد على اتجاه <b>{idx.playersById.get(cur.player_id)?.name}</b> طول الجلسة</div>
  if (!me || !can('board')) return null
  const left = cooldownLeft(idx, me.id, 'board', 30)
  return <button className="btn ghost wide" disabled={left > 0} onClick={() => doAction('board', {}, '🎯 البورد على جهتك الليلة').catch(() => {})}>🎯 خلّ البورد على جهتي الليلة{left ? ` (بعد ${left} يوم)` : ''}</button>
}
