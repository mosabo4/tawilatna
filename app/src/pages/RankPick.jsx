import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar, Cover } from '../ui'
import { split, hemicycle, expand, PAL, MEDAL } from './RankVote'

// تجربة: النظام يرشّح 3 ألعاب ما جرّبها أحد، والعيال يرتّبونها. تجربة معزولة في جهازك.
const KEY = 'tawilatna-lab-rankpick'
const BUDGET = 12          // رصيد ثابت لكل لاعب: لعبة وحدة 12، لعبتين 8/4، ثلاث 6/4/2
const REDO_NEED = 0.51     // إعادة الترشيح تفوز لو نقاطها أكثر من 51% من كل نقاط العيال
const REDO = 'redo'        // خيار رابع يتعامل مثل لعبة، يحط له اللاعب مركز
const ordOf = b => (b ? (b.redo ? [REDO] : b.order || []) : [])  // يدعم الأوراق القديمة
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
  // نبدأ بالألعاب اللي تكفي كل العيال (6)، ولو خلصت ننزل لـ5 وبعدها 4 وهكذا
  const fits = (g, t) => (!g.min_players || g.min_players <= t) && (g.max_players ? g.max_players >= t : t <= 2)
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  const draw = (seen, ban = []) => {
    const out = []
    for (let t = players.length; t >= 2 && out.length < 3; t--) {
      const pool = fresh.filter(g => fits(g, t) && !ban.includes(g.id) && !out.includes(g.id))
      for (const g of [...shuffle(pool.filter(x => !seen.includes(x.id))), ...shuffle(pool.filter(x => seen.includes(x.id)))]) { if (out.length < 3) out.push(g.id) }
    }
    return out
  }
  const reshuffle = (note = '') => { const seen = [...new Set([...st.seen, ...st.cands])]; put({ cands: draw(seen, st.cands), seen, ballots: {}, round: st.round + 1, note }) }
  useEffect(() => { if (!st.cands.length && fresh.length) { const v = { cands: draw([]), seen: [], ballots: {}, round: 1, note: '' }; setSt(v); save(v) } }, [st.cands.length, fresh.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const myOrder = ordOf(st.ballots[who])
  const totalPts = players.length * BUDGET
  const redoPtsOf = ballots => players.reduce((t, pl) => { const o = ordOf(ballots[pl.id]), i = o.indexOf(REDO); return i < 0 ? t : t + split(BUDGET, o.length)[i] }, 0)
  const setOrder = order => {
    const ballots = { ...st.ballots, [who]: { order } }
    const rp = redoPtsOf(ballots)
    if (rp > REDO_NEED * totalPts) { const seen = [...new Set([...st.seen, ...st.cands])]; put({ cands: draw(seen, st.cands), seen, ballots: {}, round: st.round + 1, note: `🔄 إعادة الترشيح فازت بـ${rp} من ${totalPts} نقطة، هذي ألعاب جديدة` }); return }
    put({ ...st, ballots, note: '' })
  }
  const tap = id => setOrder(myOrder.includes(id) ? myOrder.filter(x => x !== id) : myOrder.length < 3 ? [...myOrder, id] : myOrder)

  // الحساب
  const pts = new Map(), firsts = new Map()
  let voted = 0
  players.forEach(pl => {
    const o = ordOf(st.ballots[pl.id])
    if (!o.length) return
    voted++
    const sp2 = split(BUDGET, o.length)
    o.forEach((g, i) => { pts.set(g, (pts.get(g) || 0) + sp2[i]); if (i === 0) firsts.set(g, (firsts.get(g) || 0) + 1) })
  })
  const redoPts = pts.get(REDO) || 0
  const ranked = [...st.cands].filter(g => pts.has(g)).sort((a, b) => pts.get(b) - pts.get(a) || (firsts.get(b) || 0) - (firsts.get(a) || 0))
  const col = new Map([...st.cands.map((g, i) => [g, PAL[i % PAL.length]]), [REDO, RED]])
  const total = totalPts
  const redoNeed = Math.floor(REDO_NEED * totalPts) + 1
  const cells = []
  ranked.forEach(g => { for (let i = 0; i < pts.get(g); i++) cells.push(col.get(g)) })
  for (let i = 0; i < redoPts; i++) cells.push(RED)
  while (cells.length < total) cells.push(null)
  const H = useMemo(() => hemicycle(total || 1), [total])
  const dots = expand(cells)
  const lead = ranked[0], second = ranked[1]
  const tie = !!second && pts.get(lead) === pts.get(second) && (firsts.get(lead) || 0) === (firsts.get(second) || 0)
  const waiting = players.filter(pl => !ordOf(st.ballots[pl.id]).length)
  const sp = split(BUDGET, myOrder.length)
  const WORD = ['الأولى', 'الثانية', 'الثالثة']

  if (!fresh.length) return <div className="pad lab-box rv"><p className="hint">كل الألعاب انلعبت مرة على الأقل، ما فيه ألعاب جديدة نرشّحها.</p></div>

  return (
    <div className="pad lab-box rv vt">
      <p className="hint">🔬 تجربة: النظام يرشّح 3 ألعاب ما جرّبها أحد، والعيال يرتّبونها. ما تغيّر الموقع، وتتخزن في جهازك.</p>
      {st.note && <div className="vt-status"><span>🔄</span><div><b>{st.note}</b></div></div>}

      <section className="rv-hemi glass">
        <div className="rv-top"><b>🎲 ترشيح الجولة {st.round}</b><small>{voted ? `${voted} من ${players.length} صوّتوا` : 'ما أحد صوّت للحين'}</small></div>
        <div className="rv-svgbox">
          <svg viewBox="0 0 200 106" role="img" aria-label="قوس البرلمان">
            {H.pts.map((pt, i) => dots[i]
              ? <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill={dots[i]} />
              : <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill="rgba(255,255,255,.16)" />)}
          </svg>
          <div className="rv-center">{lead ? <><b>{tie ? 'تعادل' : gname(lead)}</b><small>👑</small></> : <small>—</small>}</div>
        </div>
        <div className="rk-leg">
          {st.cands.map(id => <span key={id}><i style={{ background: col.get(id) }} /><b>{gname(id)}</b><em>{pts.get(id) || 0} مقعد</em></span>)}
          <span><i style={{ background: RED }} /><b>إعادة ترشيح</b><em>{redoPts} مقعد · لازم {redoNeed}</em></span>
        </div>
      </section>

      <section className="rk-ppl glass">
        <div className="rv-top"><b>👥 تصويت العيال</b><small>{waiting.length ? `لسا ما صوّت ${waiting.length}` : 'الكل صوّت'}</small></div>
        {players.map(pl => {
          const o = ordOf(st.ballots[pl.id]), s2 = split(BUDGET, o.length)
          return (
            <button key={pl.id} type="button" className={`rk-p ${who === pl.id ? 'sel' : ''}`} onClick={() => setWho(pl.id)}>
              <Avatar player={pl} size={30} /><b>{pl.name}</b>
              <span className="rk-picks">
                {!o.length && <em>لسا ما صوّت</em>}
                {o.map((g, i) => <em key={g} style={{ '--bc': col.get(g) }}>{MEDAL[i]} {g === REDO ? '🔄 إعادة ترشيح' : gname(g)} · {s2[i]}</em>)}
              </span>
            </button>
          )
        })}
      </section>

      <section className="vt-bal glass">
        <div className="vt-bal-top"><b>🗳️ ورقة {idx.playersById.get(who)?.name}</b><small>اضغط ألعابك بالترتيب، الأولى هي الأهم</small></div>
        <div className="rk-cands">
          {[...st.cands, REDO].map(id => {
            const g = idx.gamesById.get(id), i = myOrder.indexOf(id), full = i < 0 && myOrder.length >= 3
            return (
              <button key={id} type="button" className={`rk-c ${i >= 0 ? 'on' : ''} ${full ? 'off' : ''} ${id === REDO ? 'rd' : ''}`} style={{ '--bc': col.get(id) }} onClick={() => tap(id)}>
                {id === REDO ? <span className="rk-rdi">🔄</span> : <Cover game={g} className="sm" />}
                <b>{id === REDO ? 'ما أبغى هذي، رشّحوا غيرها' : g?.name}</b>
                <small>{i >= 0 ? `${MEDAL[i]} ${WORD[i]} · ${sp[i]} نقطة` : full ? 'اخترت 3' : 'اضغط للاختيار'}</small>
              </button>
            )
          })}
        </div>
        <small className="rv-next">4 خيارات وتختار منها 3 بس. إعادة الترشيح خيار مثل اللعبة، ولو أخذت أكثر من 51% من نقاط العيال تتبدّل الألعاب.</small>
      </section>

      <section className="rv-how glass">
        <button type="button" className="rv-howbtn" onClick={() => setInfo(v => !v)}>❓ كيف تنحسب؟ {info ? '▲' : '▼'}</button>
        {info && (
          <div className="rv-howtxt">
            <p>الألعاب المرشّحة تنختار عشوائي من الألعاب اللي ما لعبها أحد للحين، وتكفي كل العيال ({players.length}). إذا خلصت هذي، تنزل لألعاب تكفي {players.length - 1} وبعدها {players.length - 2} وهكذا.</p>
            <p>كل لاعب عنده {BUDGET} نقطة بس، ثابتة للكل. تختار من 4 خيارات (الثلاث ألعاب وإعادة الترشيح) حد أقصى 3، وترتّبها: لو رتّبت الثلاث تاخذ الأولى 6 والثانية 4 والثالثة 2، ولو اخترت لعبتين 8 و4، ولعبة وحدة كل النقاط. وهكذا ما أحد يكسب قوة زيادة لأنه اختار أكثر.</p>
            <p>إذا تعادلت لعبتان، تفوز اللي أخذت أولوية أولى من لاعبين أكثر.</p>
            <p>إعادة الترشيح خيار رابع تحط له مركز مثل أي لعبة (أول أو ثاني أو ثالث) وتاخذ نقاط على قده. إذا وصلت نقاطها {redoNeed} من {totalPts} (أكثر من 51%) تتبدّل الثلاث بألعاب جديدة وتتصفّر الأصوات.</p>
          </div>
        )}
      </section>

      <div className="rv-act">
        <button type="button" className="btn small" onClick={() => reshuffle('🎲 المسؤول أعاد الترشيح')}>🎲 إعادة ترشيح ألعاب (المسؤول)</button>
        <button type="button" className="btn small ghost" onClick={() => put({ cands: [], seen: [], ballots: {}, round: 0, note: '' })}>🧹 من الصفر</button>
      </div>
    </div>
  )
}
