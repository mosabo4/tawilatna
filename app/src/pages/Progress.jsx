// صفحة التقدّم: مرتبة حسب الأهمية
// 1) وين أنا  2) وش أسوي عشان أتقدم  3) وش الجاي  4) وش أقدر أستخدم الحين  5) المجموعات (تفاصيل عند الطلب)
/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { Avatar, TopBar } from '../ui'
import { usePerks, PALETTE, FRAMES, TITLE_STYLES, TitleBadge } from '../perks'
import { REWARDS, XP_RULES, xpFor } from '../levels'
import { computeTitles } from '../titles'
import { useLevels, AchList, XpHow, CrewLevels } from './Levels'
import { TitlesList } from './Titles'
import { TeasePicker } from './Closet'
import { ACTIONS, Stage } from '../characters'
import { api } from '../api'
import { getLive } from '../live'

const SOON = new Set(['تحدي رسمي', 'اقتراح مميز', 'صانع الجوائز', 'نظارات للشخصية', 'قبعات للشخصية', 'هالة للشخصية'])
const XP = Object.fromEntries(XP_RULES.map(r => [r.id, r.xp]))

function Ring({ value, size = 92, children }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r
  return (
    <span className="pg-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#pgg)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * Math.max(.02, value)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <defs><linearGradient id="pgg" x1="0" x2="1"><stop offset="0" stopColor="#FFC45C" /><stop offset="1" stopColor="#FF7A59" /></linearGradient></defs>
      </svg>
      <span className="pg-ring-in">{children}</span>
    </span>
  )
}

// أقرب الطرق لجمع XP، محسوبة من وضعك الحالي
function quickWins(idx, me, lv) {
  const out = []
  const played = new Set(idx.plays.filter(p => p.results.some(r => r.player_id === me.id)).map(p => p.game_id))
  const rated = new Set(idx.ratings.filter(r => r.player_id === me.id).map(r => r.game_id))
  const unrated = [...played].filter(g => !rated.has(g))
  if (unrated.length) out.push({ icon: '⭐', title: `قيّم ${unrated.length === 1 ? 'لعبة لعبتها' : `${unrated.length} ألعاب لعبتها`}`, xp: unrated.length * XP.rate, href: '#/me/games', btn: 'قيّم' })
  const near = lv.achievements.filter(a => !a.done && a.progress).map(a => ({ ...a, r: a.progress[0] / a.progress[1] })).sort((a, b) => b.r - a.r)[0]
  if (near) out.push({ icon: near.icon, title: `إنجاز «${near.name}»`, sub: near.desc, xp: near.xp, prog: near.progress })
  const commented = new Set((idx.comments || []).filter(c => c.player_id === me.id).map(c => c.game_id))
  const noComment = [...played].filter(g => !commented.has(g))
  if (noComment.length) out.push({ icon: '💬', title: `علّق على ${noComment.length === 1 ? 'لعبة' : `${Math.min(noComment.length, 5)} ألعاب`}`, xp: Math.min(noComment.length, 5) * XP.comment, href: `#/game/${noComment[0]}`, btn: 'علّق' })
  const live = getLive()
  out.push(live ? { icon: '▶', title: 'الجلسة شغّالة الحين', sub: 'كل قيم +10، والفوز +5 زيادة', xp: XP.play, href: '#/live', btn: 'افتحها' }
    : { icon: '📅', title: 'احضر الجلسة الجاية', sub: 'حضور +30، وكل قيم +10، وكل لعبة جديدة +15', xp: XP.session + XP.play * 3, href: '#/friday', btn: 'اختر ألعاب' })
  return out.slice(0, 3)
}

export default function Progress({ sub }) {
  const { me } = useStore()
  if (!me) return <div className="page"><TopBar title="تقدّمي" backTo="/me" /><p className="muted pad">ادخل باسمك عشان تشوف تقدّمك.</p></div>
  if (sub === 'titles') return <div className="page"><TopBar title="الألقاب" backTo="/progress" /><TitlesList /></div>
  if (sub === 'ach') return <div className="page"><TopBar title="الإنجازات" backTo="/progress" /><div className="stack"><AchList /><XpHow /></div></div>
  if (sub === 'crew') return <div className="page"><TopBar title="ليفلات الشلة" backTo="/progress" /><div className="stack"><CrewLevels /></div></div>
  return <div className="page"><TopBar title="تقدّمي" backTo="/me" /><Main /></div>
}

function Main() {
  const { idx, me, act } = useStore()
  const { perks, set, level: L, realLevel, test, titleOk, active } = usePerks()
  const levels = useLevels()
  const lv = levels.get(me.id)
  const [sheet, setSheet] = useState(null)
  const [pickL, setPickL] = useState(null)
  const titles = useMemo(() => computeTitles(idx, levels).get(me.id) || [], [idx, levels, me.id])
  const wins = useMemo(() => quickWins(idx, me, lv), [idx, me, lv])
  const byLevel = useMemo(() => [...new Set(REWARDS.map(r => r.level))].map(l => ({ l, items: REWARDS.filter(r => r.level === l) })), [])
  const nextL = byLevel.find(g => g.l > realLevel)?.l
  const selL = pickL ?? nextL ?? byLevel.at(-1).l
  const sel = byLevel.find(g => g.l === selL)

  const nearTitle = titles.filter(t => !t.done && t.target > 1).sort((a, b) => b.cur / b.target - a.cur / a.target)[0]
  const nearAch = lv.achievements.filter(a => !a.done && a.progress).sort((a, b) => b.progress[0] / b.progress[1] - a.progress[0] / a.progress[1])[0]
  const saved = (idx.scenes || []).find(x => x.player_id === me.id)
  const scene = saved ? { target: saved.target, action: saved.action } : {}
  const saveScene = async v => { const n = { ...scene, ...v }; try { await act((p, pin) => api.setScene(p, pin, n.target || null, n.action || 'punch'), n.target ? 'انحفظ المشهد، يشوفه الكل' : 'انشال المشهد') } catch { /* toast */ } }
  const tease = perks.tease && perks.tease.until > Date.now() ? perks.tease : null
  const weekLeft = perks.teaseAt && Date.now() - perks.teaseAt < 7 * 864e5 && !test
  const myPosts = (idx.posts || []).filter(p => p.player_id === me.id)
  const nameOf = id => idx.playersById.get(id)?.name

  // قدرات (مو شكل): تطلع بس المفتوحة
  const powers = [
    { id: 'tease', icon: '😭', name: 'الطقطقة', level: 6, val: tease ? `ملزّقة على ${nameOf(tease.target)}` : weekLeft ? 'استخدمتها هالأسبوع' : 'جاهزة 😈' },
    { id: 'scene', icon: '🎭', name: 'مشهد الرئيسية', level: 7, val: scene.target ? `${ACTIONS.find(a => a.id === (scene.action || 'punch'))?.label} ${nameOf(scene.target)}` : 'بدون' },
    { id: 'pin', icon: '📌', name: 'تثبيت كتابة', level: 5, val: active.pin ? 'مثبّتة' : 'بدون' },
    { id: 'legend', icon: '🌌', name: 'بروفايل أسطوري', level: 10, val: perks.legend ? 'شغّال' : 'مطفي' },
  ].filter(p => L >= p.level)

  const looks = [
    { id: 'color', label: 'اللون', level: 2, val: perks.color ? <i className="sw-dot" style={{ background: perks.color }} /> : 'الأصلي' },
    { id: 'title', label: 'اللقب', level: 3, val: active.title || 'بدون' },
    { id: 'frame', label: 'الإطار', level: 4, val: active.frame ? FRAMES.find(f => f.id === active.frame)?.name : 'بدون' },
  ]

  const editors = {
    color: <div className="swatches big">
      <button type="button" className={`sw none ${!perks.color ? 'on' : ''}`} onClick={() => set({ color: null })} aria-label="الأصلي">↺</button>
      {PALETTE.map(c => <button type="button" key={c} className={`sw ${perks.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />)}
    </div>,
    title: <>
      <div className="title-pick">
        <button className={`chip ${!perks.title ? 'on' : ''}`} onClick={() => set({ title: null })}>بدون</button>
        {Object.keys(TITLE_STYLES).filter(t => titleOk(t)).map(t => <button key={t} className={`tp ${perks.title === t ? 'on' : ''}`} onClick={() => set({ title: t })}><TitleBadge title={t} /></button>)}
      </div>
      <a className="more" href="#/progress/titles" onClick={() => setSheet(null)}>كيف تفتح ألقاب ثانية ←</a>
    </>,
    frame: <div className="frames">
      <button type="button" className={!perks.frame ? 'on' : ''} onClick={() => set({ frame: null })}><span className="avatar-demo"><Avatar player={me} size={44} frame={null} /></span>بدون</button>
      {FRAMES.map(f => <button key={f.id} type="button" disabled={L < f.level} className={perks.frame === f.id ? 'on' : ''} onClick={() => set({ frame: f.id })}><span className="avatar-demo"><Avatar player={me} size={44} frame={f.id} /></span>{f.name}{L < f.level && <small>🔒 ليفل {f.level}</small>}</button>)}
    </div>,
    pin: myPosts.length ? <select className="input" value={perks.pinned || ''} onChange={e => set({ pinned: e.target.value || null })}>
      <option value="">بدون تثبيت</option>{myPosts.map(p => <option key={p.id} value={p.id}>{p.body.slice(0, 40)}</option>)}
    </select> : <p className="muted">اكتب شي في اللوحة أول، بعدين ثبّته فوق الكل.</p>,
    tease: tease ? <div className="tease-now"><Avatar player={idx.playersById.get(tease.target)} size={52} /><p>ملزّقة على {nameOf(tease.target)}</p><button className="btn ghost small" onClick={() => set({ tease: null })}>شيلها</button></div>
      : weekLeft ? <p className="muted">ترجع لك بعد {Math.ceil((7 * 864e5 - (Date.now() - perks.teaseAt)) / 864e5)} أيام.</p>
        : <TeasePicker onPick={(target, art) => { set({ tease: { target, art, until: Date.now() + 3 * 864e5 }, teaseAt: Date.now() }); setSheet(null) }} />,
    scene: <div className="scene-pick">
      <select className="input" value={scene.target || ''} onChange={e => saveScene({ target: e.target.value || null })}>
        <option value="">بدون مشهد</option>{idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="acts">{ACTIONS.map(a => <button key={a.id} className={`chip ${(scene.action || 'punch') === a.id ? 'on' : ''}`} disabled={!scene.target} onClick={() => saveScene({ action: a.id })}>{a.icon} {a.label}</button>)}</div>
      {scene.target && <div className="scene-prev"><Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action || 'punch'} compact /></div>}
    </div>,
    legend: <label className="switch"><input type="checkbox" checked={!!perks.legend} onChange={e => set({ legend: e.target.checked })} /><span>خلفية أسطورية لصفحتك واسمك بتدرّج</span></label>,
  }
  const sheetName = { color: 'لون حسابك', title: 'لقبك', frame: 'إطار صورتك', ...Object.fromEntries(powers.map(p => [p.id, p.name])) }

  return (
    <div className="stack pg">
      {/* 1. وين أنا */}
      <section className="glass pg-now" style={{ '--c': active.color || me.color }}>
        <Ring value={lv.progress}><b>{realLevel}</b><small>ليفل</small></Ring>
        <div className="pg-now-txt">
          <small>{lv.title}{test && ' · 🧪 تجربة'}</small>
          <strong>باقي <bdi>{lv.need - lv.into} XP</bdi></strong>
          <span>على ليفل {realLevel + 1} · عندك <bdi>{lv.xp} XP</bdi></span>
        </div>
      </section>

      {/* 2. وش أسوي الحين */}
      <section>
        <h2 className="h-sec">أسرع طريق للـXP</h2>
        <div className="pg-wins">
          {wins.map(w => {
            const body = <>
              <span className="pw-ic">{w.icon}</span>
              <span className="pw-txt"><b>{w.title}</b>{w.sub && <small>{w.sub}</small>}{w.prog && <span className="pw-bar"><span className="trk"><i style={{ width: `${(w.prog[0] / w.prog[1]) * 100}%` }} /></span><em>{Math.min(w.prog[0], w.prog[1])}/{w.prog[1]}</em></span>}</span>
              <span className="pw-xp">+{w.xp}</span>
            </>
            return w.href ? <a key={w.title} className="pw" href={w.href}>{body}</a> : <div key={w.title} className="pw">{body}</div>
          })}
        </div>
      </section>

      {/* 3. وش الجاي: مسار الجوائز */}
      <section>
        <h2 className="h-sec">الجوائز</h2>
        <div className="glass pg-track-card">
          <div className="pg-track" dir="rtl">
            {byLevel.map(g => {
              const st = realLevel >= g.l ? 'done' : g.l === nextL ? 'next' : 'lock'
              return (
                <button key={g.l} className={`pt-node ${st} ${g.l === selL ? 'sel' : ''}`} onClick={() => setPickL(g.l)}>
                  <span className="pt-ic">{g.items[0].icon}</span>
                  <small>{st === 'done' ? '✓' : g.l}</small>
                </button>
              )
            })}
          </div>
          <div className="pt-detail">
            <div className="ptd-head">
              <b>ليفل {sel.l}</b>
              <span className={realLevel >= sel.l ? 'ok' : ''}>{realLevel >= sel.l ? 'مفتوحة ✓' : <>باقي <bdi>{Math.max(0, xpFor(sel.l) - lv.xp)} XP</bdi></>}</span>
            </div>
            {sel.items.map(r => (
              <div key={r.name} className="ptd-item"><span>{r.icon}</span><span><b>{r.name}{SOON.has(r.name) && <em className="soon">قريباً</em>}</b><small>{r.desc}</small></span></div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. وش أقدر أستخدم الحين */}
      <section>
        <h2 className="h-sec">شكلك عند الشلة</h2>
        <div className="glass pg-look" style={{ '--c': active.color || me.color }}>
          <div className="pl-prev"><Avatar player={me} size={56} /><span><b>{me.name}</b>{active.title ? <TitleBadge title={active.title} small /> : <small className="muted">بدون لقب</small>}</span></div>
          <div className="pl-opts">
            {looks.map(o => L >= o.level
              ? <button key={o.id} onClick={() => setSheet(o.id)}><small>{o.label}</small><span>{o.val}</span></button>
              : <button key={o.id} disabled><small>{o.label}</small><span>🔒 ليفل {o.level}</span></button>)}
          </div>
        </div>
        {powers.length > 0 && (
          <div className="pg-powers">
            {powers.map(p => <button key={p.id} onClick={() => setSheet(p.id)}><span>{p.icon}</span><b>{p.name}</b><small>{p.val}</small></button>)}
          </div>
        )}
      </section>

      {/* 5. المجموعات: ملخص، والتفاصيل في صفحتها */}
      <section className="pg-cols">
        <a href="#/progress/titles" className="glass pc">
          <span className="pc-top"><b>🏷️ الألقاب</b><em>{titles.filter(t => t.done).length}/{titles.length}</em></span>
          {nearTitle ? <><small>الأقرب: {nearTitle.icon} {nearTitle.name}</small><span className="pw-bar"><span className="trk"><i style={{ width: `${(nearTitle.cur / nearTitle.target) * 100}%` }} /></span><em>{nearTitle.cur}/{nearTitle.target}</em></span></> : <small>شوف كل الألقاب</small>}
        </a>
        <a href="#/progress/ach" className="glass pc">
          <span className="pc-top"><b>🏅 الإنجازات</b><em>{lv.achievements.filter(a => a.done).length}/{lv.achievements.length}</em></span>
          {nearAch ? <><small>الأقرب: {nearAch.icon} {nearAch.name}</small><span className="pw-bar"><span className="trk"><i style={{ width: `${(nearAch.progress[0] / nearAch.progress[1]) * 100}%` }} /></span><em>{Math.min(...nearAch.progress)}/{nearAch.progress[1]}</em></span></> : <small>شوف كل الإنجازات</small>}
        </a>
      </section>

      <nav className="me-links slim">
        <a className="me-link" href="#/progress/crew"><span>📈</span><b>ليفلات الشلة</b><em>مين قدّامك</em><i aria-hidden="true">‹</i></a>
        <a className="me-link" href="#/progress/ach"><span>⚡</span><b>كيف أجمع XP</b><em>كل الطرق</em><i aria-hidden="true">‹</i></a>
      </nav>

      {me.is_admin && (
        <label className="switch test-switch glass"><input type="checkbox" checked={!!perks.test} onChange={e => set({ test: e.target.checked })} /><span>🧪 وضع التجربة: افتح كل الجوائز لي بس</span></label>
      )}

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet perk-sheet" onClick={e => e.stopPropagation()}>
            <div className="ps-head"><b>{sheetName[sheet]}</b><button className="icon-btn" onClick={() => setSheet(null)} aria-label="إغلاق">✕</button></div>
            <div className="ps-body">{editors[sheet]}</div>
            {['color', 'title', 'frame'].includes(sheet) && <div className="ps-preview"><Avatar player={me} size={44} /><span><b style={{ color: active.color || undefined }}>{me.name}</b>{active.title && <TitleBadge title={active.title} small />}</span></div>}
            <button className="btn primary" onClick={() => setSheet(null)}>تم</button>
          </div>
        </div>
      )}
    </div>
  )
}

