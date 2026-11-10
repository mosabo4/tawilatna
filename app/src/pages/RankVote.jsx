import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../ui'
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
export function split(budget, n) {
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
  const { idx } = useStore()
  const [ballots, setB] = useState(load)
  const [who, setWho] = useState(null)
  const [q, setQ] = useState('')
  const put = b => { setB(b); save(b) }
  const lv = useMemo(() => computeLevels(idx), [idx])
  const budgetOf = pid => { const L = lv.get(pid)?.level || 1; return 12 + 4 * ((L >= levelOfReward('votes2') ? 1 : 0) + (L >= levelOfReward('votes3') ? 1 : 0) + (L >= levelOfReward('votes4') ? 1 : 0)) }
  const games = useMemo(() => [...idx.games].sort((a, b) => a.name.localeCompare(b.name)), [idx.games])
  const gname = id => idx.gamesById.get(id)?.name || '؟'

  const players = idx.players
  const voted = players.filter(p => (ballots[p.id] || []).length)
  const pts = new Map(), firsts = new Map(), by = new Map()
  voted.forEach(p => {
    const b = ballots[p.id], sp = split(budgetOf(p.id), b.length)
    b.forEach((g, i) => {
      pts.set(g, (pts.get(g) || 0) + sp[i])
      if (i === 0) firsts.set(g, (firsts.get(g) || 0) + 1)
      if (!by.has(g)) by.set(g, [])
      by.get(g).push({ p, rank: i, n: sp[i] })
    })
  })
  const ranked = [...pts.keys()].sort((a, b) => pts.get(b) - pts.get(a) || (firsts.get(b) || 0) - (firsts.get(a) || 0))
  const col = new Map(ranked.map((g, i) => [g, PAL[i % PAL.length]]))
  const cast = [...pts.values()].reduce((a, b) => a + b, 0)
  const totalBudget = players.reduce((t, p) => t + budgetOf(p.id), 0)
  const need = Math.floor(cast / 2) + 1
  const H = useMemo(() => hemicycle(totalBudget || 1), [totalBudget])
  const cells = []
  ranked.forEach(g => { for (let i = 0; i < pts.get(g); i++) cells.push(col.get(g)) })
  while (cells.length < totalBudget) cells.push(null)
  const lead = ranked[0], tie = ranked.length > 1 && pts.get(ranked[0]) === pts.get(ranked[1]) && (firsts.get(ranked[0]) || 0) === (firsts.get(ranked[1]) || 0)

  const cur = who ? ballots[who] || [] : []
  const setCur = arr => put({ ...ballots, [who]: arr })
  const add = g => { if (cur.length < 3 && !cur.includes(g)) setCur([...cur, g]); setQ('') }
  const mv = (i, d) => { const a = [...cur], j = i + d; if (j < 0 || j > 2 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setCur(a) }
  const rm = i => setCur(cur.filter((_, k) => k !== i))
  const fill = () => {
    const pool = games.map(g => g.id), b = {}
    players.forEach((p, k) => {
      if (k === players.length - 1 && players.length > 3) return
      const n = 1 + Math.floor(Math.random() * 3), a = []
      while (a.length < n) { const g = pool[Math.floor(Math.random() * Math.min(pool.length, 7))]; if (!a.includes(g)) a.push(g) }
      b[p.id] = a
    })
    put(b)
  }
  const found = q.trim() ? games.filter(g => g.name.toLowerCase().includes(q.trim().toLowerCase()) && !cur.includes(g.id)).slice(0, 6) : []
  const sp = who ? split(budgetOf(who), cur.length) : []

  return (
    <div className="pad lab-box rv">
      <p className="hint">⚠️ تجربة معزولة: <b>ما تغيّر تصويت الموقع</b> وتتخزن في جهازك بس. كل لاعب عنده رصيد نقاط (12، ويزيد 4 مع كل مكافأة أصوات بالمستوى) يوزعه على حد أقصى 3 ألعاب بالترتيب: لعبة وحدة تاخذ الكل، لعبتين 2/3 و1/3، ثلاث 1/2 و1/3 و1/6. فالكل قوته ثابتة، والفرق في الأولويات.</p>

      <section className="rv-hemi glass">
        <div className="rv-top"><b>🏛️ البرلمان</b><small>{voted.length ? `${voted.length} من ${players.length} وزّعوا نقاطهم` : 'ابدأ بتوزيع نقاط لاعب، أو اضغط تعبئة تجريبية'}</small></div>
        <div className="rv-svgbox">
          <svg viewBox="0 0 200 106" role="img" aria-label="قوس البرلمان">
            {H.pts.map((p, i) => cells[i]
              ? <circle key={i} cx={p.x} cy={p.y} r={H.dot} fill={cells[i]} />
              : <circle key={i} cx={p.x} cy={p.y} r={H.dot} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".7" />)}
          </svg>
          <div className="rv-center">{lead ? <><b>{tie ? 'تعادل' : gname(lead)}</b><small>{pts.get(lead)} / {cast}</small></> : <small>—</small>}</div>
        </div>
        {cast > 0 && (
          <div className="vt-maj">
            <div className="vt-majbar">
              {ranked.map(g => <i key={g} style={{ width: `${(pts.get(g) / totalBudget) * 100}%`, background: col.get(g) }}>{pts.get(g)}</i>)}
              <u style={{ insetInlineStart: `${(need / totalBudget) * 100}%` }} />
            </div>
            <small>الأغلبية = {need} من {cast} نقطة موزّعة{lead && pts.get(lead) < need ? ` · ${gname(lead)} ناقصها ${need - pts.get(lead)}` : ' · محققة ✅'}{tie ? ' · تعادل كامل حتى بالأولويات' : ''}</small>
          </div>
        )}
        <div className="rv-games">
          {ranked.map(g => (
            <div key={g} className="rv-g">
              <i style={{ background: col.get(g) }} />
              <b>{gname(g)}</b><em>{pts.get(g)}</em>
              <span className="rv-who">{by.get(g).sort((a, b) => a.rank - b.rank || b.n - a.n).map(v => <span key={v.p.id} className="rv-v" title={`${v.p.name}: ${v.n}`}><Avatar player={v.p} size={22} /><sup>{MEDAL[v.rank]}</sup></span>)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rv-ballot glass">
        <div className="rv-top"><b>🗳️ ورقة لاعب</b><small>اختر لاعب ورتّب ألعابه</small></div>
        <div className="rv-pl">{players.map(p => <button key={p.id} type="button" className={who === p.id ? 'on' : ''} onClick={() => setWho(p.id)}><Avatar player={p} size={34} /><small>{(ballots[p.id] || []).length ? `✓ ${budgetOf(p.id)}` : budgetOf(p.id)}</small></button>)}</div>
        {who && (
          <>
            <p className="hint">رصيده <b>{budgetOf(who)}</b> نقطة{cur.length ? '، موزعة هكذا:' : '. أضف لعبة (حد أقصى 3):'}</p>
            {cur.map((g, i) => (
              <div key={g} className="rv-row">
                <span>{MEDAL[i]}</span><b>{gname(g)}</b><em>{sp[i]} نقطة</em>
                <button type="button" onClick={() => mv(i, -1)} disabled={i === 0} aria-label="فوق">▲</button>
                <button type="button" onClick={() => mv(i, 1)} disabled={i === cur.length - 1} aria-label="تحت">▼</button>
                <button type="button" onClick={() => rm(i)} aria-label="احذف">✕</button>
              </div>
            ))}
            {cur.length < 3 && (
              <>
                <input className="rv-q" placeholder="ابحث عن لعبة..." value={q} onChange={e => setQ(e.target.value)} />
                <div className="rv-found">{(found.length ? found : games.filter(g => !cur.includes(g.id)).slice(0, 6)).map(g => <button key={g.id} type="button" onClick={() => add(g.id)}>＋ {g.name}</button>)}</div>
              </>
            )}
          </>
        )}
      </section>

      <div className="rv-act"><button className="btn small" onClick={fill}>🎲 تعبئة تجريبية</button><button className="btn small ghost" onClick={() => { put({}); setWho(null) }}>🧹 صفّر</button></div>
    </div>
  )
}
