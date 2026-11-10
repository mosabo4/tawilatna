import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../ui'
import { CATS, CURRENT, PROPOSED, compare } from '../xpBalance'
import { TIER } from '../achievements'

const pctOf = (a, b) => (a ? Math.round(((b - a) / Math.abs(a)) * 100) : b ? 100 : 0)

function Delta({ a, b }) {
  const d = b - a
  return <em className={`xb-d ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}`}>{d === 0 ? '=' : `${d > 0 ? '▲' : '▼'} ${Math.abs(pctOf(a, b))}%`}</em>
}
function Num({ v, onChange, step = 1, min }) {
  return <input className="xb-in" type="number" inputMode="decimal" step={step} min={min} value={v} onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
}

export default function XpBalance() {
  const { idx } = useStore()
  const [cfg, setCfg] = useState(PROPOSED)
  const [open, setOpen] = useState('win')
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }))
  const res = useMemo(() => compare(idx, cfg), [idx, cfg])
  const totA = res.catTotals.reduce((t, c) => t + c.a, 0), totB = res.catTotals.reduce((t, c) => t + c.b, 0)
  const changed = k => cfg[k] !== CURRENT[k]
  const copy = () => {
    const lines = ['⚖️ موازنة الـ XP — التغييرات المقترحة']
    res.catTotals.forEach(c => { lines.push('', `${c.icon} ${c.name}: ${Math.round(c.a)} ← ${Math.round(c.b)}`); res.rows[c.id].filter(r => r.cur !== undefined && r.cur !== cfg[r.id]).forEach(r => lines.push(`  • ${r.label}: ${r.cur} ← ${cfg[r.id]}`)) })
    lines.push('', `إنجازات الدرجات: ${cfg.tierPct ? `تنحسب ${cfg.tierPct}% من جهد الخطوة` : 'القيم القديمة'}`)
    try { navigator.clipboard.writeText(lines.join('\n')) } catch { /* ignore */ }
  }
  return (
    <div className="pad lab-box xb">
      <p className="hint">⚠️ هذي صفحة تجريبية بس: <b>ما تغيّر شي في الموقع</b>. الأرقام محسوبة على أقيامكم الفعلية، والمقترح قابل للتعديل (غيّر أي رقم وشف الأثر على كل فئة وكل لاعب).</p>

      <div className="xb-sum">
        <div className="xb-top"><div><small>إجمالي XP الكل (الحالي)</small><b>{Math.round(totA).toLocaleString('en')}</b></div><div><small>المقترح</small><b>{Math.round(totB).toLocaleString('en')}</b></div><Delta a={totA} b={totB} /></div>
        {[['الحالي', 'a', totA], ['المقترح', 'b', totB]].map(([t, k, tot]) => (
          <div key={k} className="xb-bar"><span>{t}</span><div>{res.catTotals.map(c => c[k] > 0 && <i key={c.id} style={{ width: `${(c[k] / Math.max(tot, 1)) * 100}%`, background: c.color }} title={`${c.name}: ${Math.round(c[k])}`}>{(c[k] / tot) > 0.09 ? `${Math.round((c[k] / tot) * 100)}%` : ''}</i>)}</div></div>
        ))}
        <div className="xb-key">{CATS.map(c => <span key={c.id}><u style={{ background: c.color }} />{c.icon} {c.name}</span>)}</div>
      </div>

      <h4>📂 الفئات</h4>
      {res.catTotals.map(c => (
        <div key={c.id} className={`xb-cat ${open === c.id ? 'on' : ''}`}>
          <button type="button" className="xb-ch" onClick={() => setOpen(open === c.id ? '' : c.id)} aria-expanded={open === c.id}>
            <span style={{ background: c.color }} className="xb-dot" />
            <b>{c.icon} {c.name}</b>
            <small>{Math.round(c.a).toLocaleString('en')} ← <strong>{Math.round(c.b).toLocaleString('en')}</strong></small>
            <Delta a={c.a} b={c.b} />
          </button>
          {open === c.id && (
            <div className="xb-body">
              {c.id !== 'ach' && res.rows[c.id].map(r => (
                <div key={r.id || r.part} className={`xb-r ${r.cur !== undefined && changed(r.id) ? 'chg' : ''}`}>
                  <div className="xb-rl"><b>{r.icon} {r.label}</b>{r.why && <small>{r.why}</small>}</div>
                  {r.cur !== undefined ? (
                    <div className="xb-rv"><span>الحالي <b>{r.cur}</b></span><Num v={cfg[r.id]} step={r.step || 1} onChange={v => set(r.id, v)} /></div>
                  ) : <div className="xb-rv"><small>تلقائي (يتغيّر بحسب الاستخدام)</small></div>}
                  <div className="xb-rt">{r.shared ? <small>مجموعها مع اللي فوقها</small> : <><span>{Math.round(r.a)} ← <b>{Math.round(r.b)}</b></span><Delta a={r.a} b={r.b} /></>}</div>
                </div>
              ))}
              {c.id === 'win' && <p className="hint">أقيام فيها فايز: {res.eventCount.win} · توقعات صح: {res.eventCount.predict} · تحديات منتهية: {res.eventCount.chal} · مخاطرات: {res.eventCount.risk}</p>}
              {c.id === 'ach' && (
                <>
                  <div className="xb-r chg"><div className="xb-rl"><b>🥉🥈🥇💎 درجات المسيرة</b><small>كانت قيم ثابتة (20/60/150/400) لكل سلّم مهما كان صعب. الحين كل درجة = نسبة من جهد الخطوة اللي توصلها (عدد الأقيام/الجلسات… × XP الواحد). السلّمين «على النار» و«متعدد المواهب» يظلون بالقيم القديمة لأنهم بالندرة مو بالعدد.</small></div>
                    <div className="xb-rv"><span>نسبة المكافأة %</span><Num v={cfg.tierPct || 0} step={5} min={0} onChange={v => set('tierPct', v || null)} /></div></div>
                  {res.ach.map(r => (
                    <div key={r.id} className={`xb-r ${r.kind === 'tier' && cfg.tierPct && res.tierNew[r.id] ? 'chg' : ''}`}>
                      <div className="xb-rl"><b>{r.icon} {r.name}</b><small>{r.grp} · {r.n} حصلوه</small>
                        {r.kind === 'tier' && <small className="xb-tiers">{r.curVal.map((v, i) => `${TIER[i]?.icon || ''}${v}`).join(' ')}{res.tierNew[r.id] ? <> ← <b>{res.tierNew[r.id].map((v, i) => `${TIER[i]?.icon || ''}${v}`).join(' ')}</b></> : ''}</small>}</div>
                      {r.kind === 'once' && <div className="xb-rv"><span>الحالي <b>{r.curVal}</b></span><Num v={cfg.once?.[r.id] ?? r.curVal} step={10} onChange={v => set('once', { ...cfg.once, [r.id]: v })} /></div>}
                      {r.kind === 'season' && <div className="xb-rv"><span>الحالي <b>{r.curVal}</b> / مرة</span><Num v={cfg.season?.[r.id] ?? r.curVal} step={10} onChange={v => set('season', { ...cfg.season, [r.id]: v })} /></div>}
                      <div className="xb-rt"><span>{Math.round(r.a)} ← <b>{Math.round(r.b)}</b></span><Delta a={r.a} b={r.b} /></div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <h4>👥 الأثر على كل لاعب</h4>
      <div className="xb-pl">
        <div className="xb-pr head"><span>اللاعب</span><span>XP</span><span>المستوى</span></div>
        {[...res.players].sort((x, y) => y.b.xp - x.b.xp).map(({ p, a, b }) => (
          <div key={p.id} className="xb-pr">
            <span className="xb-pn"><Avatar player={p} size={26} />{p.name}</span>
            <span>{a.xp} ← <b>{b.xp}</b> <Delta a={a.xp} b={b.xp} /></span>
            <span>{a.level}{b.level !== a.level ? <> ← <b className={b.level > a.level ? 'up' : 'dn'}>{b.level}</b></> : ' ='}</span>
          </div>
        ))}
        <p className="hint">مجموع كل فئة للاعب موجود في صفحة كل لاعب بالموقع (الحالي). هنا المقارنة بالمجموع.</p>
      </div>

      <div className="lab-row wrap">
        <button className="btn small ghost" onClick={() => setCfg(PROPOSED)}>↺ رجّع المقترح الأصلي</button>
        <button className="btn small ghost" onClick={() => setCfg(CURRENT)}>صفّر على القيم الحالية</button>
        <button className="btn small ghost" onClick={copy}>📋 انسخ التغييرات</button>
      </div>
    </div>
  )
}
