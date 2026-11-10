import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar, Cover } from '../ui'
import { levelOfReward, computeLevels } from '../levels'

// تجربة: التصويت بالأولويات. كل لاعب عنده رصيد نقاط (يكبر بالمستوى) يتوزع على ألعابه حسب ترتيبها.
// هذي الصفحة معزولة: تخزّن في جهازك بس ولا تلمس تصويت الموقع.
const KEY = 'tawilatna-lab-rankvote'
const PAL = ['#5B7CFF', '#F2B33D', '#2FB36B', '#E5484D', '#A35BFF', '#2BC4D6', '#FF8A3D', '#E056A0']
const SHARES = { 1: [1], 2: [2 / 3, 1 / 3], 3: [1 / 2, 1 / 3, 1 / 6] }
const MEDAL = ['🥇', '🥈', '🥉']
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }

// قسمة الرصيد على الأولويات بأعداد صحيحة مجموعها = الرصيد
function split(budget, n) {
  const sh = SHARES[n] || []
  const raw = sh.map(s => s * budget), fl = raw.map(Math.floor)
  let left = budget - fl.reduce((a, b) => a + b, 0)
  raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left-- } })
  return fl
}

// مقاعد الهلال: صفوف أقواس، عدد النقاط يتناسب مع نصف القطر، مرتبة بالزاوية عشان الألوان تطلع شرائح
function hemicycle(N) {
  const R = N > 200 ? 8 : N > 120 ? 7 : N > 60 ? 5 : 4
  const r0 = 50, r1 = 94
  const rs = Array.from({ length: R }, (_, i) => r0 + ((r1 - r0) * i) / (R - 1))
  const sum = rs.reduce((a, b) => a + b, 0)
  const cnt = rs.map(r => Math.round((N * r) / sum)); cnt[R - 1] += N - cnt.reduce((a, b) => a + b, 0)
  const gap = (r1 - r0) / (R - 1)
  const minSp = Math.min(...rs.map((r, i) => (cnt[i] > 1 ? (Math.PI * r) / (cnt[i] - 1) : 99)))
  const dot = Math.min(gap, minSp) * 0.42
  const pos = []
  rs.forEach((r, i) => { for (let k = 0; k < cnt[i]; k++) pos.push({ th: Math.PI * (cnt[i] === 1 ? 0.5 : k / (cnt[i] - 1)), r }) })
  pos.sort((a, b) => a.th - b.th || a.r - b.r)
  return { dot, pts: pos.map(p => ({ x: 100 + p.r * Math.cos(p.th), y: 100 - p.r * Math.sin(p.th) })) }
}

export default function RankVote() {
  const { idx, me } = useStore()
  const [ballots, setB] = useState(load)
  const [who, setWho] = useState(() => me?.id || idx.players[0]?.id)
  const [q, setQ] = useState('')
  const [pick, setPick] = useState(false)
  const put = b => { setB(b); save(b) }
  const lv = useMemo(() => computeLevels(idx), [idx])
  const lvOf = pid => lv.get(pid)?.level || 1
  const budgetOf = pid => 12 + 4 * ((lvOf(pid) >= levelOfReward('votes2') ? 1 : 0) + (lvOf(pid) >= levelOfReward('votes3') ? 1 : 0) + (lvOf(pid) >= levelOfReward('votes4') ? 1 : 0))
  const slotsOf = pid => 1 + (lvOf(pid) >= levelOfReward('slot2') ? 1 : 0) + (lvOf(pid) >= levelOfReward('slot3') ? 1 : 0)
  const gname = id => idx.gamesById.get(id)?.name || '؟'
  const players = idx.players
  const meP = idx.playersById.get(who)

  const voted = players.filter(p => (ballots[p.id] || []).length)
  const silent = players.filter(p => !(ballots[p.id] || []).length)
  const pts = new Map(), firsts = new Map(), by = new Map()
  voted.forEach(p => {
    const b = ballots[p.id].slice(0, slotsOf(p.id)), sp = split(budgetOf(p.id), b.length)
    b.forEach((g, i) => {
      pts.set(g, (pts.get(g) || 0) + sp[i])
      if (i === 0) firsts.set(g, (firsts.get(g) || 0) + 1)
      if (!by.has(g)) by.set(g, [])
      by.get(g).push({ p, rank: i, n: sp[i] })
    })
  })
  const ranked = [...pts.keys()].sort((a, b) => pts.get(b) - pts.get(a) || (firsts.get(b) || 0) - (firsts.get(a) || 0) || gname(a).localeCompare(gname(b)))
  const col = new Map(ranked.map((g, i) => [g, PAL[i % PAL.length]]))
  const cast = [...pts.values()].reduce((a, b) => a + b, 0)
  const totalBudget = players.reduce((t, p) => t + budgetOf(p.id), 0)
  const need = Math.floor(cast / 2) + 1
  const H = useMemo(() => hemicycle(totalBudget || 1), [totalBudget])
  const cells = []
  ranked.forEach(g => { for (let i = 0; i < pts.get(g); i++) cells.push(col.get(g)) })
  while (cells.length < totalBudget) cells.push(null)
  const lead = ranked[0], second = ranked[1]
  const tie = !!second && pts.get(lead) === pts.get(second) && (firsts.get(lead) || 0) === (firsts.get(second) || 0)
  const gap = lead ? pts.get(lead) - (second ? pts.get(second) : 0) : 0
  const majority = lead && !tie && pts.get(lead) >= need
  const status = !lead ? null
    : tie ? { i: '🤝', t: 'تعادل كامل', d: 'حتى بالأولويات الأولى، صوت واحد يحسمها' }
    : gap > silent.reduce((t, p) => t + budgetOf(p.id), 0) ? { i: '✅', t: <>انحسمت: <bdi>{gname(lead)}</bdi></>, d: 'حتى لو اللي ما وزّعوا حطوا كل نقاطهم لغيرها تبقى الأولى' }
    : majority ? { i: '👑', t: <>أغلبية لـ<bdi>{gname(lead)}</bdi></>, d: silent.length ? `بس لسا ${silent.length} ما وزّعوا` : 'الكل وزّع' }
    : { i: '🏁', t: 'السباق مفتوح', d: <><bdi>{gname(lead)}</bdi> تتقدم بـ{gap} نقطة{silent.length ? `، و${silent.length} لسا ما وزّعوا` : ''}</> }

  // ورقة اللاعب المتصرَّف باسمه
  const cap = who ? slotsOf(who) : 1
  const cur = who ? (ballots[who] || []).slice(0, cap) : []
  const setCur = arr => put({ ...ballots, [who]: arr })
  const playedBy = useMemo(() => new Set(idx.plays.filter(pl => pl.results.some(r => r.player_id === who)).map(pl => pl.game_id)), [idx, who])
  const add = g => { if (cur.length < cap && !cur.includes(g)) setCur([...cur, g]); setQ(''); setPick(false) }
  const mv = (i, d) => { const a = [...cur], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setCur(a) }
  const rm = i => setCur(cur.filter((_, k) => k !== i))
  const sp = split(budgetOf(who), cur.length)
  const pool = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = idx.games.filter(g => !cur.includes(g.id) && !playedBy.has(g.id) && (!t || g.name.toLowerCase().includes(t)))
    return t ? list.slice(0, 12) : [...list].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0) || a.name.localeCompare(b.name)).slice(0, 12)
  }, [idx.games, q, cur, playedBy])
  const nextSlotLv = cap < 2 ? levelOfReward('slot2') : cap < 3 ? levelOfReward('slot3') : null
  const budget = budgetOf(who)
  const nextBudLv = budget < 16 ? levelOfReward('votes2') : budget < 20 ? levelOfReward('votes3') : budget < 24 ? levelOfReward('votes4') : null
  const fill = () => {
    const b = {}
    players.forEach((p, k) => {
      if (k === players.length - 1) return
      const n = 1 + Math.floor(Math.random() * slotsOf(p.id)), a = []
      const ok = idx.games.filter(g => !idx.plays.some(pl => pl.game_id === g.id && pl.results.some(r => r.player_id === p.id))).slice(0, 8)
      while (a.length < n && a.length < ok.length) { const g = ok[Math.floor(Math.random() * ok.length)].id; if (!a.includes(g)) a.push(g) }
      b[p.id] = a
    })
    put(b)
  }
  const duel = ranked.slice(0, 2), chase = ranked.slice(2, 5)

  return (
    <div className="pad lab-box rv vt">
      <p className="hint">⚠️ نسخة تجريبية من صفحة الجلسة الجاية بنظام الأولويات: <b>ما تغيّر تصويت الموقع</b>، وتتخزن في جهازك بس. تتصرف باسم أي لاعب وتختار له ألعاب وترتبها. كل لاعب عنده رصيد نقاط يتوزع على ألعابه بالترتيب (لعبة 100%، لعبتين 2/3 و1/3، ثلاث 1/2 و1/3 و1/6)، وعدد الخانات والرصيد حسب مستواه مثل الموقع.</p>

      <div className="rv-pl">{players.map(p => <button key={p.id} type="button" className={who === p.id ? 'on' : ''} onClick={() => { setWho(p.id); setPick(false); setQ('') }}><Avatar player={p} size={34} /><small>{(ballots[p.id] || []).length ? `✓ ${p.name}` : p.name}</small></button>)}</div>

      <section className="rv-hemi glass">
        <div className="rv-top"><b>🏛️ برلمان العيال</b><small>{voted.length ? `${voted.length} من ${players.length} وزّعوا نقاطهم` : 'الكراسي فاضية، ابدأ التصويت'}</small></div>
        <div className="rv-svgbox">
          <svg viewBox="0 0 200 106" role="img" aria-label="قوس البرلمان">
            {H.pts.map((pt, i) => cells[i]
              ? <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill={cells[i]} />
              : <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".7" />)}
          </svg>
          <div className="rv-center">{lead ? <><b>{tie ? 'تعادل' : gname(lead)}</b><small>{pts.get(lead)} / {cast}</small></> : <small>ما فيه نقاط</small>}</div>
        </div>
        {cast > 0 && (
          <div className="vt-maj">
            <div className="vt-majbar">
              {ranked.map(g => <i key={g} style={{ width: `${(pts.get(g) / totalBudget) * 100}%`, background: col.get(g) }}>{pts.get(g)}</i>)}
              <u style={{ insetInlineStart: `${(need / totalBudget) * 100}%` }} />
            </div>
            <small>الأغلبية = {need} من {cast} نقطة موزّعة{lead && pts.get(lead) < need ? ` · ${gname(lead)} ناقصها ${need - pts.get(lead)}` : ''}</small>
          </div>
        )}
        {status && <div className={`vt-status ${status.i === '✅' ? 'done' : ''}`}><span>{status.i}</span><div><b>{status.t}</b><small>{status.d}</small></div></div>}
        <div className="rv-games">
          {ranked.map(g => (
            <div key={g} className="rv-g">
              <i style={{ background: col.get(g) }} />
              <b>{gname(g)}</b><em>{pts.get(g)}</em>
              <span className="rv-who">{by.get(g).sort((a, b) => a.rank - b.rank || b.n - a.n).map(v => <span key={v.p.id} className="rv-v" title={`${v.p.name}: ${v.n}`}><Avatar player={v.p} size={22} /><sup>{MEDAL[v.rank]}</sup></span>)}</span>
            </div>
          ))}
        </div>
        {silent.length > 0 && voted.length > 0 && <div className="vt-silent"><small>لسا ما وزّعوا:</small>{silent.map(p => <Avatar key={p.id} player={p} size={26} />)}</div>}
      </section>

      {meP && (
        <section className="vt-bal glass">
          <div className="vt-bal-top"><b>🗳️ ورقة {meP.name}</b><small>رتّب ألعابك من الأهم للأقل · {cap === 1 ? 'لعبة وحدة' : `لين ${cap} ألعاب`}{nextSlotLv ? ` · مستوى ${nextSlotLv} يفتح خانة` : ''}</small></div>
          <div className="vt-slotrow">
            {Array.from({ length: 3 }, (_, k) => {
              const g = idx.gamesById.get(cur[k])
              if (g) return (
                <div key={k} className="vt-bslot filled">
                  <Cover game={g} className="xs" /><b>{MEDAL[k]} {g.name}</b><em className="vt-bv">{sp[k]} نقطة</em>
                  <span className="rv-mv">
                    <button type="button" onClick={() => mv(k, -1)} disabled={k === 0} aria-label="قدّمها">▲</button>
                    <button type="button" onClick={() => mv(k, 1)} disabled={k === cur.length - 1} aria-label="أخّرها">▼</button>
                    <button type="button" onClick={() => rm(k)} aria-label={`شيل ${g.name}`}>✕</button>
                  </span>
                </div>
              )
              if (k < cap) return <button key={k} type="button" className="vt-bslot free" onClick={() => setPick(true)}><span>＋</span><small>خانة فاضية<br />اضغط واختر لعبة</small></button>
              return <div key={k} className="vt-bslot lockd"><span>🔒</span><small>مستوى {levelOfReward(k === 1 ? 'slot2' : 'slot3')}</small></div>
            })}
          </div>
          {pick && cur.length < cap && (
            <div className="rv-pick">
              <input className="rv-q" placeholder="ابحث عن لعبة ما جربتها..." value={q} onChange={e => setQ(e.target.value)} />
              <div className="rv-grid">{pool.map(g => <button key={g.id} type="button" onClick={() => add(g.id)}><Cover game={g} className="sm" /><small>{g.name}</small></button>)}</div>
              {!pool.length && <p className="hint">ما لقيت لعبة، يمكن جربتها كلها 🙂 (التصويت بس على ألعاب ما جربتها)</p>}
            </div>
          )}
        </section>
      )}

      {meP && (
        <section className="vt-pool glass">
          <div className="vt-bal-top"><b>🪙 رصيد {meP.name}</b><small>{nextBudLv ? `مستوى ${nextBudLv} يزيد الرصيد 4` : 'وصل أقصى رصيد'}</small></div>
          <div className="vt-stats">
            <span><b>{budget}</b><small>رصيد النقاط</small></span>
            <span><b>{cur.length ? budget : 0}</b><small>موزّعة</small></span>
            <span><b>{cur.length ? 0 : budget}</b><small>ما وزّع</small></span>
          </div>
          <p className="hint">كل ما تحط ألعاب أكثر، الرصيد يتقسم عليها (الأولى تاخذ النصيب الأكبر). فالفرق مو بعدد الألعاب بل بترتيبها.</p>
        </section>
      )}

      {duel.length >= 2 && (
        <section className="vt-h2h glass">
          <h3>⚔️ {tie ? 'تعادل على الصدارة' : 'المنافسة على الصدارة'}</h3>
          <div className="vt-h2h-row n2">
            {duel.map((g, k) => (
              <div key={g} className={`vt-fighter ${k === 0 ? 'lead' : ''}`} style={{ '--bc': col.get(g) }}>
                <Cover game={idx.gamesById.get(g)} className="sm" />
                <b>{gname(g)}</b><strong>{pts.get(g)}</strong>
                <small>{tie ? 'متعادلة' : k === 0 ? 'المتصدرة' : `متأخرة بـ${gap}`}</small>
              </div>
            ))}
            <span className="vt-vs">VS</span>
          </div>
          {chase.length > 0 && <p className="vt-chase">🏃 وراهم: {chase.map((g, k) => <span key={g}>{k > 0 && '، '}<bdi>{gname(g)}</bdi> ({pts.get(g)})</span>)}</p>}
        </section>
      )}

      <div className="rv-act"><button type="button" className="btn small" onClick={fill}>🎲 تعبئة تجريبية للباقي</button><button type="button" className="btn small ghost" onClick={() => { put({}); setPick(false) }}>🧹 صفّر</button></div>
    </div>
  )
}
