import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { standings } from '../stats'
import { xpSince } from '../levels'
import { getLive, setLive, livePlays, todayStr, getLast, setLast } from '../live'
import { TopBar, Section, Cover } from '../ui'
import { StandingRows } from './Ranking'
import { Character } from '../characters'
import { usePerks } from '../perks'
import { cooldownLeft, liveActs, hotSeat } from '../actions'

const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? `${m} دقيقة` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} ساعة` }

export default function Live() {
  const { idx, me } = useStore()
  const [live, setL] = useState(getLive)
  const last = useMemo(getLast, [])
  const [pick, setPick] = useState(() => (last?.players?.length ? last.players : me ? [me.id] : []))
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
                      <div className="xn-top"><b>{x.player.name}</b>{x.to > x.from && <em className="xn-up">⬆ مستوى {x.to}!</em>}<strong>+{x.total}<small> XP</small></strong></div>
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
          {last && <p className="hint pad-x">🔁 جلستكم الأخيرة انتهت قبل أقل من ساعتين، فإذا بدأت الحين تكمل عليها. (بعد ساعتين من آخر قيم تصير جلسة جديدة.)</p>}
          <p className="hint pad-x">الحضور يتعبّى لحاله في كل قيم تسجّله الليلة، وتقدر تعدّله قبل الحفظ.</p>
          <button className="btn primary wide" disabled={pick.length < 2} onClick={() => save({ start: last?.start || new Date().toISOString(), date: todayStr(), players: pick })}>▶ ابدأ ({pick.length} حاضرين)</button>
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

        <FirstTurn people={people} />
        <Decisions people={people} />
        <Forecast live={live} people={people} />

        {plays.length > 0 && <Section title="ترتيب الليلة"><StandingRows rows={table} me={me} /></Section>}

        <button className="btn ghost wide" onClick={() => { setDone({ ...live, plays, table, end: Date.now(), xp: xpSince(idx, live.start) }); setLast({ date: live.date, start: live.start, players: live.players }); save(null) }}>🏁 خلّص الجلسة وشوف الملخص</button>
      </div>
      <div className="action-bar"><button className="btn primary wide" onClick={() => go('/log?live=1')}>+ سجّل قيم بالحضور</button></div>
    </div>
  )
}

// التوقعات (مستوى 8) والرهان (مستوى 16) قبل القيم الجاي
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
  const status = a => a.ok == null ? <em className="fc-wait">⏳ ينتظر القيم</em> : a.ok ? <em className="fc-ok">✓ +{a.data?.double ? 30 : 15} XP</em> : <em className="fc-no">✗ غلط</em>
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
            <button className="btn primary small" disabled={busy || !game || !who} onClick={() => run('predict', { target: who, game, data: can('predict2') ? { double: true } : {} }, '🔮 انحفظ توقعك')}>توقّع</button>
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


// تجاوز الدور (مستوى 8): تختار مين يبدأ في قيم، مرة بالأسبوع
function FirstTurn({ people }) {
  const { idx, me } = useStore()
  const { can, doAction } = usePerks()
  const [game, setGame] = useState('')
  const [who, setWho] = useState('')
  const recent = (idx.actions || []).filter(a => a.kind === 'firstturn' && Date.now() - new Date(a.created_at).getTime() < 12 * 3600e3)
  const left = me ? cooldownLeft(idx, me.id, 'firstturn', 7) : 0
  if (!recent.length && (!me || !can('firstturn'))) return null
  return (
    <Section title="⏭️ تجاوز الدور">
      <div className="pad-x pad-b form fc">
        {recent.map(a => <div key={a.id} className="ft-row">⏭️ <b>{idx.playersById.get(a.player_id)?.name}</b> قرر: <b>{idx.playersById.get(a.target)?.name}</b> يبدأ في {idx.gamesById.get(a.game_id)?.name}</div>)}
        {me && can('firstturn') && (left ? <p className="hint">ترجع لك بعد {left} يوم.</p> : <>
          <select className="input" value={game} onChange={e => setGame(e.target.value)}><option value="">أي لعبة؟</option>{[...idx.games].sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <div className="fc-row">
            <select className="input" value={who} onChange={e => setWho(e.target.value)}><option value="">مين يبدأ؟</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button className="btn primary small" disabled={!game || !who} onClick={() => doAction('firstturn', { target: who, game }, '⏭️ انحفظ').catch(() => {})}>ثبّت</button>
          </div>
        </>)}
      </div>
    </Section>
  )
}

// قرارات الليلة: الفريق، ضمان الخاسر، Double or Nothing
function Decisions({ people }) {
  const { idx, me } = useStore()
  const { can, doAction, fx } = usePerks()
  const [open, setOpen] = useState(null)
  const [v, setV] = useState({})
  const nm = id => idx.playersById.get(id)?.name
  const teams = liveActs(idx, 'teampick'), guar = liveActs(idx, 'guarantee')
  const risks = (fx?.risks || []).filter(a => Date.now() - new Date(a.created_at).getTime() < 12 * 3600e3)
  const hs = hotSeat(idx)
  const box = (fx?.boxes || []).find(b => !b.winner)
  const cd = (k, d) => (me ? cooldownLeft(idx, me.id, k, d) : 0)
  const opts = me ? [
    { id: 'teampick', icon: '🤜', label: 'اختر شريكك', left: cd('teampick', 7) },
    { id: 'risk', icon: '⚡', label: 'Double or Nothing', left: 0 },
    { id: 'guarantee', icon: '🛟', label: 'ضمان الخاسر', left: cd('guarantee', 30) },
  ].filter(o => can(o.id)) : []
  const list = [
    ...(hs ? [<li key="hs">🔥 <b>الكرسي الساخن:</b> الكل يتحدى {nm(hs.target)}</li>] : []),
    ...(box ? [<li key="box">💰 في الصندوق <b>{box.amount} XP</b> لأول واحد يفوز (من {nm(box.player_id)})</li>] : []),
    ...teams.map(a => <li key={a.id}>🤜 <b>{nm(a.player_id)}</b> اختار {nm(a.target)} شريكه{a.game_id ? ` في ${idx.gamesById.get(a.game_id)?.name}` : ''}</li>),
    ...guar.map(a => <li key={a.id}>🛟 ضمان الخاسر شغّال الليلة (من {nm(a.player_id)}): آخر واحد ياخذ +20</li>),
    ...risks.map(a => <li key={a.id}>⚡ <b>{nm(a.player_id)}</b> خاطر في {idx.gamesById.get(a.game_id)?.name} {a.ok == null ? '⏳' : a.ok ? '✓ +300' : '✗ -50'}</li>),
  ]
  if (!list.length && !opts.length) return null
  const run = (kind, args, msg) => doAction(kind, args, msg).then(() => { setOpen(null); setV({}) }).catch(() => {})
  const games = [...idx.games].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Section title="📋 قرارات الليلة">
      <div className="pad-x pad-b fc">
        {list.length > 0 && <ul className="dec-list">{list}</ul>}
        {opts.length > 0 && <div className="ppow-row">{opts.map(o => <button key={o.id} className={`chip ${open === o.id ? 'on' : ''}`} disabled={o.left > 0} onClick={() => setOpen(open === o.id ? null : o.id)}>{o.icon} {o.label}{o.left > 1 ? ` · ${o.left} يوم` : ''}</button>)}</div>}
        {open === 'teampick' && <div className="fc-row">
          <select className="input" onChange={e => setV(x => ({ ...x, g: e.target.value }))}><option value="">أي لعبة</option>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select className="input" onChange={e => setV(x => ({ ...x, p: e.target.value }))}><option value="">شريكك</option>{people.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn primary small" disabled={!v.p} onClick={() => run('teampick', { target: v.p, game: v.g || null }, '🤜 انحفظ الفريق')}>ثبّت</button>
        </div>}
        {open === 'risk' && <div className="fc-row">
          <select className="input" onChange={e => setV({ g: e.target.value })}><option value="">اللعبة الجاية</option>{games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <button className="btn primary small" disabled={!v.g} onClick={() => run('risk', { game: v.g }, '⚡ خاطرت! لو فزت +300، لو خسرت -50')}>خاطر</button>
        </div>}
        {open === 'guarantee' && <div className="fc-row"><span className="muted small">آخر واحد في ترتيب الليلة ياخذ +20 XP تعويض.</span><button className="btn primary small" onClick={() => run('guarantee', {}, '🛟 تفعّل ضمان الخاسر')}>فعّل</button></div>}
      </div>
    </Section>
  )
}
