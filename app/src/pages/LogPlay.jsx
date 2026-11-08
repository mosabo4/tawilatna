/* eslint-disable react/prop-types */
import { useMemo, useRef, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { Avatar, TopBar, Cover, Confirm, today, Field, Empty, playersText } from '../ui'
import { CATEGORIES, catOf } from '../categories'
import { getLive } from '../live'
import { SCORING, scoringOf, isHeavy } from '../scoring'

// ألوان وأسماء الفرق (تتغير حسب اللعبة)
const TEAMS = [
  { n: 'الأحمر', i: '🔴', c: '#E5484D' }, { n: 'الأزرق', i: '🔵', c: '#3E7BFA' },
  { n: 'الأخضر', i: '🟢', c: '#2FB36B' }, { n: 'الأصفر', i: '🟡', c: '#F2B33D' },
]
const TEAM_PRESETS = {
  'The Resistance: Avalon': [{ n: 'الخير', i: '🛡️', c: '#3E7BFA' }, { n: 'الشر', i: '😈', c: '#E5484D' }],
  Saboteur: [{ n: 'المنقّبون', i: '⛏️', c: '#3E7BFA' }, { n: 'المخرّبون', i: '💣', c: '#E5484D' }],
  'Scotland Yard': [{ n: 'المحققون', i: '🕵️', c: '#3E7BFA' }, { n: 'السيد X', i: '🎩', c: '#E5484D' }],
}
const MARK = '⚔️ '
const VIBES = ['😂 ضحك', '🔥 حماس', '😤 توتر', '🤯 قلبة', '😴 ملل', '🤝 تعاون', '🎭 خداع', '🍿 سوالف']
const MARK2 = '🎭 '
const DURS = [20, 30, 45, 60, 90, 120, 180]
const ymd = off => { const d = new Date(); d.setDate(d.getDate() - off); return d.toLocaleDateString('en-CA') }
const dateText = d => new Date(`${d}T12:00:00`).toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })
const MEDAL = ['🥇', '🥈', '🥉']
const posLabel = n => MEDAL[n - 1] || n
const MODE_TIPS = {
  rank: 'اضغط على اللاعبين بترتيب وصولهم: الأول أول واحد تضغطه',
  points: 'اكتب نقاط كل لاعب والترتيب يطلع لحاله',
  low: 'اكتب النقاط، والأقل نقاط هو الفايز',
  winner: 'اضغط على الفايز',
  elim: 'اضغط على اللي يطلعون بالترتيب، وآخر واحد يبقى هو الفايز',
  teams: 'وزّع اللاعبين على الفرق، ثم اضغط «فاز» على الفريق الفايز',
  coop: 'كلكم تفوزون أو كلكم تخسرون',
}

// مؤشر وقت قابل للسحب: نافذة من 12 ظهراً إلى 12 ظهر اليوم التالي
const toOff = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return ((h * 60 + m - 720) % 1440 + 1440) % 1440 }
const fromOff = o => { const t = (o + 720) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
const fmt12 = o => { const t = (o + 720) % 1440; const h = Math.floor(t / 60), m = t % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}` }
function TimeDial({ start, end, onChange }) {
  const ref = useRef(null)
  const a = toOff(start) ?? 480, b = toOff(end) ?? 600
  const set = (which, o) => {
    const v = Math.max(0, Math.min(1439, Math.round(o / 5) * 5))
    if (which === 'a') onChange(fromOff(Math.min(v, b - 5)), fromOff(b))
    else onChange(fromOff(a), fromOff(Math.max(v, a + 5)))
  }
  const move = which => e => {
    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return
    const r = ref.current.getBoundingClientRect()
    set(which, ((e.clientX - r.left) / r.width) * 1440)
  }
  const down = e => e.currentTarget.setPointerCapture(e.pointerId)
  const tap = e => {
    if (e.target !== ref.current && !e.target.classList.contains('lg-fill')) return
    const r = ref.current.getBoundingClientRect(); const o = ((e.clientX - r.left) / r.width) * 1440
    set(Math.abs(o - a) < Math.abs(o - b) ? 'a' : 'b', o)
  }
  const pct = o => `${(o / 1440) * 100}%`
  const on = start && end
  return (
    <div className={`lg-dial ${on ? 'on' : ''}`}>
      <div className="lg-dial-read"><div><small>بدأنا</small><b>{fmt12(a)}</b></div><i>←</i><div><small>خلصنا</small><b>{fmt12(b)}</b></div><div className="lg-dial-d"><small>المدة</small><b>{b - a >= 60 ? `${Math.floor((b - a) / 60)}:${String((b - a) % 60).padStart(2, '0')} ساعة` : `${b - a}د`}</b></div></div>
      <div className="lg-track" ref={ref} onPointerDown={tap}>
        <div className="lg-fill" style={{ left: pct(a), width: `${((b - a) / 1440) * 100}%` }} />
        <span className="lg-th" style={{ left: pct(a) }} onPointerDown={down} onPointerMove={move('a')}><em>🟢</em></span>
        <span className="lg-th e" style={{ left: pct(b) }} onPointerDown={down} onPointerMove={move('b')}><em>🏁</em></span>
        {[0, 3, 6, 9, 12, 15, 18, 21].map(h => <u key={h} style={{ left: pct(h * 60) }}>{fmt12(h * 60).replace(':00 ', '')}</u>)}
      </div>
      <div className="lg-days">{!on && <small className="muted">اسحب 🟢 و🏁 أو اختر مدة من فوق</small>}</div>
    </div>
  )
}

function Podium({ st, pl, name, story }) {
  const g = n => st.filter(c => c.position === n)
  const rest = st.filter(c => c.position > 3)
  const col = (n, h) => g(n).length > 0 && (
    <div key={n} className={`lg-pcol p${n}`} style={{ '--h': h + 'px' }}>
      <div className="lg-pav">{n === 1 && <em className="lg-crown">👑</em>}{g(n).map(c => <figure key={c.player_id}><Avatar player={pl(c.player_id)} size={n === 1 ? 52 : 42} /><figcaption>{name(c.player_id)}{c.score != null ? ` · ${c.score}` : ''}</figcaption></figure>)}</div>
      <div className="lg-block"><span>{posLabel(n)}</span></div>
    </div>
  )
  return (
    <div className="lg-podium">
      <small>كذا بتنسجل 🎬</small>
      {story && <p className="lg-story">{story}</p>}
      <div className="lg-pstage">{col(2, 64)}{col(1, 92)}{col(3, 44)}</div>
      {rest.length > 0 && <div className="lg-rest">{rest.map(c => <span key={c.player_id}><Avatar player={pl(c.player_id)} size={22} />{name(c.player_id)} <i>#{c.position}</i></span>)}</div>}
    </div>
  )
}

function Party({ party }) {
  const bits = useMemo(() => Array.from({ length: 42 }, (_, i) => ({ l: Math.random() * 100, d: Math.random() * .5, t: 1.4 + Math.random() * 1.2, e: ['🎉', '✨', '🎊', '⭐', '🪙', '🎲'][i % 6], r: Math.round(Math.random() * 360) })), [])
  return (
    <div className="lg-party">
      {bits.map((b, i) => <span key={i} style={{ left: b.l + '%', animationDelay: b.d + 's', animationDuration: b.t + 's', '--r': b.r + 'deg' }}>{b.e}</span>)}
      <div className="lg-party-card"><div className="lg-party-av">{party.players.map(p => <Avatar key={p.id} player={p} size={72} />)}</div><h2>{party.title}</h2><p>{party.sub}</p></div>
    </div>
  )
}

export default function LogPlay({ id, presetGame, live }) {
  const { idx, me, act } = useStore()
  const existing = id ? idx.plays.find(p => p.id === id) : null
  const [gameId, setGameId] = useState(existing?.game_id || presetGame || '')
  const [date, setDate] = useState(existing?.played_on || today())
  const [rows, setRows] = useState(() => existing
    ? existing.results.map(r => ({ player_id: r.player_id, position: r.position, score: r.score ?? '' }))
    : live ? (getLive()?.players || []).map((pid, i) => ({ player_id: pid, position: i + 1, score: '' })) : [])
  const [useScores, setUseScores] = useState(() => !!existing?.results.some(r => r.score != null))
  const parsed = useMemo(() => {
    const lines = (existing?.notes || '').split('\n')
    const t = lines.find(l => l.startsWith(MARK))
    const v = lines.find(l => l.startsWith(MARK2))
    return { team: t ? t.slice(MARK.length) : '', vibes: v ? v.slice(MARK2.length).split('، ').filter(x => VIBES.includes(x)) : [], note: lines.filter(l => !l.startsWith(MARK) && !l.startsWith(MARK2)).join('\n') }
  }, [existing])
  const [notes, setNotes] = useState(parsed.note)
  const [vibes, setVibes] = useState(parsed.vibes)
  const [spin, setSpin] = useState(null)
  const [exps, setExps] = useState(existing?.expansions || [])
  const [winners, setWinners] = useState(() => existing ? existing.results.filter(r => r.position === 1).map(r => r.player_id) : [])
  const [order, setOrder] = useState(() => existing ? [...existing.results].sort((a, b) => a.position - b.position).map(r => r.player_id) : [])
  const [tied, setTied] = useState(() => {
    if (!existing) return []
    const s = [...existing.results].sort((a, b) => a.position - b.position)
    return s.filter((r, i) => i > 0 && r.position === s[i - 1].position).map(r => r.player_id)
  })
  const [elim, setElim] = useState(() => existing ? existing.results.filter(r => r.position > 1).sort((a, b) => b.position - a.position).map(r => r.player_id) : [])
  const [coopWin, setCoopWin] = useState(() => (existing ? existing.results.every(r => r.position === 1) : null))
  const [nTeams, setNTeams] = useState(2)
  const [teamOf, setTeamOf] = useState(() => {
    if (!existing) return {}
    const m = {}
    const part = parsed.team.split(' | ').filter(x => !x.startsWith('🏆'))
    const byName = new Map(idx.players.map(p => [p.name, p.id]))
    part.forEach((seg, ti) => { const names = seg.split(': ')[1]; (names || '').split('، ').forEach(n => { const pid = byName.get(n.trim()); if (pid) m[pid] = ti }) })
    if (!Object.keys(m).length) existing.results.forEach(r => { m[r.player_id] = r.position === 1 ? 0 : 1 })
    return m
  })
  const [winTeam, setWinTeam] = useState(() => {
    if (!existing) return null
    const w = existing.results.find(r => r.position === 1)?.player_id
    return w != null && teamOfInit(parsed, idx, existing)[w] != null ? teamOfInit(parsed, idx, existing)[w] : 0
  })
  const [setupBy, setSetupBy] = useState(existing?.setup_by || [])
  const [cleanupBy, setCleanupBy] = useState(existing?.cleanup_by || [])
  const hm = iso => { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  const [startT, setStartT] = useState(hm(existing?.started_at))
  const [endT, setEndT] = useState(hm(existing?.ended_at))
  const [modeOverride, setModeOverride] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [busy, setBusy] = useState(false)
  const [party, setParty] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const game = idx.gamesById.get(gameId)
  const mode = modeOverride || scoringOf(game)
  const heavy = isHeavy(game)
  const teamSet = (TEAM_PRESETS[game?.name] || TEAMS).slice(0, TEAM_PRESETS[game?.name] ? 2 : nTeams)
  const canEdit = !existing || me?.is_admin || me?.id === existing.created_by
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return idx.games.filter(g => g.name.toLowerCase().includes(t) && (cat === 'all' || catOf(g).id === cat))
  }, [idx, q, cat])
  const recent = useMemo(() => {
    const seen = []; for (const p of idx.plays) { if (!seen.includes(p.game_id) && idx.gamesById.get(p.game_id)) seen.push(p.game_id); if (seen.length >= 6) break }
    return seen.map(i => idx.gamesById.get(i))
  }, [idx])
  const lastPlayers = idx.plays[0]?.results.map(r => r.player_id) || []

  if (!me) return <div className="page"><TopBar title="سجّل قيم" /><Empty title="ادخل باسمك أول" text="التسجيل يحتاج رمزك." /></div>
  if (id && !existing) return <div className="page"><TopBar title="تعديل قيم" /><Empty title="هذا القيم غير موجود" /></div>
  if (!canEdit) return <div className="page"><TopBar title="تعديل قيم" /><Empty title="ما تقدر تعدّل هذا القيم" text="التعديل لمن سجّله أو للمسؤول." /></div>

  const setPlayers = pids => setRows(pids.map((pid, i) => rows.find(r => r.player_id === pid) || { player_id: pid, position: i + 1, score: '' }))
  const toggle = pid => setRows(rs => {
    if (rs.some(r => r.player_id === pid)) return rs.filter(r => r.player_id !== pid)
    return [...rs, { player_id: pid, position: rs.length + 1, score: '' }]
  })
  const setScore = (pid, score) => setRows(rs => rs.map(r => (r.player_id === pid ? { ...r, score } : r)))
  const bump = (pid, d) => setRows(rs => rs.map(r => (r.player_id === pid ? { ...r, score: String((Number(r.score) || 0) + d) } : r)))
  const name = pid => idx.playersById.get(pid)?.name
  const pl = pid => idx.playersById.get(pid)
  const count = game ? rows.length : 0
  const outOfRange = game && rows.length && ((game.min_players && rows.length < game.min_players) || (game.max_players && rows.length > game.max_players))
  const ids = rows.map(r => r.player_id)

  // مراكز الترتيب بالضغط
  const ordEff = (() => { const o = order.filter(x => ids.includes(x)); const rem = ids.filter(x => !o.includes(x)); return rem.length === 1 ? [...o, rem[0]] : o })()
  const rankPos = (() => { const m = {}; let pos = 0; ordEff.forEach((pid, i) => { if (!(i > 0 && tied.includes(pid))) pos = i + 1; m[pid] = pos }); return m })()
  const tapRank = pid => setOrder(o => (o.includes(pid) ? o.filter(x => x !== pid) : [...o.filter(x => ids.includes(x)), pid]))
  const tapTie = pid => setTied(t => (t.includes(pid) ? t.filter(x => x !== pid) : [...t, pid]))

  const computed = (() => {
    if (!rows.length) return null
    if (mode === 'points' || mode === 'low') {
      if (rows.some(r => r.score === '' || r.score == null)) return null
      const sorted = [...rows].sort((a, b) => (mode === 'low' ? 1 : -1) * (Number(a.score) - Number(b.score)))
      let pos = 0, prev = null
      return sorted.map((r, i) => { const v = Number(r.score); if (v !== prev) { pos = i + 1; prev = v } return { player_id: r.player_id, position: pos, score: v } })
    }
    if (mode === 'winner') {
      const w = winners.filter(x => ids.includes(x)); if (!w.length) return null
      return ids.map(i => ({ player_id: i, position: w.includes(i) ? 1 : 2, score: null }))
    }
    if (mode === 'teams') {
      if (winTeam == null || ids.some(i => teamOf[i] == null || teamOf[i] >= teamSet.length)) return null
      return ids.map(i => ({ player_id: i, position: teamOf[i] === winTeam ? 1 : 2, score: null }))
    }
    if (mode === 'elim') {
      const out = elim.filter(x => ids.includes(x)); if (!out.length || out.length >= ids.length) return null
      return ids.map(i => ({ player_id: i, position: out.includes(i) ? ids.length - out.indexOf(i) : 1, score: null }))
    }
    if (mode === 'coop') {
      if (coopWin == null) return null
      return ids.map(i => ({ player_id: i, position: coopWin ? 1 : 2, score: null }))
    }
    if (ordEff.length !== ids.length) return null
    return ordEff.map(pid => ({ player_id: pid, position: rankPos[pid], score: useScores && rows.find(r => r.player_id === pid)?.score !== '' ? Number(rows.find(r => r.player_id === pid).score) : null }))
  })()
  const standings = computed ? [...computed].sort((a, b) => a.position - b.position) : null
  const toIso = t => (t ? new Date(`${date}T${t}:00`).toISOString() : null)
  const nowT = () => hm(new Date().toISOString())
  const dur = (() => { if (!startT || !endT) return null; let m = (new Date(`2000-01-01T${endT}`) - new Date(`2000-01-01T${startT}`)) / 60000; if (m < 0) m += 1440; return m })()
  const teamLine = () => {
    const parts = teamSet.map((t, ti) => { const m = ids.filter(i => teamOf[i] === ti).map(name); return m.length ? `${t.i} ${t.n}: ${m.join('، ')}` : null }).filter(Boolean)
    return `${MARK}${[...parts, `🏆 ${teamSet[winTeam]?.n}`].join(' | ')}`
  }

  const save = async () => {
    if (!game || !rows.length || !computed || busy) return
    setBusy(true)
    try {
      const body = [mode === 'teams' ? teamLine() : null, vibes.length ? MARK2 + vibes.join('، ') : null, notes.trim()].filter(Boolean).join('\n')
      const res = await act((p, pin) => api.savePlay(p, pin, {
        id: existing?.id, game_id: gameId, played_on: date, notes: body,
        results: computed,
        setup_by: setupBy.filter(x => ids.includes(x)), cleanup_by: cleanupBy.filter(x => ids.includes(x)),
        started_at: toIso(startT), ended_at: endT ? (() => { const e = new Date(`${date}T${endT}:00`); if (startT && endT < startT) e.setDate(e.getDate() + 1); return e.toISOString() })() : null,
      }), existing ? 'انحفظ التعديل' : 'انسجل القيم')
      const avail = new Set((idx.expansionsOf?.get(gameId) || []).map(g => g.id))
      const chosen = exps.filter(x => avail.has(x))
      if (chosen.length || existing?.expansions?.length) {
        try { await act((p, pin) => api.setPlayExpansions(p, pin, res.id, chosen)) } catch { /* toast */ }
      }
      const w = computed.filter(c => c.position === 1).map(c => pl(c.player_id))
      const tw = mode === 'teams' ? teamSet[winTeam] : null
      if (!existing) {
        setParty(mode === 'coop' && !coopWin
          ? { players: [], title: '😵 خسرتوا هالمرة', sub: 'الجولة الجاية انتقام!' }
          : { players: w, title: tw ? `${tw.i} فاز ${tw.n}!` : w.length > 1 ? '🎉 مبروك للفايزين!' : `🎉 مبروك ${w[0]?.name}!`, sub: game.name })
        await new Promise(r => setTimeout(r, 2300))
      }
      go(live ? '/live' : `/play/${res.id}`)
    } catch { /* toast shown */ } finally { setBusy(false) }
  }
  const del = async () => {
    try { await act((p, pin) => api.deletePlay(p, pin, existing.id), 'انحذف القيم'); go('/history') } catch { /* toast */ }
  }
  const pickStarter = () => {
    let n = 0
    const t = setInterval(() => { n++; setSpin({ pid: ids[Math.floor(Math.random() * ids.length)], done: n > 14 }); if (n > 14) clearInterval(t) }, 90)
  }
  const setDur = m => {
    const e = endT || (date === ymd(0) ? nowT() : '22:00')
    const [h, mi] = e.split(':').map(Number); const tot = ((h * 60 + mi - m) % 1440 + 1440) % 1440
    setEndT(e); setStartT(`${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`)
  }
  const shuffleTeams = () => {
    const a = [...ids].sort(() => Math.random() - 0.5); const m = {}
    a.forEach((pid, i) => { m[pid] = i % teamSet.length }); setTeamOf(m)
  }

  const step = (n, title, done, extra, children) => (
    <section className={`lg-step ${done ? 'done' : ''}`}>
      <header><span className="lg-num">{done ? '✓' : n}</span><h2>{title}</h2>{extra}</header>
      {children}
    </section>
  )

  const Tile = ({ pid, on, tag, tone, onClick, big }) => (
    <button type="button" className={`lg-tile ${on ? 'on' : ''} ${big ? 'big' : ''} ${tone || ''}`} aria-pressed={!!on} onClick={onClick}>
      {tag != null && <i className="lg-tag">{tag}</i>}
      <Avatar player={pl(pid)} size={big ? 58 : 46} />
      <span>{name(pid)}</span>
    </button>
  )

  return (
    <div className="page has-action lg">
      <TopBar title={existing ? 'تعديل قيم' : 'سجّل قيم'} />
      <div className="stack">
        {step(1, 'وش لعبتوا؟', !!game, game && <button className="link-btn" onClick={() => setGameId('')}>غيّر</button>, game ? (
          <div className="lg-game">
            <Cover game={game} className="xs" />
            <div><b>{game.name}</b><small>{SCORING[scoringOf(game)].icon} {SCORING[scoringOf(game)].name}{game.min_players ? ` · ${playersText(game)}` : ''}</small></div>
          </div>
        ) : idx.games.length ? (
          <>
            {recent.length > 0 && !q && (
              <>
                <p className="lg-sub">لعبتوها قريب</p>
                <div className="lg-recent">{recent.map(g => (
                  <button key={g.id} className="lg-g" onClick={() => setGameId(g.id)}><Cover game={g} className="xs" /><span>{g.name}</span><i>{SCORING[scoringOf(g)].icon}</i></button>
                ))}</div>
              </>
            )}
            <input className="input" type="search" placeholder="🔍 دوّر على لعبة" value={q} onChange={e => setQ(e.target.value)} />
            <div className="lg-cats">
              <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>الكل</button>
              {CATEGORIES.map(c => <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.name}</button>)}
            </div>
            <div className="lg-grid">{filtered.map(g => (
              <button key={g.id} className="lg-g" onClick={() => setGameId(g.id)}><Cover game={g} className="xs" /><span>{g.name}</span><i>{SCORING[scoringOf(g)].icon}</i></button>
            ))}</div>
            {!filtered.length && <p className="muted">ما لقينا لعبة بهالاسم.</p>}
          </>
        ) : <p className="muted">ما فيه ألعاب. <a href="#/games/new">أضف لعبة</a> أول.</p>)}
        {game && <section className="lg-step">
        {game && (idx.expansionsOf?.get(game.id) || []).length > 0 && (
          <div className="exp-pick">
            <span className="muted small">لعبتوا بإضافة؟</span>
            <div className="chips-wrap">{idx.expansionsOf.get(game.id).map(e => {
              const on = exps.includes(e.id)
              return <button key={e.id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setExps(x => on ? x.filter(y => y !== e.id) : [...x, e.id])}>{on ? '✓ ' : '+ '}{e.name.replace(/^.*?:\s*/, '')}</button>
            })}</div>
          </div>
        )}
        </section>}

        {step(2, 'مين لعب؟', rows.length > 0, <span className="lg-count">{rows.length ? `${rows.length} لاعبين` : ''}</span>, (
          <>
            <div className="lg-tiles">{idx.players.map(p => <Tile key={p.id} pid={p.id} on={ids.includes(p.id)} tone={spin?.pid === p.id ? 'spin' : ''} onClick={() => toggle(p.id)} />)}</div>
            <div className="lg-quick">
              <button className="chip" onClick={() => setPlayers(idx.players.map(p => p.id))}>👥 الكل</button>
              {lastPlayers.length > 0 && <button className="chip" onClick={() => setPlayers(lastPlayers)}>↩︎ نفس آخر قيم</button>}
              {rows.length > 1 && <button className="chip" onClick={pickStarter}>🎯 من يبدأ؟</button>}
              {rows.length > 0 && <button className="chip" onClick={() => setRows([])}>مسح</button>}
            </div>
            {spin?.done && <p className="lg-tip">🎯 يبدأ: <b>{name(spin.pid)}</b></p>}
            {outOfRange && <p className="warn">هذي اللعبة لـ {playersText(game)}، وأنتم {rows.length}. تقدر تكمل عادي.</p>}
          </>
        ))}

        {rows.length > 0 && game && step(3, 'مين فاز؟', !!computed, null, (
          <>
            <div className="lg-modes">{Object.entries(SCORING).map(([k, v]) => (
              <button key={k} className={`lg-mode ${mode === k ? 'on' : ''}`} onClick={() => setModeOverride(k)}><span>{v.icon}</span>{v.name}</button>
            ))}</div>
            <p className="lg-tip">{MODE_TIPS[mode]}</p>

            {mode === 'rank' && (
              <>
                <div className="lg-tiles">{rows.map(r => {
                  const p = rankPos[r.player_id]
                  return <Tile key={r.player_id} pid={r.player_id} on={p != null} tag={p != null ? posLabel(p) : null} tone={p ? `p${Math.min(p, 4)}` : ''} onClick={() => tapRank(r.player_id)} />
                })}</div>
                {ordEff.length > 1 && (
                  <div className="lg-ties"><small>تعادل؟ اضغط على اللي تعادل مع اللي قبله:</small>
                    <div className="chips-wrap">{ordEff.slice(1).map(pid => <button key={pid} className={`chip ${tied.includes(pid) ? 'on' : ''}`} onClick={() => tapTie(pid)}>{name(pid)} = {name(ordEff[ordEff.indexOf(pid) - 1])}</button>)}</div>
                  </div>
                )}
                <label className="switch"><input type="checkbox" checked={useScores} onChange={e => setUseScores(e.target.checked)} /><span>سجّل النقاط بعد</span></label>
                {useScores && <div className="lg-scores">{rows.map(r => <label key={r.player_id}><Avatar player={pl(r.player_id)} size={24} /><span>{name(r.player_id)}</span><input className="input score-in" inputMode="numeric" placeholder="نقاط" value={r.score} onChange={e => setScore(r.player_id, e.target.value.replace(/[^\d-]/g, ''))} /></label>)}</div>}
              </>
            )}

            {(mode === 'points' || mode === 'low') && (
              <ul className="lg-pts">
                {(computed ? standings.map(c => rows.find(r => r.player_id === c.player_id)) : rows).map(r => {
                  const c = computed?.find(x => x.player_id === r.player_id)
                  return (
                    <li key={r.player_id} className={c ? `p${Math.min(c.position, 4)}` : ''} style={{ '--w': Math.min(100, Math.abs(Number(r.score) || 0) / (Math.max(...rows.map(x => Math.abs(Number(x.score) || 0)), 1)) * 100) + '%' }}>
                      <span className="lg-medal">{c ? posLabel(c.position) : '–'}</span>
                      <Avatar player={pl(r.player_id)} size={38} /><b>{name(r.player_id)}</b>
                      <div className="lg-step-in">
                        <button type="button" onClick={() => bump(r.player_id, -1)} aria-label="ناقص">−</button>
                        <input inputMode="numeric" placeholder="0" value={r.score} onChange={e => setScore(r.player_id, e.target.value.replace(/[^\d-]/g, ''))} aria-label={`نقاط ${name(r.player_id)}`} />
                        <button type="button" onClick={() => bump(r.player_id, 1)} aria-label="زائد">+</button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {mode === 'winner' && (
              <div className="lg-tiles">{rows.map(r => <Tile key={r.player_id} big pid={r.player_id} on={winners.includes(r.player_id)} tag={winners.includes(r.player_id) ? '👑' : null} tone="win" onClick={() => setWinners([r.player_id])} />)}</div>
            )}

            {mode === 'elim' && (
              <div className="lg-tiles">{rows.map(r => {
                const i = elim.indexOf(r.player_id); const last = computed?.find(c => c.player_id === r.player_id)?.position === 1
                return <Tile key={r.player_id} pid={r.player_id} on={i >= 0 || last} tone={i >= 0 ? 'out shake' : last ? 'win' : ''} tag={i >= 0 ? `💀 ${i + 1}` : last ? '👑' : null} onClick={() => setElim(x => (i >= 0 ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))} />
              })}</div>
            )}

            {mode === 'coop' && (
              <div className="lg-coop">
                <button className={coopWin === true ? 'on win' : ''} onClick={() => setCoopWin(true)}><span>🎉</span>فزنا</button>
                <button className={coopWin === false ? 'on lose' : ''} onClick={() => setCoopWin(false)}><span>😵</span>خسرنا</button>
              </div>
            )}

            {mode === 'teams' && (
              <>
                <div className="lg-teamtools">
                  {!TEAM_PRESETS[game.name] && <div className="lg-nt">{[2, 3, 4].map(n => <button key={n} className={nTeams === n ? 'on' : ''} onClick={() => setNTeams(n)}>{n} فرق</button>)}</div>}
                  <button className="chip" onClick={shuffleTeams}>🎲 قسّم عشوائي</button>
                </div>
                <ul className="lg-assign">{rows.map(r => (
                  <li key={r.player_id}><Avatar player={pl(r.player_id)} size={34} /><b>{name(r.player_id)}</b>
                    <div>{teamSet.map((t, ti) => <button key={ti} type="button" style={{ '--tc': t.c }} className={teamOf[r.player_id] === ti ? 'on' : ''} aria-label={t.n} onClick={() => setTeamOf(m => ({ ...m, [r.player_id]: ti }))}>{t.i}</button>)}</div>
                  </li>
                ))}</ul>
                <div className={`lg-table-wrap n${teamSet.length}`}>
                  {teamSet.map((t, ti) => {
                    const m = ids.filter(i => teamOf[i] === ti)
                    const side = ['bot', 'top', 'rgt', 'lft'][ti]
                    return (
                      <div key={ti} className={`lg-seat ${side} ${winTeam === ti ? 'won' : ''} ${winTeam != null && winTeam !== ti ? 'lost' : ''}`} style={{ '--tc': t.c }}>
                        <div className="lg-seat-ppl">{m.length ? m.map(i => <button type="button" key={i} className="lg-ring" aria-label={`انقل ${name(i)}`} onClick={() => setTeamOf(o => ({ ...o, [i]: (ti + 1) % teamSet.length }))}><Avatar player={pl(i)} size={46} /></button>) : <small>كرسي فاضي</small>}</div>
                        <button type="button" className="lg-seat-tag" disabled={!m.length} onClick={() => setWinTeam(ti)}>{t.i} {t.n} {winTeam === ti ? '🏆' : ''}</button>
                      </div>
                    )
                  })}
                  <div className="lg-table"><span>{game.name}</span>{teamSet.length === 2 && <b>VS</b>}</div>
                </div>
                {ids.some(i => teamOf[i] == null) && <div className="lg-bench"><small>ما جلسوا بعد:</small>{ids.filter(i => teamOf[i] == null).map(i => <button type="button" key={i} onClick={() => setTeamOf(o => ({ ...o, [i]: 0 }))}><Avatar player={pl(i)} size={34} /></button>)}</div>}
                <p className="lg-tip">اضغط على صورة اللاعب في الطاولة ينتقل للفريق اللي بعده، واضغط اسم الفريق لتختاره فايز.</p>
              </>
            )}

            {standings && mode !== 'coop' && mode !== 'teams' && <Podium st={standings} pl={pl} name={name} story={(() => { const w = standings.filter(c => c.position === 1); const l = standings.length - w.length; if (!l) return null; const sc = standings.find(c => c.position > 1 && c.score != null); const gap = w[0].score != null && sc ? Math.abs(w[0].score - sc.score) : null; return `🏆 ${w.map(c => name(c.player_id)).join(' و')} ${w.length > 1 ? 'فازوا' : 'فاز'} على ${l} ${l > 2 ? 'لاعبين' : l === 2 ? 'لاعبين' : 'لاعب'}${gap != null ? ` بفارق ${gap} نقطة${gap <= 3 ? ' فقط، فوز بالعافية! 😅' : gap >= 20 ? ' — سحق! 💥' : ''}` : ''}` })()} />}
          </>
        ))}

        {rows.length > 0 && heavy && step(4, 'تفاصيل اللعبة الثقيلة 🧱', false, null, (
          <>
            <p className="lg-tip">اللي يجهّز أو يرتّب ياخذ XP زيادة.</p>
            <span className="sub-label">مين جهّز اللعبة؟ (+20 XP)</span>
            <div className="chips-wrap">{rows.map(r => { const on = setupBy.includes(r.player_id); return <button key={r.player_id} className={`chip ${on ? 'on' : ''}`} onClick={() => setSetupBy(x => (on ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))}>{name(r.player_id)}</button> })}</div>
            <span className="sub-label">مين ساعد في الترتيب بعدها؟ (+15 XP)</span>
            <div className="chips-wrap">{rows.map(r => { const on = cleanupBy.includes(r.player_id); return <button key={r.player_id} className={`chip ${on ? 'on' : ''}`} onClick={() => setCleanupBy(x => (on ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))}>{name(r.player_id)}</button> })}</div>
          </>
        ))}

        {rows.length > 0 && game && step(heavy ? 5 : 4, 'متى ولكم طولتوا؟ ⏱️', !!(startT && endT), null, (
          <>
            <div className="lg-days">
              {[[0, 'اليوم'], [1, 'أمس'], [2, 'قبل يومين']].map(([o, l]) => <button key={o} className={`chip ${date === ymd(o) ? 'on' : ''}`} onClick={() => setDate(ymd(o))}>{l}</button>)}
              <label className={`chip lg-pickd ${![0, 1, 2].some(o => date === ymd(o)) ? 'on' : ''}`}>📆 يوم ثاني<input type="date" value={date} max={today()} onChange={e => e.target.value && setDate(e.target.value)} /></label>
            </div>
            <p className="lg-datebig">📅 {dateText(date)}</p>
            <span className="sub-label">كم طولت الجلسة؟</span>
            <div className="lg-days">{DURS.map(m => <button key={m} className={`chip ${dur === m ? 'on' : ''}`} onClick={() => setDur(m)}>{m >= 60 ? `${m / 60 === Math.floor(m / 60) ? m / 60 : (m / 60).toFixed(1)} س` : `${m} د`}</button>)}</div>
            <TimeDial start={startT} end={endT} onChange={(a, b) => { setStartT(a); setEndT(b) }} />
            <div className="lg-days">
              <button type="button" className="chip" onClick={() => { const n = nowT(); setEndT(n); if (!startT) setDur(60) }}>🏁 خلصنا الحين</button>
              <button type="button" className="chip" onClick={() => setStartT(nowT())}>🟢 بدأنا الحين</button>
            </div>
            {dur != null && <p className="hint">⏱️ المدة: {dur >= 60 ? `${Math.floor(dur / 60)} ساعة ${dur % 60 ? `و${dur % 60} دقيقة` : ''}` : `${dur} دقيقة`}</p>}
          </>
        ))}

        {rows.length > 0 && game && (
          <section className="lg-step">
            <header><span className="lg-num">🎭</span><h2>كيف كانت الجلسة؟</h2></header>
            <div className="chips-wrap">{VIBES.map(v => <button key={v} type="button" className={`chip ${vibes.includes(v) ? 'on' : ''}`} onClick={() => setVibes(x => x.includes(v) ? x.filter(y => y !== v) : [...x, v])}>{v}</button>)}</div>
          </section>
        )}

        <section className="lg-step lg-note">
          <Field label="ملاحظة (اختياري)">
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: فارس قلب اللعبة في آخر دور" />
          </Field>
        </section>

        {existing && <button className="btn danger-link" onClick={() => setConfirmDel(true)}>احذف هذا القيم</button>}
      </div>

      <div className="action-bar">
        <button className="btn primary wide" disabled={!game || !rows.length || !computed || busy} onClick={save}>
          {busy ? 'لحظة...' : !game ? 'اختر اللعبة' : !rows.length ? 'اختر اللاعبين' : !computed ? ({ points: 'اكتب نقاط الكل', low: 'اكتب نقاط الكل', winner: 'اختر الفايز', teams: 'وزّع الفرق واختر الفايز', elim: 'اضغط على اللي طلعوا', coop: 'فزتوا ولا خسرتوا؟', rank: 'رتّب الكل' }[mode] || 'كمّل النتيجة') : existing ? 'احفظ التعديل' : `سجّل القيم${count ? ` · ${count} لاعبين` : ''}`}
        </button>
      </div>
      {party && <Party party={party} />}
      {confirmDel && <Confirm danger text="متأكد تبي تحذف هذا القيم؟ بتنحذف نتائجه من الإحصائيات." confirmText="احذف" onConfirm={del} onCancel={() => setConfirmDel(false)} />}
    </div>
  )
}

// تعيين الفرق من ملاحظة محفوظة (لتعديل قيم قديم)
function teamOfInit(parsed, idx, existing) {
  const m = {}
  const byName = new Map(idx.players.map(p => [p.name, p.id]))
  parsed.team.split(' | ').filter(x => !x.startsWith('🏆')).forEach((seg, ti) => { (seg.split(': ')[1] || '').split('، ').forEach(n => { const pid = byName.get(n.trim()); if (pid) m[pid] = ti }) })
  if (!Object.keys(m).length) existing.results.forEach(r => { m[r.player_id] = r.position === 1 ? 0 : 1 })
  return m
}
