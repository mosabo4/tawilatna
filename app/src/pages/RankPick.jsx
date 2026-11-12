import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar, Cover } from '../ui'
import { split, hemicycle, PAL, MEDAL } from './RankVote'

// تجربة: النظام يرشّح 3 ألعاب ما جرّبها أحد، والعيال يرتّبونها. تجربة معزولة في جهازك.
const KEY = 'tawilatna-lab-rankpick'
const BUDGET = 12          // رصيد ثابت لكل لاعب: لعبة وحدة 12، لعبتين 8/4، ثلاث 6/4/2
const REDO_NEED = 0.51     // أكثر من 51% من العيال يطلبون إعادة ترشيح
const RED = '#8892a6'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }

export default function RankPick() {
  const { idx, me } = useStore()
  const players = idx.players
  const [st, setSt] = useState(() => load() || { cands: [], seen: [], ballots: {}, round: 0, note: '' })
  const [who, setWho] = useState(() => me?.id || players[0]?.id)
  const [info, setInfo] = useState(false)
  const put = v => { setSt(v); save(v) }
  const gname = id => idx.gamesById.get(id)?.name || '؟'

  // ألعاب ما لعبها أحد للحين
  const fresh = useMemo(() => { const played = new Set(idx.plays.map(p => p.game_id)); return idx.games.filter(g => !played.has(g.id)) }, [idx])
  const draw = (seen, ban = []) => {
    let pool = fresh.filter(g => !seen.includes(g.id) && !ban.includes(g.id))
    if (pool.length < 3) pool = fresh.filter(g => !ban.includes(g.id)) // خلصت الجديدة: ندور من جديد
    const a = [...pool]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a.slice(0, 3).map(g => g.id)
  }
  const reshuffle = (note = '') => { const seen = [...new Set([...st.seen, ...st.cands])]; put({ cands: draw(seen, st.cands), seen, ballots: {}, round: st.round + 1, note }) }
  useEffect(() => { if (!st.cands.length && fresh.length) { const v = { cands: draw([]), seen: [], ballots: {}, round: 1, note: '' }; setSt(v); save(v) } }, [st.cands.length, fresh.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const myB = st.ballots[who] || { order: [], redo: false }
  const setB = b => {
    const ballots = { ...st.ballots, [who]: b }
    const redoN = players.filter(p => ballots[p.id]?.redo).length
    if (redoN / players.length > REDO_NEED) { const seen = [...new Set([...st.seen, ...st.cands])]; put({ cands: draw(seen, st.cands), seen, ballots: {}, round: st.round + 1, note: `🔄 صوّت ${redoN} من ${players.length} على إعادة الترشيح، هذي ألعاب جديدة` }); return }
    put({ ...st, ballots, note: '' })
  }
  const tap = id => {
    if (myB.redo) return
    const o = myB.order
    setB({ order: o.includes(id) ? o.filter(x => x !== id) : [...o, id], redo: false })
  }
  const redo = () => setB({ order: [], redo: !myB.redo })

  // الحساب
  const pts = new Map(), firsts = new Map(), by = new Map()
  let redoPts = 0, voted = 0
  players.forEach(p => {
    const b = st.ballots[p.id]
    if (!b || (!b.redo && !b.order.length)) return
    voted++
    if (b.redo) { redoPts += BUDGET; return }
    const sp = split(BUDGET, b.order.length)
    b.order.forEach((g, i) => {
      pts.set(g, (pts.get(g) || 0) + sp[i])
      if (i === 0) firsts.set(g, (firsts.get(g) || 0) + 1)
      if (!by.has(g)) by.set(g, [])
      by.get(g).push({ p, rank: i })
    })
  })
  const ranked = [...st.cands].filter(g => pts.has(g)).sort((a, b) => pts.get(b) - pts.get(a) || (firsts.get(b) || 0) - (firsts.get(a) || 0))
  const col = new Map(st.cands.map((g, i) => [g, PAL[i % PAL.length]]))
  const total = players.length * BUDGET
  const redoN = players.filter(p => st.ballots[p.id]?.redo).length
  const redoNeed = Math.floor(players.length * REDO_NEED) + 1
  const cells = []
  ranked.forEach(g => { for (let i = 0; i < pts.get(g); i++) cells.push(col.get(g)) })
  for (let i = 0; i < redoPts; i++) cells.push(RED)
  while (cells.length < total) cells.push(null)
  const H = useMemo(() => hemicycle(total || 1), [total])
  const lead = ranked[0], second = ranked[1]
  const tie = !!second && pts.get(lead) === pts.get(second) && (firsts.get(lead) || 0) === (firsts.get(second) || 0)
  const waiting = players.filter(p => { const b = st.ballots[p.id]; return !b || (!b.redo && !b.order.length) })
  const sp = split(BUDGET, myB.order.length)
  const WORD = ['الأولى', 'الثانية', 'الثالثة']

  if (!fresh.length) return <div className="pad lab-box rv"><p className="hint">كل الألعاب انلعبت مرة على الأقل، ما فيه ألعاب جديدة نرشّحها.</p></div>

  return (
    <div className="pad lab-box rv vt">
      <p className="hint">🔬 تجربة: النظام يرشّح 3 ألعاب ما جرّبها أحد، والعيال يرتّبونها. ما تغيّر الموقع، وتتخزن في جهازك.</p>
      <div className="rv-pl">{players.map(p => <button key={p.id} type="button" className={who === p.id ? 'on' : ''} onClick={() => setWho(p.id)}><Avatar player={p} size={34} /><small>{st.ballots[p.id] && (st.ballots[p.id].redo || st.ballots[p.id].order.length) ? `✓ ${p.name}` : p.name}</small></button>)}</div>
      {st.note && <div className="vt-status"><span>🔄</span><div><b>{st.note}</b></div></div>}

      <section className="rv-hemi glass">
        <div className="rv-top"><b>🎲 ترشيح الجولة {st.round}</b><small>{voted ? `${voted} من ${players.length} صوّتوا` : 'ما أحد صوّت للحين'}</small></div>
        <div className="rv-svgbox">
          <svg viewBox="0 0 200 106" role="img" aria-label="قوس البرلمان">
            {H.pts.map((pt, i) => cells[i]
              ? <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill={cells[i]} />
              : <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".7" />)}
          </svg>
          <div className="rv-center">{lead ? <><b>{tie ? 'تعادل' : gname(lead)}</b><small>👑</small></> : <small>—</small>}</div>
        </div>
        <div className="vt-status"><span>{redoN ? '🔄' : lead ? '👑' : '🗳️'}</span><div>
          <b>{lead ? (tie ? 'تعادل كامل' : <>المتصدرة: <bdi>{gname(lead)}</bdi></>) : 'ابدأوا التصويت'}</b>
          <small>إعادة الترشيح: {redoN} من {redoNeed} لازم{waiting.length ? ` · لسا ما صوّت ${waiting.length}` : ''}</small>
        </div></div>
      </section>

      <section className="vt-bal glass">
        <div className="vt-bal-top"><b>🗳️ ورقة {idx.playersById.get(who)?.name}</b><small>اضغط ألعابك بالترتيب: الأولى هي اللي تبغى تجربها أكثر</small></div>
        <div className="rk-cands">
          {st.cands.map(id => {
            const g = idx.gamesById.get(id), i = myB.order.indexOf(id)
            return (
              <button key={id} type="button" className={`rk-c ${i >= 0 ? 'on' : ''} ${myB.redo ? 'off' : ''}`} style={{ '--bc': col.get(id) }} onClick={() => tap(id)}>
                <Cover game={g} className="sm" />
                <b>{g?.name}</b>
                <small>{i >= 0 ? `${MEDAL[i]} ${WORD[i]} · ${sp[i]} نقطة` : 'اضغط للاختيار'}</small>
              </button>
            )
          })}
        </div>
        <button type="button" className={`rk-redo ${myB.redo ? 'on' : ''}`} onClick={redo}>{myB.redo ? '✔ طلبت إعادة ترشيح (كل نقاطك هنا)' : '🔄 ما أبغى ولا وحدة، رشّحوا غيرها'}</button>
        <small className="rv-next">اللي يطلب إعادة ترشيح ما يصوّت على الثلاث: كل نقاطه تروح لها.</small>
      </section>

      <section className="rv-how glass">
        <button type="button" className="rv-howbtn" onClick={() => setInfo(v => !v)}>❓ كيف تنحسب؟ {info ? '▲' : '▼'}</button>
        {info && (
          <div className="rv-howtxt">
            <p>الألعاب المرشّحة تنختار عشوائي من الألعاب اللي ما لعبها أحد للحين.</p>
            <p>كل لاعب عنده {BUDGET} نقطة بس، ثابتة للكل. ترتّب الألعاب اللي تبغاها: لو رتّبت الثلاث تاخذ الأولى 6 والثانية 4 والثالثة 2، ولو اخترت لعبتين 8 و4، ولعبة وحدة كل النقاط. وهكذا ما أحد يكسب قوة زيادة لأنه اختار أكثر.</p>
            <p>إذا تعادلت لعبتان، تفوز اللي أخذت أولوية أولى من لاعبين أكثر.</p>
            <p>إعادة الترشيح: إذا طلبها أكثر من 51% من العيال (هنا {redoNeed} من {players.length}) تتبدّل الثلاث بألعاب جديدة، وتتصفّر الأصوات.</p>
          </div>
        )}
      </section>

      <div className="rv-act">
        <button type="button" className="btn small" onClick={() => reshuffle('🎲 المسؤول أعاد الترشيح')}>🎲 إعادة ترشيح ألعاب (المسؤول)</button>
        <button type="button" className="btn small ghost" onClick={() => put({ cands: [], seen: [], ballots: {}, round: 0, note: '' })}>🧹 من الصفر</button>
      </div>
      {by.size > 0 && <div className="rv-games">{ranked.map(g => <div key={g} className="rv-g"><i style={{ background: col.get(g) }} /><b>{gname(g)}</b><em>{pts.get(g)}</em><span className="rv-who">{by.get(g).sort((a, b) => a.rank - b.rank).map(v => <span key={v.p.id} className="rv-v"><Avatar player={v.p} size={22} />{v.rank === 0 && <sup>🥇</sup>}</span>)}</span></div>)}</div>}
    </div>
  )
}
