import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import { useFriday } from './Social'
import { Avatar, Cover, Section, Empty, playersText, today } from '../ui'

const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
const fits = (g, n) => (!g.min_players || (n >= g.min_players && n <= (g.max_players || 99)))
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); return d.toISOString().slice(0, 10) }
const monthKey = () => new Date().toISOString().slice(0, 7)

function useLab() {
  const { data, act, idx, me } = useStore()
  const lab = data?.settings?.lab || {}
  const [busy, setBusy] = useState(false)
  const save = async (next, msg) => {
    setBusy(true)
    try { await act((p, pin) => api.setLab(p, pin, { ...lab, ...next }), msg) } catch { /* toast */ } finally { setBusy(false) }
  }
  return { lab, save, busy, idx, me }
}

function Who({ value, onChange, list }) {
  const { idx } = useStore()
  return (
    <div className="lab-who"><small>تتصرف باسم:</small>
      {(list || idx.players).map(p => <button key={p.id} type="button" className={value === p.id ? 'on' : ''} onClick={() => onChange(p.id)} aria-label={p.name}><Avatar player={p} size={30} /></button>)}
    </div>
  )
}
const GameChip = ({ g, children, onClick, on, disabled }) => (
  <button type="button" disabled={disabled} className={`lab-game ${on ? 'on' : ''}`} onClick={onClick}><Cover game={g} className="xs" /><b>{g.name}</b><small>{playersText(g)}</small>{children}</button>
)

// ---------- 1) الانتخابات الأسبوعية ----------
function Election() {
  const { lab, save, busy, idx, me } = useLab()
  const { tally, week: fWeek } = useFriday()
  const [as, setAs] = useState(me.id)
  const el = lab.election || {}
  const cands = (el.cands || []).map(id => idx.gamesById.get(id)).filter(Boolean)
  const counts = new Map(); Object.values(el.ballots || {}).forEach(g => counts.set(g, (counts.get(g) || 0) + 1))
  const voted = Object.keys(el.ballots || {}).length
  const open = () => {
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 5)
    const fill = shuffle(idx.games.filter(g => !top.includes(g.id) && fits(g, idx.players.length))).map(g => g.id)
    save({ election: { ...el, open: true, week: fWeek || weekKey(), cands: [...top, ...fill].slice(0, Math.max(4, top.length)), ballots: {}, winner: null } }, 'انفتحت الانتخابات')
  }
  const cast = gid => save({ election: { ...el, ballots: { ...el.ballots, [as]: gid } } }, 'انسجل الصوت')
  const close = () => {
    const max = Math.max(0, ...counts.values()); const lead = [...counts].filter(([, n]) => n === max).map(x => x[0])
    const winner = lead.length ? lead[Math.floor(Math.random() * lead.length)] : null
    const rec = { week: el.week, winner, tie: lead.length > 1, tally: Object.fromEntries(counts), voters: voted }
    save({ election: { ...el, open: false, winner, history: [rec, ...(el.history || [])] } }, 'انقفلت الانتخابات')
  }
  const win = idx.gamesById.get(el.winner)
  return (
    <Section title="🗳️ الانتخابات الأسبوعية">
      <div className="pad lab-box">
        <p className="hint">كل لاعب صوت واحد للمرشحين. الفايز يصير «اللعبة الملزمة» للجلسة. المرشحين: الأعلى طلباً في تصويت الجلسة الجاية + ألعاب مناسبة للعدد.</p>
        {!el.open && <button className="btn primary" disabled={busy} onClick={open}>افتح انتخابات الأسبوع ({el.week || fWeek})</button>}
        {el.open && (
          <>
            <Who value={as} onChange={setAs} />
            <div className="lab-grid">
              {cands.map(g => {
                const n = counts.get(g.id) || 0
                return <GameChip key={g.id} g={g} on={el.ballots?.[as] === g.id} disabled={busy} onClick={() => cast(g.id)}><i className="lab-bar"><u style={{ width: `${voted ? (n / voted) * 100 : 0}%` }} /></i><em>{n} صوت</em></GameChip>
              })}
            </div>
            <p className="hint">صوّت {voted} من {idx.players.length}</p>
            <button className="btn gold" disabled={busy || !voted} onClick={close}>🏁 أقفل وأعلن الفايز</button>
          </>
        )}
        {!el.open && win && <div className="lab-winner"><Cover game={win} className="sm" /><div><small>⚖️ اللعبة الملزمة للجلسة</small><b>{win.name}</b>{el.history?.[0]?.tie && <small>(حسمتها القرعة)</small>}</div></div>}
        {el.history?.length > 0 && <ul className="lab-hist">{el.history.map((h, i) => <li key={i}>{h.week} · <bdi>{idx.gamesById.get(h.winner)?.name || '—'}</bdi> · {h.voters} مصوّتين</li>)}</ul>}
        {(el.open || el.winner) && <button className="link-btn danger" disabled={busy} onClick={() => save({ election: { history: el.history || [] } }, 'صُفّرت')}>صفّر</button>}
      </div>
    </Section>
  )
}

// ---------- 2) لعبة الشهر ----------
function Month() {
  const { lab, save, busy, idx, me } = useLab()
  const [as, setAs] = useState(me.id)
  const [pick, setPick] = useState('')
  const m = lab.month || {}
  const g = id => idx.gamesById.get(id)
  const myNoms = m.noms?.[as] || []
  const nominate = gid => gid && !myNoms.includes(gid) && myNoms.length < 2 && save({ month: { ...m, month: m.month || monthKey(), phase: 'nominate', noms: { ...m.noms, [as]: [...myNoms, gid] } } }, 'انرشّحت')
  const unNom = gid => save({ month: { ...m, noms: { ...m.noms, [as]: myNoms.filter(x => x !== gid) } } }, 'انشال الترشيح')
  const nomCount = new Map(); Object.values(m.noms || {}).flat().forEach(id => nomCount.set(id, (nomCount.get(id) || 0) + 1))
  const mkRound = ids => { const s = shuffle(ids); const matches = []; for (let i = 0; i + 1 < s.length; i += 2) matches.push({ a: s[i], b: s[i + 1], v: {} }); return { matches, bye: s.length % 2 ? s[s.length - 1] : null } }
  const start = () => {
    const ids = [...nomCount.keys()].sort((a, b) => nomCount.get(b) - nomCount.get(a)).slice(0, 8)
    save({ month: { ...m, phase: 'bracket', rounds: [mkRound(ids)], winner: null } }, 'بدأت التصفيات')
  }
  const rounds = m.rounds || []
  const cur = rounds[rounds.length - 1]
  const roundName = (k, n) => (n === 1 ? 'النهائي' : n === 2 ? 'نصف النهائي' : `الجولة ${k + 1}`)
  const vote = (mi, side) => {
    const rs = rounds.map((r, k) => k === rounds.length - 1 ? { ...r, matches: r.matches.map((x, j) => j === mi ? { ...x, v: { ...x.v, [as]: side } } : x) } : r)
    save({ month: { ...m, rounds: rs } }, 'انسجل الصوت')
  }
  const closeRound = () => {
    const done = cur.matches.map(x => {
      const a = Object.values(x.v).filter(s => s === 'a').length, b = Object.values(x.v).filter(s => s === 'b').length
      const tie = a === b
      return { ...x, w: tie ? (Math.random() < 0.5 ? x.a : x.b) : a > b ? x.a : x.b, tie }
    })
    const winners = [...done.map(x => x.w), ...(cur.bye ? [cur.bye] : [])]
    const rs = [...rounds.slice(0, -1), { ...cur, matches: done, closed: true }]
    if (winners.length === 1) {
      save({ month: { ...m, rounds: rs, phase: 'done', winner: winners[0], history: [{ month: m.month, winner: winners[0] }, ...(m.history || [])] } }, '🏆 لعبة الشهر انحسمت')
    } else save({ month: { ...m, rounds: [...rs, mkRound(winners)] } }, 'الجولة الجاية')
  }
  const win = g(m.winner)
  return (
    <Section title="🏆 لعبة الشهر">
      <div className="pad lab-box">
        <p className="hint">كل واحد يرشّح لعبتين، وبعدها تصفيات مواجهات: كل مواجهة تصويت بين لعبتين، والفايزة تكمل لين تبقى لعبة وحدة.</p>
        {(!m.phase || m.phase === 'done') && <button className="btn primary" disabled={busy} onClick={() => save({ month: { month: monthKey(), phase: 'nominate', noms: {}, history: m.history || [] } }, 'انفتح الترشيح')}>ابدأ ترشيحات {monthKey()}</button>}
        {m.phase === 'nominate' && (
          <>
            <Who value={as} onChange={setAs} />
            <div className="lab-row">
              <select className="input" value={pick} onChange={e => setPick(e.target.value)}><option value="">اختر لعبة…</option>{idx.games.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              <button className="btn small primary" disabled={busy || !pick || myNoms.length >= 2} onClick={() => { nominate(pick); setPick('') }}>رشّح</button>
            </div>
            <p className="hint">ترشيحاته: {myNoms.length} من 2</p>
            <div className="lab-grid">{myNoms.map(id => g(id) && <GameChip key={id} g={g(id)} on onClick={() => unNom(id)}><em>✕ شيل</em></GameChip>)}</div>
            <h4>كل المرشّحة ({nomCount.size})</h4>
            <div className="lab-grid">{[...nomCount].map(([id, n]) => g(id) && <GameChip key={id} g={g(id)} disabled><em>{n} ترشيح</em></GameChip>)}</div>
            <button className="btn gold" disabled={busy || nomCount.size < 2} onClick={start}>⚔️ ابدأ التصفيات (أعلى {Math.min(8, nomCount.size)})</button>
          </>
        )}
        {m.phase === 'bracket' && cur && (
          <>
            <Who value={as} onChange={setAs} />
            {rounds.map((r, k) => (
              <div key={k} className="lab-round">
                <h4>{roundName(k, r.matches.length + (r.bye ? 1 : 0) <= 2 ? r.matches.length + (r.bye ? 1 : 0) : 9)}{r.closed ? ' ✔' : ''}</h4>
                {r.matches.map((x, mi) => {
                  const a = Object.values(x.v).filter(s => s === 'a').length, b = Object.values(x.v).filter(s => s === 'b').length
                  const live = k === rounds.length - 1
                  return (
                    <div key={mi} className="lab-match">
                      {['a', 'b'].map(side => <button key={side} type="button" disabled={busy || !live} className={`lab-side ${x.v[as] === side ? 'on' : ''} ${x.w === x[side] ? 'won' : ''}`} onClick={() => vote(mi, side)}><Cover game={g(x[side])} className="xs" /><b>{g(x[side])?.name}</b><strong>{side === 'a' ? a : b}</strong></button>)}
                      <span className="lab-vs">VS</span>
                      {x.tie && <small className="lab-tie">تعادل → قرعة</small>}
                    </div>
                  )
                })}
                {r.bye && <p className="hint">🎟️ تأهلت مباشرة: <bdi>{g(r.bye)?.name}</bdi></p>}
              </div>
            ))}
            <button className="btn gold" disabled={busy} onClick={closeRound}>أقفل الجولة</button>
          </>
        )}
        {m.phase === 'done' && win && <div className="lab-winner"><Cover game={win} className="sm" /><div><small>🏆 لعبة الشهر {m.month}</small><b>{win.name}</b></div></div>}
        {m.history?.length > 0 && <ul className="lab-hist">{m.history.map((h, i) => <li key={i}>{h.month} · <bdi>{g(h.winner)?.name}</bdi></li>)}</ul>}
      </div>
    </Section>
  )
}

// ---------- 3) الدوري الموسمي ----------
function League() {
  const { lab, save, busy, idx } = useLab()
  const L = lab.league
  const [f, setF] = useState({ name: 'دوري العيال', start: today(), end: '', ids: idx.players.map(p => p.id) })
  const pl = id => idx.playersById.get(id)
  const used = new Set((L?.stages || []).map(s => s.game).filter(Boolean))
  const mkStage = n => {
    const pool = idx.games.filter(g => fits(g, n) && !used.has(g.id))
    const duel = pool.filter(g => g.category === 'duel')
    const src = n === 2 ? (duel.length ? duel : pool) : pool.filter(g => g.category !== 'duel')
    return { n, cands: shuffle(src).slice(0, 3).map(g => g.id), game: null, order: [] }
  }
  const create = () => save({ league: { name: f.name, start: f.start, end: f.end, status: 'active', players: f.ids, stages: [mkStage(f.ids.length)], out: [] } }, 'انبدا الدوري')
  const alive = L ? L.players.filter(id => !L.out.some(o => o.id === id)) : []
  const stage = L?.stages?.[L.stages.length - 1]
  const patch = p => save({ league: { ...L, stages: [...L.stages.slice(0, -1), { ...stage, ...p }] } }, 'تم')
  const reroll = () => patch({ cands: mkStage(stage.n).cands })
  const tapOrder = id => !stage.order.includes(id) && patch({ order: [...stage.order, id] })
  const lock = () => {
    const order = stage.order, loser = order[order.length - 1]
    const out = [...L.out, { id: loser, n: stage.n, game: stage.game }]
    const rest = alive.filter(x => x !== loser)
    const done = stage.n === 2
    const stages = [...L.stages.slice(0, -1), { ...stage, order, loser }]
    if (done) save({ league: { ...L, stages, out, status: 'done', champion: order[0] } }, '🏆 انتهى الدوري')
    else save({ league: { ...L, stages: [...stages, mkStage(rest.length)], out } }, `طلع ${pl(loser)?.name}`)
  }
  const status = L ? (L.status === 'done' ? 'انتهى' : today() < L.start ? 'ما بدأ بعد (حسب التاريخ)' : L.end && today() > L.end ? 'تجاوز تاريخ النهاية' : 'جاري') : ''
  return (
    <Section title="🏟️ الدوري الموسمي">
      <div className="pad lab-box">
        <p className="hint">تحدد البداية والنهاية والمشاركين. كل مرحلة تطلع ألعاب عشوائية تناسب عدد الباقين، والأخير في الترتيب يطلع، ولين يبقى اثنين يلعبون النهائي على لعبة 1v1.</p>
        {!L && (
          <div className="form">
            <input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="اسم الدوري" />
            <div className="lab-row"><label className="hint">يبدأ<input className="input" type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label><label className="hint">ينتهي<input className="input" type="date" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></label></div>
            <div className="lab-who"><small>المشاركين ({f.ids.length}):</small>{idx.players.map(p => <button key={p.id} type="button" className={f.ids.includes(p.id) ? 'on' : ''} onClick={() => setF({ ...f, ids: f.ids.includes(p.id) ? f.ids.filter(x => x !== p.id) : [...f.ids, p.id] })}><Avatar player={p} size={30} /></button>)}</div>
            <button className="btn primary" disabled={busy || f.ids.length < 2 || !f.name.trim()} onClick={create}>🚀 ابدأ الدوري</button>
          </div>
        )}
        {L && (
          <>
            <div className="lab-league-h"><b>{L.name}</b><small>{L.start}{L.end ? ` ← ${L.end}` : ''} · {status}</small></div>
            <div className="lab-alive">{alive.map(id => <span key={id}><Avatar player={pl(id)} size={34} /><em>{pl(id)?.name}</em></span>)}</div>
            {L.status === 'done' && <div className="lab-winner"><Avatar player={pl(L.champion)} size={56} /><div><small>🏆 بطل الدوري</small><b>{pl(L.champion)?.name}</b></div></div>}
            {L.status === 'active' && stage && (
              <div className="lab-stage">
                <h4>المرحلة: {stage.n} لاعبين{stage.n === 2 ? ' · النهائي' : ''}</h4>
                {!stage.game ? (
                  <>
                    <p className="hint">اختر لعبة المرحلة:</p>
                    <div className="lab-grid">{stage.cands.map(id => idx.gamesById.get(id) && <GameChip key={id} g={idx.gamesById.get(id)} disabled={busy} onClick={() => patch({ game: id })} />)}</div>
                    {!stage.cands.length && <p className="hint">ما فيه لعبة مناسبة لهذا العدد.</p>}
                    <button className="btn small ghost" disabled={busy} onClick={reroll}>🎲 غيّر الخيارات</button>
                  </>
                ) : (
                  <>
                    <div className="lab-winner"><Cover game={idx.gamesById.get(stage.game)} className="sm" /><div><small>لعبة المرحلة</small><b>{idx.gamesById.get(stage.game)?.name}</b></div></div>
                    <p className="hint">اضغط اللاعبين بترتيب النهاية من الأول للأخير. الأخير يطلع.</p>
                    <div className="lab-alive">{alive.map(id => { const k = stage.order.indexOf(id); return <button key={id} type="button" className={k >= 0 ? 'on' : ''} onClick={() => tapOrder(id)}><Avatar player={pl(id)} size={34} /><em>{k >= 0 ? `#${k + 1}` : pl(id)?.name}</em></button> })}</div>
                    <div className="lab-row">
                      <button className="btn gold" disabled={busy || stage.order.length !== alive.length} onClick={lock}>ثبّت النتيجة</button>
                      <button className="btn small ghost" onClick={() => patch({ order: [], game: null })}>ارجع</button>
                    </div>
                  </>
                )}
              </div>
            )}
            {L.out.length > 0 && <ol className="lab-hist">{L.out.map((o, i) => <li key={i}>طلع {pl(o.id)?.name} في مرحلة {o.n} · <bdi>{idx.gamesById.get(o.game)?.name}</bdi></li>)}</ol>}
            <button className="link-btn danger" disabled={busy} onClick={() => save({ league: null }, 'انحذف الدوري')}>احذف الدوري</button>
          </>
        )}
      </div>
    </Section>
  )
}

export default function Lab() {
  const { me } = useStore()
  const [tab, setTab] = useState('election')
  if (!me?.is_admin) return <Empty title="هذي للمسؤول بس" />
  const tabs = [['election', '🗳️ الانتخابات'], ['month', '🏆 لعبة الشهر'], ['league', '🏟️ الدوري']]
  return (
    <>
      <p className="hint pad-x">🔬 تجارب خاصة فيك، ما أحد غيرك يشوفها. تقدر تتصرف باسم أي لاعب عشان تجرّب.</p>
      <div className="lab-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'election' ? <Election /> : tab === 'month' ? <Month /> : <League />}
    </>
  )
}
