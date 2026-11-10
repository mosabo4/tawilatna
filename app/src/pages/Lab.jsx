import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import { useFriday } from './Social'
import { SYSTEMS, DEFAULTS, compute } from '../rankSystems'
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
const TWISTS = [
  { id: 'shield', icon: '🛡️', name: 'جولة الدرع', desc: 'الفايز بكل لعبة ياخذ درع: لو جاء الأخير بعدين يقدر ينقذ نفسه مرة وحدة' },
  { id: 'double', icon: '💎', name: 'نقاط مضاعفة', desc: 'كل النقاط في هذي المرحلة ×2' },
  { id: 'ghost', icon: '👻', name: 'تحدي الأشباح', desc: 'اللي طلعوا يختارون للمتبقين شرط ظريف في اللعب (بدون كلام، بدون ما تشوف الأوراق…)' },
  { id: 'rev', icon: '🔄', name: 'الأخير يبدأ', desc: 'صاحب أقل نقاط يبدأ الدور الأول ويختار مكانه' },
  { id: 'king', icon: '👑', name: 'طقطقة المتصدر', desc: 'متصدر النقاط يلعب بدون أي مساعدة من أحد' },
  { id: 'plain', icon: '🎲', name: 'جولة عادية', desc: 'بدون شروط، العب وبس' },
]
const EPI = ['كان يعتقد إنه فاهم اللعبة 🪦', 'راح ضحية الحظ… أو هكذا يقول 🎲', 'نقول عنه: لعب بشرف 🫡', 'كلنا نتذكر آخر حركة له 😭', 'سلّم المفتاح وراح يتفرج 🍿', 'وعد إنه راجع السنة الجاية 🔥']
const hash = str => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)

const planOf = n => { const out = []; while (n > 2) { const k = n >= 5 ? 2 : 1; out.push({ n, k }); n -= k } out.push({ n: 2, k: 1 }); return out }
const toFriday = d => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + ((5 - x.getDay() + 7) % 7)); return x }
const dFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })

function League() {
  const { lab, save, busy, idx } = useLab()
  const { notify } = useStore()
  const L = lab.league
  const [as, setAs] = useState(null)
  const [tab, setTab] = useState('arena')
  const [f, setF] = useState({ name: 'دوري العيال', start: today(), end: '', ids: idx.players.map(p => p.id) })
  const pl = id => idx.playersById.get(id)
  const gm = id => idx.gamesById.get(id)
  const usedIds = new Set((L?.stages || []).flatMap(s => s.picked || []))
  const mkStage = (n, used = usedIds) => {
    const k = n >= 5 ? 2 : 1
    let pool = idx.games.filter(g => !used.has(g.id) && fits(g, n) && (k < 2 || fits(g, n - 1) || fits(g, n)))
    const duel = pool.filter(g => g.category === 'duel')
    if (n === 2) pool = duel.length ? duel : pool; else pool = pool.filter(g => g.category !== 'duel')
    const twist = n === 2 ? { id: 'final', icon: '🏆', name: 'النهائي', desc: 'لعبة وحدة، فايز وحد، وبطل الدوري' } : TWISTS[Math.floor(Math.random() * TWISTS.length)]
    return { n, k, cands: shuffle(pool).slice(0, 3).map(g => g.id), votes: {}, preds: {}, picked: null, plays: [], order: [], twist }
  }
  const strip = x => Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'prev'))
  const create = () => save({ league: { name: f.name, start: f.start, end: f.end, status: 'active', players: f.ids, initial: f.ids.length, stages: [mkStage(f.ids.length, new Set())], out: [], pts: {}, shields: {}, jury: {} } }, 'انبدا الدوري')
  const alive = L ? L.players.filter(id => !L.out.some(o => o.id === id)) : []
  const stage = L?.stages?.[L.stages.length - 1]
  const asId = as || L?.players?.[0]
  const putStage = (p, extra = {}, msg = 'تم') => save({ league: { ...L, ...extra, stages: [...L.stages.slice(0, -1), { ...stage, ...p }] } }, msg)
  const toggleVote = gid => {
    const cur = stage.votes[asId] || []
    const nx = cur.includes(gid) ? cur.filter(x => x !== gid) : cur.length < stage.k ? [...cur, gid] : [...cur.slice(1), gid]
    putStage({ votes: { ...stage.votes, [asId]: nx } })
  }
  const tally = new Map((stage?.cands || []).map(id => [id, 0]))
  Object.values(stage?.votes || {}).flat().forEach(id => tally.set(id, (tally.get(id) || 0) + 1))
  const voted = Object.keys(stage?.votes || {}).length
  const lockVote = () => {
    const ranked = shuffle(stage.cands).sort((a, b) => tally.get(b) - tally.get(a))
    save({ league: { ...L, prev: strip(L), stages: [...L.stages.slice(0, -1), { ...stage, picked: ranked.slice(0, stage.k) }] } }, 'انحسمت الألعاب')
  }
  const reroll = () => putStage({ cands: mkStage(stage.n).cands, votes: {} })
  const tap = id => !stage.order.includes(id) && putStage({ order: [...stage.order, id] })
  const shieldOf = id => L.shields?.[id] || 0
  const cur = stage?.picked ? stage.plays.length : 0
  const curGame = stage?.picked?.[cur]
  const [useSh, setUseSh] = useState(false)
  const lockPlay = () => {
    const order = stage.order, n = order.length
    const last = order[n - 1]
    const saved = useSh && n > 2 && shieldOf(last) > 0
    const loser = saved ? order[n - 2] : last
    const mult = stage.twist.id === 'double' ? 2 : 1
    const gain = {}; order.forEach((id, i) => { gain[id] = (n - 1 - i) * mult })
    const pts = { ...L.pts }; order.forEach(id => { pts[id] = (pts[id] || 0) + gain[id] })
    const jury = { ...(L.jury || {}) }
    Object.entries(stage.preds || {}).forEach(([pid, t]) => { if (t === loser) jury[pid] = (jury[pid] || 0) + 1 })
    const shields = { ...L.shields }
    if (saved) shields[last] = shieldOf(last) - 1
    if (stage.twist.id === 'shield' && n > 2) shields[order[0]] = (shields[order[0]] || 0) + 1
    const out = [...L.out, { id: loser, n, game: curGame, st: L.stages.length, saved }]
    const rest = alive.filter(x => x !== loser)
    const play = { game: curGame, order, loser, last, saved, gain, preds: stage.preds || {} }
    const st = { ...stage, plays: [...stage.plays, play], order: [], preds: {} }
    const stages = [...L.stages.slice(0, -1), st]
    const base = { ...L, prev: strip(L), out, pts, jury, shields }
    setUseSh(false)
    if (rest.length === 1) return save({ league: { ...base, stages, status: 'done', champion: rest[0] } }, '🏆 انتهى الدوري')
    if (st.plays.length >= st.k) {
      const used = new Set(stages.flatMap(x => x.picked || []))
      return save({ league: { ...base, stages: [...stages, mkStage(rest.length, used)] } }, `طلع ${pl(loser)?.name}`)
    }
    save({ league: { ...base, stages } }, `طلع ${pl(loser)?.name}`)
  }
  const undo = () => L.prev && save({ league: L.prev }, '↩️ تراجعت')
  const dayLeft = L?.end ? Math.ceil((new Date(L.end) - new Date(today())) / 864e5) : null
  const status = L ? (L.status === 'done' ? 'انتهى' : today() < L.start ? 'ما بدأ بعد (حسب التاريخ)' : L.end && today() > L.end ? 'تجاوز تاريخ النهاية' : 'جاري') : ''
  const rankOf = (map, ids) => new Map([...ids].sort((a, b) => (map[b] || 0) - (map[a] || 0)).map((id, i) => [id, i]))
  const allPlays = L ? L.stages.flatMap(s => s.plays || []) : []
  const lastPlay = allPlays[allPlays.length - 1]
  const board = L ? [...L.players].sort((a, b) => (L.out.some(o => o.id === a) - L.out.some(o => o.id === b)) || (L.pts[b] || 0) - (L.pts[a] || 0)) : []
  const aliveBoard = board.filter(id => alive.includes(id))
  const danger = aliveBoard.length > 2 ? aliveBoard[aliveBoard.length - 1] : null
  const progress = L ? ((L.initial - alive.length) / Math.max(1, L.initial - 1)) * 100 : 0
  const old = L && L.stages?.length && !stage?.votes
  const before = L && lastPlay ? (() => { const m = { ...L.pts }; Object.entries(lastPlay.gain || {}).forEach(([id, g]) => { m[id] = (m[id] || 0) - g }); return rankOf(m, L.players) })() : null
  const nowRank = L ? rankOf(L.pts, L.players) : null
  const stat = id => ({
    wins: allPlays.filter(x => x.order[0] === id).length,
    lasts: allPlays.filter(x => x.last === id).length,
    saves: allPlays.filter(x => x.saved && x.last === id).length,
  })
  const plan = L ? planOf(L.initial) : []
  const planDates = L && L.end && L.start ? plan.map((_, i) => { const t = new Date(L.start + 'T00:00:00').getTime() + (plan.length > 1 ? (i / (plan.length - 1)) : 0) * (new Date(L.end) - new Date(L.start)); const d = toFriday(new Date(t).toISOString().slice(0, 10)); return dFmt.format(d) }) : []
  const awards = L ? (() => {
    const top = (fn) => { const v = L.players.map(id => [id, fn(id)]).sort((a, b) => b[1] - a[1]); return v[0] && v[0][1] > 0 ? v[0] : null }
    const fin = L.status === 'done' ? [L.champion, L.out[L.out.length - 1]?.id] : []
    const horse = fin.length ? fin.map(id => [id, L.pts[id] || 0]).sort((a, b) => a[1] - b[1])[0] : null
    return [
      ['📈', 'الهدّاف', top(id => L.pts[id] || 0), 'نقطة'],
      ['🥇', 'الأكثر فوزاً بالألعاب', top(id => stat(id).wins), 'فوز'],
      ['💀', 'أكثر واحد جاء أخير', top(id => stat(id).lasts), 'مرة'],
      ['🛡️', 'سيّد الدروع', top(id => stat(id).saves), 'إنقاذ'],
      ['🔮', 'أفضل محلّف (توقعات)', top(id => L.jury?.[id] || 0), 'توقع صح'],
      horse && ['🐎', 'الحصان الأسود', horse, 'نقطة بس'],
    ].filter(x => x && x[2])
  })() : []
  const recap = () => {
    const lines = [`🏟️ ${L.name}`, L.status === 'done' ? `🏆 البطل: ${pl(L.champion)?.name}` : `باقين ${alive.length} من ${L.initial}`, '', 'الترتيب:']
    board.forEach((id, i) => lines.push(`${i + 1}. ${pl(id)?.name} — ${L.pts[id] || 0}${L.out.some(o => o.id === id) ? ' 🪦' : ''}`))
    if (awards.length) { lines.push('', 'الأوسمة:'); awards.forEach(([i, t, w]) => lines.push(`${i} ${t}: ${pl(w[0])?.name}`)) }
    try { navigator.clipboard.writeText(lines.join('\n')); notify('اننسخ الملخص، الصقه في الواتس', 'ok') } catch { notify(lines.join(' | '), 'ok') }
  }
  return (
    <Section title="🏟️ الدوري الموسمي">
      <div className="pad lab-box">
        {!L && (
          <>
            <p className="hint">كل مرحلة: 3 ألعاب عشوائية، واللاعبين (حتى اللي طلعوا: «هيئة المحلفين») يصوّتون على اللي تنلعب. من 5 لاعبين فوق تنلعب لعبتين في المرحلة ويطلع واحد بكل لعبة، وبعدها لعبة وحدة لكل مرحلة لين النهائي. فيه نقاط ودروع وتويستات وتوقعات وأوسمة.</p>
            <div className="form">
              <input className="input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="اسم الدوري" />
              <div className="lab-row"><label className="hint">يبدأ<input className="input" type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label><label className="hint">ينتهي<input className="input" type="date" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></label></div>
              <div className="lab-who"><small>المشاركين ({f.ids.length}):</small>{idx.players.map(p => <button key={p.id} type="button" className={f.ids.includes(p.id) ? 'on' : ''} onClick={() => setF({ ...f, ids: f.ids.includes(p.id) ? f.ids.filter(x => x !== p.id) : [...f.ids, p.id] })}><Avatar player={p} size={30} /></button>)}</div>
              {f.ids.length >= 2 && <p className="hint">📅 المخطط: {planOf(f.ids.length).length} مراحل ({planOf(f.ids.length).reduce((t, x) => t + x.k, 0)} ألعاب) — {planOf(f.ids.length).map(x => x.n).join(' ← ')}</p>}
              <button className="btn primary" disabled={busy || f.ids.length < 2 || !f.name.trim()} onClick={create}>🚀 ابدأ الدوري</button>
            </div>
          </>
        )}
        {old && <><p className="hint">هذا دوري بالنظام القديم، احذفه وابدأ واحد جديد.</p><button className="btn danger-link" onClick={() => save({ league: null }, 'انحذف')}>احذفه</button></>}
        {L && !old && (
          <>
            <div className={`lab-banner ${L.status === 'done' ? 'done' : ''}`}>
              <b>{L.name}</b>
              <small>{L.start}{L.end ? ` ← ${L.end}` : ''} · {status}{dayLeft != null && L.status !== 'done' && dayLeft >= 0 ? ` · باقي ${dayLeft} يوم` : ''}</small>
              <div className="lab-prog"><i style={{ width: `${progress}%` }} /></div>
              <small>{alive.length} باقين من {L.initial}</small>
            </div>

            {L.status === 'done' && (
              <div className="lab-champ">
                <span className="lab-conf" aria-hidden="true">🎉 ✨ 🎊 ✨ 🎉</span>
                <Avatar player={pl(L.champion)} size={84} frame="gold" />
                <small>🏆 بطل {L.name}</small><b>{pl(L.champion)?.name}</b>
                <small>وصيفه: {pl(L.out[L.out.length - 1]?.id)?.name} · {L.pts[L.champion] || 0} نقطة</small>
              </div>
            )}

            <div className="lab-tabs in">{[['arena', '⚔️ الساحة'], ['table', '📊 الترتيب'], ['plan', '🗓️ الجدول'], ['awards', '🏅 الأوسمة']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

            {tab === 'arena' && (
              <>
                <div className="lab-arena">
                  {board.map((id, i) => {
                    const o = L.out.find(x => x.id === id)
                    return (
                      <div key={id} className={`lab-pl ${o ? 'out' : ''} ${id === danger ? 'danger' : ''}`}>
                        <Avatar player={pl(id)} size={40} />
                        <em>{pl(id)?.name}</em>
                        <b>{L.pts[id] || 0}</b>
                        <i>{o ? '🪦' : i === 0 ? '👑' : id === danger ? '🔥' : ''}{shieldOf(id) > 0 && !o ? '🛡️'.repeat(shieldOf(id)) : ''}</i>
                      </div>
                    )
                  })}
                </div>
                <p className="hint">👑 المتصدر · 🔥 الأضعف (على الحافة) · 🛡️ درع ينقذ من الطلوع · 🪦 طالع (يظل محلّف)</p>

                {L.status === 'active' && stage && (
                  <div className="lab-stage">
                    <div className="lab-twist" key={`${L.stages.length}-${stage.twist.id}`}><span className="lab-roll">{stage.twist.icon}</span><div><b>{stage.twist.name}</b><small>{stage.twist.desc}</small></div></div>
                    <h4>المرحلة {L.stages.length} · {stage.n} لاعبين · {stage.k === 2 ? 'لعبتين (يطلع واحد بكل لعبة)' : 'لعبة وحدة (يطلع واحد)'}</h4>
                    {!stage.picked ? (
                      <>
                        <p className="hint">🗳️ صوّتوا على {stage.k === 2 ? 'لعبتين' : 'لعبة'} من ال3 (يصوّت كل المشاركين حتى اللي طلعوا):</p>
                        <Who value={asId} onChange={setAs} list={L.players.map(pl)} />
                        <div className="lab-grid">{stage.cands.map((id, i) => gm(id) && <div key={id} className="lab-flip" style={{ animationDelay: `${i * 0.15}s` }}><GameChip g={gm(id)} on={(stage.votes[asId] || []).includes(id)} disabled={busy} onClick={() => toggleVote(id)}><i className="lab-bar"><u style={{ width: `${voted ? (tally.get(id) / voted) * 100 : 0}%` }} /></i><em>{tally.get(id)} صوت</em></GameChip></div>)}</div>
                        {!stage.cands.length && <p className="hint">ما فيه ألعاب كافية لهذا العدد.</p>}
                        <div className="lab-row"><button className="btn gold" disabled={busy || !voted} onClick={lockVote}>🔒 أقفل التصويت ({voted}/{L.players.length})</button><button className="btn small ghost" disabled={busy} onClick={reroll}>🎲 غيّر الخيارات</button></div>
                      </>
                    ) : (
                      <>
                        <div className="lab-picked">{stage.picked.map((id, i) => gm(id) && <div key={id} className={`lab-pk ${i === cur ? 'now' : i < cur ? 'done' : ''}`}><Cover game={gm(id)} className="xs" /><b>{gm(id).name}</b><small>{i < cur ? `✔ طلع ${pl(stage.plays[i].loser)?.name}${stage.plays[i].saved ? ' (بعد الدرع)' : ''}` : i === cur ? '▶ الحين' : 'بعدها'}</small>{i <= cur && <a className="link-btn" href={`#/log?game=${id}`}>📝 سجّلها كقيم عادي</a>}</div>)}</div>
                        {curGame && (
                          <>
                            <div className="lab-pred">
                              <b>🔮 توقّع مين يطلع (+1 لو صح)</b>
                              <Who value={asId} onChange={setAs} list={L.players.map(pl)} />
                              <div className="lab-alive">{alive.filter(x => x !== asId).map(id => <button key={id} type="button" className={stage.preds?.[asId] === id ? 'on' : ''} onClick={() => putStage({ preds: { ...stage.preds, [asId]: id } })}><Avatar player={pl(id)} size={30} /><em>{pl(id)?.name}</em></button>)}</div>
                              <small>{Object.keys(stage.preds || {}).length} توقّعوا</small>
                            </div>
                            <p className="hint">اضغط اللاعبين بترتيب نهاية «{gm(curGame)?.name}» من الأول للأخير:</p>
                            <div className="lab-alive">{alive.map(id => { const k = stage.order.indexOf(id); return <button key={id} type="button" className={k >= 0 ? 'on' : ''} onClick={() => tap(id)}><Avatar player={pl(id)} size={36} /><em>{k >= 0 ? `#${k + 1}` : pl(id)?.name}</em></button> })}</div>
                            {stage.order.length === alive.length && alive.length > 2 && shieldOf(stage.order[stage.order.length - 1]) > 0 && (
                              <label className="switch"><input type="checkbox" checked={useSh} onChange={e => setUseSh(e.target.checked)} /><span>🛡️ {pl(stage.order[stage.order.length - 1])?.name} يستخدم درعه وينقذ نفسه (يطلع اللي قبله)</span></label>
                            )}
                            <div className="lab-row">
                              <button className="btn gold" disabled={busy || stage.order.length !== alive.length} onClick={lockPlay}>{alive.length === 2 ? '🏆 أعلن البطل' : '🪦 ثبّت واطلّع الأخير'}</button>
                              <button className="btn small ghost" onClick={() => putStage({ order: [] })}>صفّر الترتيب</button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {L.out.length > 0 && (
                  <div className="lab-yard">
                    <h4>🪦 المقبرة</h4>
                    <ul>{[...L.out].reverse().map((o, i) => <li key={i}><Avatar player={pl(o.id)} size={30} /><div><b>{pl(o.id)?.name}</b><small>طلع بمرحلة {o.st} على <bdi>{gm(o.game)?.name}</bdi> · {EPI[hash(o.id + o.st) % EPI.length]}</small></div></li>)}</ul>
                  </div>
                )}
              </>
            )}

            {tab === 'table' && (
              <div className="lab-table">
                <div className="lab-tr head"><span>#</span><span>اللاعب</span><span>نقاط</span><span>فوز</span><span>🔮</span></div>
                {board.map((id, i) => {
                  const o = L.out.find(x => x.id === id)
                  const mv = before ? before.get(id) - nowRank.get(id) : 0
                  const g = lastPlay?.gain?.[id]
                  return (
                    <div key={id} className={`lab-tr ${o ? 'out' : ''}`}>
                      <span>{i + 1}{mv > 0 ? <i className="up">▲</i> : mv < 0 ? <i className="dn">▼</i> : null}</span>
                      <span className="lab-wh"><Avatar player={pl(id)} size={26} />{pl(id)?.name}{o ? ' 🪦' : ''}</span>
                      <span><b>{L.pts[id] || 0}</b>{g ? <small> +{g}</small> : null}</span>
                      <span>{stat(id).wins}</span>
                      <span>{L.jury?.[id] || 0}</span>
                    </div>
                  )
                })}
                <p className="hint">▲▼ حركة الترتيب بعد آخر لعبة · 🔮 نقاط التوقعات (المحلّفين)</p>
                {L.stages.some(s => s.plays?.length) && (
                  <>
                    <h4>📜 نتائج الألعاب</h4>
                    {L.stages.flatMap((s, si) => (s.plays || []).map((x, pi) => (
                      <div key={`${si}-${pi}`} className="lab-res"><b>م{si + 1} · {gm(x.game)?.name}</b><span>{x.order.map((id, k) => `${k + 1}) ${pl(id)?.name}`).join('  ')}</span></div>
                    )))}
                  </>
                )}
              </div>
            )}

            {tab === 'plan' && (
              <ol className="lab-plan">
                {plan.map((x, i) => {
                  const st = L.stages[i]
                  const state = st ? (i < L.stages.length - 1 || L.status === 'done' ? 'done' : 'now') : 'fut'
                  return (
                    <li key={i} className={state}>
                      <span className="lab-pn">{x.n === 2 ? '🏆' : i + 1}</span>
                      <div><b>{x.n === 2 ? 'النهائي' : `المرحلة ${i + 1}`} · {x.n} لاعبين</b><small>{x.k === 2 ? 'لعبتين' : 'لعبة'}{planDates[i] ? ` · ${planDates[i]}` : ''}</small>{st?.picked && <small>🎲 {st.picked.map(id => gm(id)?.name).join(' + ')}</small>}</div>
                    </li>
                  )
                })}
                {!L.end && <p className="hint">حدد تاريخ نهاية عشان تتوزع المراحل على جمعات.</p>}
              </ol>
            )}

            {tab === 'awards' && (
              <div className="lab-awards">
                {awards.length ? awards.map(([ic, t, w, u]) => <div key={t} className="lab-aw"><span>{ic}</span><div><b>{t}</b><small>{pl(w[0])?.name} · {w[1]} {u}</small></div><Avatar player={pl(w[0])} size={36} /></div>) : <p className="hint">الأوسمة تطلع بعد أول لعبة.</p>}
              </div>
            )}

            <div className="lab-row wrap">
              <button className="btn small ghost" onClick={recap}>📋 انسخ الملخص للواتس</button>
              {L.prev && <button className="btn small ghost" disabled={busy} onClick={undo}>↩️ تراجع عن آخر خطوة</button>}
              <button className="link-btn danger" disabled={busy} onClick={() => save({ league: null }, 'انحذف الدوري')}>احذف الدوري</button>
            </div>
          </>
        )}
      </div>
    </Section>
  )
}

// ---------- 4) المرشّحون والمصوّتون (أدوار تتبدّل كل جلسة) ----------
function Rota() {
  const { lab, save, busy, idx } = useLab()
  const R = lab.rota || { sessions: [] }
  const S = R.sessions || []
  const cur = S.length && S[S.length - 1].phase !== 'done' ? S[S.length - 1] : null
  const pl = id => idx.playersById.get(id)
  const gm = id => idx.gamesById.get(id)
  const n = idx.players.length
  const maxK = Math.max(2, Math.floor(n / 2))
  const [k, setK] = useState(Math.min(3, maxK))
  const [as, setAs] = useState(null)
  const [pick, setPick] = useState('')
  const chosen = new Map(idx.players.map(p => [p.id, 0]))
  S.forEach(x => x.choosers.forEach(id => chosen.set(id, (chosen.get(id) || 0) + 1)))
  const putSessions = (sessions, msg) => save({ rota: { sessions } }, msg)
  const start = () => {
    const order = shuffle(idx.players.map(p => p.id)).sort((a, b) => chosen.get(a) - chosen.get(b))
    const choosers = order.slice(0, k), voters = order.slice(k)
    putSessions([...S, { id: Date.now(), date: today(), k, choosers, voters, noms: {}, votes: {}, phase: 'nominate' }], 'بدأت جلسة جديدة')
  }
  const upd = p => putSessions([...S.slice(0, -1), { ...cur, ...p }], 'تم')
  const asId = as && (cur?.choosers.includes(as) || cur?.voters.includes(as)) ? as : (cur?.phase === 'vote' ? cur?.voters[0] : cur?.choosers[0])
  const mine = cur?.noms[asId] || []
  const allNoms = cur ? [...new Set(Object.values(cur.noms).flat())] : []
  const nominate = () => pick && !mine.includes(pick) && mine.length < 2 && (upd({ noms: { ...cur.noms, [asId]: [...mine, pick] } }), setPick(''))
  const tally = new Map(allNoms.map(id => [id, 0])); if (cur) Object.values(cur.votes).forEach(id => tally.set(id, (tally.get(id) || 0) + 1))
  const finish = () => {
    const max = Math.max(0, ...tally.values()); const lead = [...tally].filter(([, c]) => c === max).map(x => x[0])
    upd({ phase: 'done', winner: lead[Math.floor(Math.random() * lead.length)], tie: lead.length > 1, tally: Object.fromEntries(tally) })
  }
  const nomBy = gid => cur.choosers.filter(id => (cur.noms[id] || []).includes(gid))
  return (
    <Section title="🎭 مرشّحون ومصوّتون">
      <div className="pad lab-box">
        <p className="hint">كل جلسة: مجموعة صغيرة «المرشّحين» تختار الألعاب، والباقين «المصوّتين» يصوّتون بينها بس، ما يقدرون يطلعون ألعاب جديدة. الأدوار تتبدّل كل جلسة، والعدد يتغير، واللي قليل ترشيحه سابقاً ياخذ أولوية.</p>
        {!cur && (
          <>
            <label className="hint">عدد المرشّحين هالجلسة: <b>{k}</b> (والمصوّتين {n - k})
              <input type="range" min="2" max={maxK} value={k} onChange={e => setK(+e.target.value)} style={{ width: '100%' }} />
            </label>
            <button className="btn small ghost" onClick={() => setK(2 + Math.floor(Math.random() * (maxK - 1)))}>🎲 عشوائي</button>
            <button className="btn primary" disabled={busy || n < 3} onClick={start}>🎬 ابدأ جلسة جديدة</button>
          </>
        )}
        {cur && (
          <>
            <div className="lab-roles">
              <div><h4>🎯 المرشّحون ({cur.choosers.length})</h4><div className="lab-alive">{cur.choosers.map(id => <span key={id}><Avatar player={pl(id)} size={34} /><em>{pl(id)?.name}</em></span>)}</div></div>
              <div><h4>🗳️ المصوّتون ({cur.voters.length})</h4><div className="lab-alive">{cur.voters.map(id => <span key={id}><Avatar player={pl(id)} size={34} /><em>{pl(id)?.name}</em></span>)}</div></div>
            </div>
            {cur.phase === 'nominate' && (
              <>
                <Who value={asId} onChange={setAs} list={cur.choosers.map(pl)} />
                <div className="lab-row">
                  <select className="input" value={pick} onChange={e => setPick(e.target.value)}><option value="">اختر لعبة…</option>{idx.games.filter(g => fits(g, n)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                  <button className="btn small primary" disabled={busy || !pick || mine.length >= 2} onClick={nominate}>رشّح</button>
                </div>
                <p className="hint">{pl(asId)?.name}: {mine.length} من 2</p>
                <div className="lab-grid">{allNoms.map(id => gm(id) && <GameChip key={id} g={gm(id)} disabled><em>{nomBy(id).map(x => pl(x)?.name).join('، ')}</em></GameChip>)}</div>
                <button className="btn gold" disabled={busy || allNoms.length < 2} onClick={() => upd({ phase: 'vote' })}>🔒 أقفل الترشيح وافتح التصويت</button>
              </>
            )}
            {cur.phase === 'vote' && (
              <>
                <Who value={asId} onChange={setAs} list={cur.voters.map(pl)} />
                <div className="lab-grid">{allNoms.map(id => gm(id) && <GameChip key={id} g={gm(id)} on={cur.votes[asId] === id} disabled={busy} onClick={() => upd({ votes: { ...cur.votes, [asId]: id } })}><i className="lab-bar"><u style={{ width: `${Object.keys(cur.votes).length ? (tally.get(id) / Object.keys(cur.votes).length) * 100 : 0}%` }} /></i><em>{tally.get(id)} صوت</em></GameChip>)}</div>
                <p className="hint">صوّت {Object.keys(cur.votes).length} من {cur.voters.length}</p>
                <button className="btn gold" disabled={busy || !Object.keys(cur.votes).length} onClick={finish}>🏁 أعلن الفايزة</button>
              </>
            )}
          </>
        )}
        {S.length > 0 && !cur && S[S.length - 1].winner && gm(S[S.length - 1].winner) && (
          <div className="lab-winner"><Cover game={gm(S[S.length - 1].winner)} className="sm" /><div><small>🎯 لعبة الجلسة</small><b>{gm(S[S.length - 1].winner).name}</b>{S[S.length - 1].tie && <small>(حسمتها القرعة)</small>}</div></div>
        )}
        {S.length > 0 && (
          <>
            <h4>📊 كم مرة رشّح كل واحد</h4>
            <div className="lab-alive">{[...idx.players].sort((a, b) => chosen.get(b.id) - chosen.get(a.id)).map(p => <span key={p.id}><Avatar player={p} size={30} /><em>{p.name} · {chosen.get(p.id)}</em></span>)}</div>
            <ul className="lab-hist">{[...S].reverse().filter(x => x.phase === 'done').map(x => <li key={x.id}>{x.date} · {x.k} مرشّحين / {x.voters.length} مصوّتين · <bdi>{gm(x.winner)?.name}</bdi></li>)}</ul>
            <button className="link-btn danger" disabled={busy} onClick={() => save({ rota: null }, 'صُفّرت')}>صفّر السجل</button>
          </>
        )}
      </div>
    </Section>
  )
}

// ---------- 5) أنظمة المستوى والتقييم ----------
const PARAM = { half: ['نص الوزن كل كم يوم', 15, 180, 5], prior: ['قوة السحب نحو الوسط', 0, 12, 1], window: ['عدد آخر القيمات', 3, 30, 1], k: ['حساسية إيلو (K)', 8, 48, 2] }

function Systems() {
  const { idx } = useLab()
  const [sys, setSys] = useState('fair')
  const [opt, setOpt] = useState({ ...DEFAULTS })
  const cur = SYSTEMS.find(x => x.id === sys)
  const rows = useMemo(() => compute(sys, idx, opt), [sys, idx, opt])
  const all = useMemo(() => Object.fromEntries(SYSTEMS.map(x => [x.id, new Map(compute(x.id, idx, opt).map(r => [r.player.id, r.rank]))])), [idx, opt])
  const base = all.raw
  const fmt = v => (cur.unit === '%' ? `${Math.round(v)}%` : Math.round(v))
  const idle = idx.players.filter(p => !rows.some(r => r.player.id === p.id))
  return (
    <Section title="📐 أنظمة المستوى والتقييم">
      <div className="pad lab-box">
        <p className="hint">جرّب أنظمة ترتيب مختلفة وشوف كل واحد وين مركزه في كل نظام. هذا للتجربة بس، الموقع الحقيقي باقي على الحساب الحالي.</p>
        <div className="sy-chips">{SYSTEMS.map(x => <button key={x.id} type="button" className={sys === x.id ? 'on' : ''} onClick={() => setSys(x.id)}><span>{x.icon}</span>{x.name}</button>)}</div>
        <div className="lab-twist"><span>{cur.icon}</span><div><b>{cur.name}</b><small>{cur.desc}</small></div></div>
        {cur.params && cur.params.map(k => (
          <label key={k} className="sy-par"><span>{PARAM[k][0]}: <b>{opt[k]}</b></span><input type="range" min={PARAM[k][1]} max={PARAM[k][2]} step={PARAM[k][3]} value={opt[k]} onChange={e => setOpt({ ...opt, [k]: +e.target.value })} /></label>
        ))}
        <div className="lab-table">
          <div className="lab-tr sy head"><span>#</span><span>اللاعب</span><span>{cur.unit === '%' ? 'النسبة' : 'الرقم'}</span><span>قيم</span><span>خامل</span></div>
          {rows.map(r => {
            const mv = base.get(r.player.id) - r.rank
            return (
              <div key={r.player.id} className="lab-tr sy">
                <span>{r.rank}{sys !== 'raw' && mv > 0 ? <i className="up">▲{mv}</i> : sys !== 'raw' && mv < 0 ? <i className="dn">▼{-mv}</i> : null}</span>
                <span className="lab-wh"><Avatar player={r.player} size={26} />{r.player.name}</span>
                <span><b>{fmt(r.value)}</b></span>
                <span>{r.plays}</span>
                <span>{r.days}ي</span>
              </div>
            )
          })}
        </div>
        {idle.length > 0 && <p className="hint">ما لعبوا للحين: {idle.map(p => p.name).join('، ')}</p>}
        {sys !== 'raw' && <p className="hint">▲▼ = الفرق عن الترتيب الحالي للموقع.</p>}
        <h4>🔀 مركز كل واحد في كل نظام</h4>
        <div className="sy-mx">
          <div className="sy-row head"><span /> {SYSTEMS.map(x => <span key={x.id} title={x.name}>{x.icon}</span>)}</div>
          {idx.players.map(p => (
            <div key={p.id} className="sy-row"><span className="lab-wh"><Avatar player={p} size={24} />{p.name}</span>{SYSTEMS.map(x => <span key={x.id} className={x.id === sys ? 'cur' : ''}>{all[x.id].get(p.id) ?? '—'}</span>)}</div>
          ))}
        </div>
      </div>
    </Section>
  )
}

export default function Lab() {
  const { me } = useStore()
  const [tab, setTab] = useState('election')
  if (!me?.is_admin) return <Empty title="هذي للمسؤول بس" />
  const tabs = [['election', '🗳️ الانتخابات'], ['month', '🏆 لعبة الشهر'], ['league', '🏟️ الدوري'], ['rota', '🎭 الأدوار'], ['sys', '📐 المستوى والتقييم']]
  return (
    <>
      <p className="hint pad-x">🔬 تجارب خاصة فيك، ما أحد غيرك يشوفها. تقدر تتصرف باسم أي لاعب عشان تجرّب.</p>
      <div className="lab-tabs">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'election' ? <Election /> : tab === 'month' ? <Month /> : tab === 'rota' ? <Rota /> : tab === 'sys' ? <Systems /> : <League />}
    </>
  )
}
