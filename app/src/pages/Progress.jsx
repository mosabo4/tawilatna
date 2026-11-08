// صفحة التقدّم: مرتبة حسب الأهمية
// 1) وين أنا  2) وش أسوي عشان أتقدم  3) وش الجاي  4) وش أقدر أستخدم الحين  5) المجموعات (تفاصيل عند الطلب)
/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { Avatar, TopBar } from '../ui'
import { usePerks, PALETTE, FRAMES, BGS, TITLE_STYLES, TitleBadge } from '../perks'
import { REWARDS, xpFor, levelOfReward } from '../levels'
import { CATEGORIES } from '../categories'
import { cooldownLeft, isImmune } from '../actions'
import { SECRET_BADGES } from '../achievements'
import { computeTitles } from '../titles'
import { useLevels, AchList, XpHow, CrewLevels } from './Levels'
import { TitlesList } from './Titles'
import { ACTIONS, Stage, Character } from '../characters'
import { counts } from '../stats'
import { api } from '../api'

const POSES = [['idle', 'الوقفة العادية'], ['cheer', 'الاحتفال'], ['dance', 'الرقص'], ['laugh', 'الضحك'], ['jump', 'النطّة'], ['crown', 'التاج'], ['flag', 'الراية']]

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

export default function Progress({ sub }) {
  const { me } = useStore()
  if (!me) return <div className="page"><TopBar title="المستوى" backTo="/me" /><p className="muted pad">ادخل باسمك عشان تشوف تقدّمك.</p></div>
  if (sub === 'titles') return <div className="page"><TopBar title="الألقاب" backTo="/progress" /><TitlesList /></div>
  if (sub === 'ach') return <div className="page"><TopBar title="الإنجازات" backTo="/progress" /><div className="stack"><AchList /><XpHow /></div></div>
  if (sub === 'crew') return <div className="page"><TopBar title="مستويات الشلة" backTo="/progress" /><div className="stack"><CrewLevels /></div></div>
  return <div className="page"><TopBar title="المستوى" backTo="/me" /><Main /></div>
}

function Main() {
  const { idx, me, act } = useStore()
  const { perks, set, level: L, realLevel, test, titleOk, active, can, doAction, undoAction } = usePerks()
  const levels = useLevels()
  const lv = levels.get(me.id)
  const [sheet, setSheet] = useState(null)
  const [txt, setTxt] = useState({})
  const titles = useMemo(() => computeTitles(idx, levels).get(me.id) || [], [idx, levels, me.id])
  const byLevel = useMemo(() => {
    const ls = [...new Set([1, ...REWARDS.map(r => r.level)])].sort((a, b) => a - b)
    return ls.map(l => ({ l, items: REWARDS.filter(r => r.level === l) }))
  }, [])
  const crew = [...levels.values()]
  const roadRef = useRef(null)
  useEffect(() => { const el = roadRef.current?.querySelector('.lv-col.cur'); if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [])

  const nearTitle = titles.filter(t => !t.done && t.target > 1).sort((a, b) => b.cur / b.target - a.cur / a.target)[0]
  const nearAch = lv.achievements.filter(a => !a.maxed && a.progress && a.group !== 'secret').sort((a, b) => b.progress[0] / b.progress[1] - a.progress[0] / a.progress[1])[0]
  const scene = active.scene || {}
  const saveScene = async v => { const n = { ...scene, ...v }; try { await act((p, pin) => api.setScene(p, pin, n.target || null, n.action || 'punch'), n.target ? 'انحفظ المشهد، يشوفه الكل' : 'انشال المشهد') } catch { /* toast */ } }
  const myPosts = (idx.posts || []).filter(p => p.player_id === me.id)
  const nameOf = id => idx.playersById.get(id)?.name
  const myShelf = (idx.actions || []).find(a => a.kind === 'shelf' && a.player_id === me.id)
  const awards = (idx.actions || []).filter(a => a.kind === 'award')
  const levelOfPid = pid => (pid === me.id ? realLevel : levels.get(pid)?.level || 1)

  const looks = [
    { id: 'color', label: 'اللون', val: perks.color ? <i className="sw-dot" style={{ background: perks.color }} /> : 'الأصلي' },
    { id: 'title', label: 'اللقب', val: active.titleKind === 'std' && active.title ? active.title : 'بدون' },
    { id: 'frame', label: 'الإطار', val: active.frame ? FRAMES.find(f => f.id === active.frame)?.name : 'بدون', need: 'f-silver' },
    { id: 'bg', label: 'خلفية البطاقة', val: active.bg?.name || 'بدون' },
    { id: 'gold', label: 'الكرت الذهبي', val: perks.gold ? 'شغّال' : 'مطفي' },
    { id: 'celebrate', label: 'احتفال الفوز', val: perks.celebrate ? 'شغّال' : 'مطفي' },
    { id: 'customTitle', label: 'لقبك الخاص', val: perks.customTitle || 'اكتبه' },
    { id: 'badge', label: 'شارة سرية', val: active.badge ? active.badge.icon : (lv.achievements.some(a => a.group === 'secret' && a.done) ? 'اختر' : '🔒 سرية'), need: 'color' },
    { id: 'pose', label: 'وضعية شخصيتك', val: POSES.find(p => p[0] === perks.pose)?.[1] || 'العادية' },
    { id: 'nameFx', label: 'اسم متحرك', val: perks.nameFx ? 'شغّال' : 'مطفي' },
    { id: 'frame2', label: 'إطار بألوانك', val: perks.frame === 'custom' ? <><i className="sw-dot" style={{ background: perks.fc1 }} /><i className="sw-dot" style={{ background: perks.fc2 || perks.fc1 }} /></> : 'اختر' },
  ].map(o => ({ ...o, open: can(o.need || o.id), lvl: levelOfReward(o.need || o.id) }))
  const powers = [
    { id: 'scene', icon: '🎭', name: 'مشهد الرئيسية', val: scene.target ? `${ACTIONS.find(a => a.id === (scene.action || 'punch'))?.label} ${nameOf(scene.target)}` : 'بدون' },
    { id: 'pin', icon: '📌', name: 'تثبيت كتابة', val: active.pin ? 'مثبّتة' : 'بدون' },
    { id: 'alert', icon: '📢', name: 'التنبيه الذهبي', val: cooldownLeft(idx, me.id, 'alert', 7) ? `بعد ${cooldownLeft(idx, me.id, 'alert', 7)} يوم` : 'جاهز' },
    { id: 'immune', icon: '🛡️', name: 'الحصانة', val: isImmune(idx, me.id) ? 'شغّالة' : cooldownLeft(idx, me.id, 'immune', 30) ? `بعد ${cooldownLeft(idx, me.id, 'immune', 30)} يوم` : 'جاهزة' },
    { id: 'award', icon: '🛠️', name: 'صانع الجوائز', val: 'اخترع جائزة' },
    { id: 'luckbox', icon: '🎁', name: 'صندوق الحظ', val: cooldownLeft(idx, me.id, 'luckbox', 7) ? `بعد ${cooldownLeft(idx, me.id, 'luckbox', 7)} يوم` : 'افتحه!' },
    { id: 'hotseat', icon: '🔥', name: 'الكرسي الساخن', val: cooldownLeft(idx, me.id, 'hotseat', 30) ? `بعد ${cooldownLeft(idx, me.id, 'hotseat', 30)} يوم` : 'جاهز' },
    { id: 'box', icon: '💰', name: 'صندوق الشلة', val: cooldownLeft(idx, me.id, 'box', 7) ? `بعد ${cooldownLeft(idx, me.id, 'box', 7)} يوم` : 'حط XP' },
  ].filter(p => can(p.id))

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
      {FRAMES.map(f => <button key={f.id} type="button" disabled={L < f.level} className={perks.frame === f.id ? 'on' : ''} onClick={() => set({ frame: f.id })}><span className="avatar-demo"><Avatar player={me} size={44} frame={f.id} /></span>{f.name}{L < f.level && <small>🔒 مستوى {f.level}</small>}</button>)}
    </div>,
    bg: <div className="bg-pick">
      <button className={!perks.bg ? 'on' : ''} onClick={() => set({ bg: null })}><span className="bgp none">↺</span>بدون</button>
      {BGS.map(b => <button key={b.id} className={perks.bg === b.id ? 'on' : ''} onClick={() => set({ bg: b.id })}><span className="bgp" style={{ background: b.css }} />{b.name}</button>)}
    </div>,
    gold: <label className="switch"><input type="checkbox" checked={!!perks.gold} onChange={e => set({ gold: e.target.checked })} /><span>بطاقتك تصير كرت لاعب ذهبي في كل مكان</span></label>,
    celebrate: <label className="switch"><input type="checkbox" checked={!!perks.celebrate} onChange={e => set({ celebrate: e.target.checked })} /><span>ورق ملوّن يتطاير مع اسمك في صفحة كل قيم تفوزه</span></label>,
    customTitle: <div className="form">
      <input className="input" maxLength={22} defaultValue={perks.customTitle || ''} onChange={e => setTxt(t => ({ ...t, ct: e.target.value }))} placeholder="مثلاً: سفّاح الكاتان" />
      <div className="row gap"><button className="btn primary small" onClick={() => { set({ customTitle: (txt.ct ?? perks.customTitle ?? '').trim() || null }); setSheet(null) }}>احفظ</button><button className="btn ghost small" onClick={() => { set({ customTitle: null }); setSheet(null) }}>شيله</button></div>
      <p className="hint">لقبك الخاص يطلع بدال اللقب العادي.</p>
    </div>,
    pin: myPosts.length ? <select className="input" value={perks.pinned || ''} onChange={e => set({ pinned: e.target.value || null })}>
      <option value="">بدون تثبيت</option>{myPosts.map(p => <option key={p.id} value={p.id}>{p.body.slice(0, 40)}</option>)}
    </select> : <p className="muted">اكتب شي في اللوحة أول، بعدين ثبّته فوق الكل.</p>,
    scene: <div className="scene-pick">
      <select className="input" value={scene.target || ''} onChange={e => saveScene({ target: e.target.value || null })}>
        <option value="">بدون مشهد</option>{idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="acts">{ACTIONS.map(a => <button key={a.id} className={`chip ${(scene.action || 'punch') === a.id ? 'on' : ''}`} disabled={!scene.target} onClick={() => saveScene({ action: a.id })}>{a.icon} {a.label}</button>)}</div>
      {scene.target && <div className="scene-prev"><Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action || 'punch'} compact /></div>}
    </div>,
    shelf: <div className="form">
      <select className="input" value={txt.cat || myShelf?.data?.cat || ''} onChange={e => setTxt(t => ({ ...t, cat: e.target.value }))}>
        <option value="">اختر الرف</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input className="input" maxLength={20} defaultValue={myShelf?.data?.name || `رف ${me.name}`} onChange={e => setTxt(t => ({ ...t, sh: e.target.value }))} />
      <button className="btn primary small" disabled={!(txt.cat || myShelf?.data?.cat)} onClick={async () => { try { if (myShelf) await undoAction(myShelf.id); await doAction('shelf', { data: { cat: txt.cat || myShelf?.data?.cat, name: (txt.sh ?? myShelf?.data?.name ?? `رف ${me.name}`).trim() } }, '🗄️ انسمّى الرف'); setSheet(null) } catch { /* toast */ } }}>احفظ</button>
    </div>,
    alert: cooldownLeft(idx, me.id, 'alert', 7) ? <p className="muted">استخدمته هالأسبوع. يرجع لك بعد {cooldownLeft(idx, me.id, 'alert', 7)} يوم.</p> : <div className="form">
      <input className="input" maxLength={80} placeholder="مثلاً: الليلة كاتان ولا أحد يعتذر" onChange={e => setTxt(t => ({ ...t, al: e.target.value }))} />
      <button className="btn primary small" disabled={!txt.al?.trim()} onClick={async () => { try { await doAction('alert', { data: { text: txt.al.trim() } }, '📢 طلع التنبيه للكل'); setSheet(null) } catch { /* toast */ } }}>انشر للكل</button>
      <p className="hint">يطلع في أعلى الرئيسية للكل يوم كامل.</p>
    </div>,
    immune: isImmune(idx, me.id) ? <p className="muted">🛡️ الحصانة شغّالة، محد يقدر يطقطق عليك.</p> : cooldownLeft(idx, me.id, 'immune', 30) ? <p className="muted">ترجع لك بعد {cooldownLeft(idx, me.id, 'immune', 30)} يوم.</p> : <div className="form">
      <p className="muted">أسبوع كامل محد يقدر يلزّق عليك ملصق، ولا يسوّيك بيبي، ولا يغيّر لقبك.</p>
      <button className="btn primary small" onClick={async () => { try { await doAction('immune', {}, '🛡️ صرت محصّن أسبوع'); setSheet(null) } catch { /* toast */ } }}>فعّل الحصانة</button>
    </div>,
    pose: <div className="title-pick">{POSES.map(([k, n]) => <button key={k} className={`chip ${(perks.pose || 'idle') === k ? 'on' : ''}`} onClick={() => set({ pose: k === 'idle' ? null : k })}>{n}</button>)}
      <div className="pose-prev"><Character player={me} pose="idle" size={110} /></div></div>,
    badge: (() => {
      const got = Object.entries(SECRET_BADGES).filter(([k]) => test || lv.achievements.find(a => a.id === k)?.done)
      return got.length ? <div className="title-pick">
        <button className={`chip ${!perks.badge ? 'on' : ''}`} onClick={() => set({ badge: null })}>بدون</button>
        {got.map(([k, b]) => <button key={k} className={`chip ${perks.badge === k ? 'on' : ''}`} onClick={() => set({ badge: k })}>{b.icon} {b.name}</button>)}
      </div> : <p className="muted">كل إنجاز سري تفتحه يعطيك شارة لها علاقة فيه، تحطها على صورتك وجنب اسمك.</p>
    })(),
    nameFx: <label className="switch"><input type="checkbox" checked={!!perks.nameFx} onChange={e => set({ nameFx: e.target.checked })} /><span>اسمك يتلوّن ويتحرك في كل مكان</span></label>,
    frame2: <div className="form">
      <div className="fc-row"><span>اللون الأول</span><input type="color" value={perks.fc1 || '#FFC45C'} onChange={e => set({ fc1: e.target.value, frame: 'custom' })} /></div>
      <div className="fc-row"><span>اللون الثاني</span><input type="color" value={perks.fc2 || perks.fc1 || '#5B7CFF'} onChange={e => set({ fc2: e.target.value, frame: 'custom' })} /></div>
      <div className="row gap"><span className="avatar-demo"><Avatar player={me} size={56} /></span>{perks.frame === 'custom' && <button className="link-btn" onClick={() => set({ frame: null })}>شيل الإطار</button>}</div>
    </div>,
    luckbox: cooldownLeft(idx, me.id, 'luckbox', 7) ? <p className="muted">فتحته هالأسبوع. يرجع بعد {cooldownLeft(idx, me.id, 'luckbox', 7)} يوم.</p> : <div className="form">
      <p className="muted">داخل الصندوق XP عشوائي من 10 لين 60.</p>
      <button className="btn primary" onClick={async () => { const roll = Math.random(); const xp = roll < .4 ? 10 : roll < .7 ? 20 : roll < .88 ? 30 : roll < .97 ? 45 : 60; try { await doAction('luckbox', { data: { xp } }, `🎁 طلع لك ${xp} XP!${xp >= 45 ? ' 🔥' : ''}`); setSheet(null) } catch { /* toast */ } }}>🎁 افتح الصندوق</button>
    </div>,
    hotseat: cooldownLeft(idx, me.id, 'hotseat', 30) ? <p className="muted">ترجع لك بعد {cooldownLeft(idx, me.id, 'hotseat', 30)} يوم.</p> : <div className="form">
      <select className="input" onChange={e => setTxt(t => ({ ...t, hs: e.target.value }))}><option value="">مين على الكرسي الساخن؟</option>{idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="btn primary small" disabled={!txt.hs} onClick={async () => { try { await doAction('hotseat', { target: txt.hs }, '🔥 انحط على الكرسي الساخن'); setSheet(null) } catch { /* toast */ } }}>ثبّت أسبوع</button>
    </div>,
    box: cooldownLeft(idx, me.id, 'box', 7) ? <p className="muted">ترجع لك بعد {cooldownLeft(idx, me.id, 'box', 7)} يوم.</p> : <div className="form">
      <span>كم تحط في الصندوق؟ <b>{txt.bx || 40} XP</b> (تنخصم منك)</span>
      <input type="range" min="20" max="100" step="10" value={txt.bx || 40} onChange={e => setTxt(t => ({ ...t, bx: +e.target.value }))} />
      <button className="btn primary small" onClick={async () => { try { await doAction('box', { data: { amount: txt.bx || 40 } }, '💰 الصندوق جاهز لأول فايز'); setSheet(null) } catch { /* toast */ } }}>حط في الصندوق</button>
    </div>,
    award: <div className="form">
      <input className="input" maxLength={30} placeholder="اسم الجائزة" onChange={e => setTxt(t => ({ ...t, an: e.target.value }))} />
      <textarea className="input" rows={2} maxLength={120} placeholder="وش هي وكيف تنكسب؟" onChange={e => setTxt(t => ({ ...t, ad: e.target.value }))} />
      <button className="btn primary small" disabled={!txt.an?.trim()} onClick={async () => { try { await doAction('award', { data: { name: txt.an.trim(), desc: (txt.ad || '').trim() } }, '🛠️ انضافت جائزتك'); setSheet(null) } catch { /* toast */ } }}>أضف الجائزة</button>
    </div>,
  }
  const sheetName = { ...Object.fromEntries(looks.map(o => [o.id, o.label])), ...Object.fromEntries(powers.map(p => [p.id, p.name])) }

  return (
    <div className="stack pg">
      <section className="glass pg-now" style={{ '--c': active.color || me.color }}>
        <Ring value={lv.progress}><b>{realLevel}</b><small>مستوى</small></Ring>
        <div className="pg-now-txt">
          <small>{lv.title}{test && ' · 🧪 تجربة'}</small>
          <strong>باقي <bdi>{lv.need - lv.into} XP</bdi></strong>
          <span>على مستوى {realLevel + 1} · عندك <bdi>{lv.xp} XP</bdi></span>
        </div>
      </section>

      <section>
        <h2 className="h-sec">طريق المستويات <small>اسحب ←</small></h2>
        <div className="lv-road" ref={roadRef}>
          {byLevel.map((g, k) => {
            const st = realLevel > g.l ? 'done' : realLevel === g.l ? 'cur' : 'lock'
            const here = crew.filter(c => levelOfPid(c.player.id) === g.l)
            const nextL = byLevel[k + 1]?.l
            return (
              <div key={g.l} className={`lv-col ${st}`}>
                <div className="lc-head">
                  <span className="lc-node">{st === 'done' ? '✓' : g.l}</span>
                  <span className="lc-t"><b>مستوى {g.l}</b><small><bdi>{xpFor(g.l)} XP</bdi></small></span>
                </div>
                <div className="lc-track">
                  <i className="lc-line" />
                  {here.map(c => {
                    const span = nextL ? xpFor(nextL) - xpFor(g.l) : 1
                    const pct = nextL ? Math.min(96, Math.max(4, ((c.xp - xpFor(g.l)) / span) * 100)) : 50
                    return <a key={c.player.id} href={`#/player/${c.player.id}`} className={`lc-av ${c.player.id === me.id ? 'me' : ''}`} style={{ right: `${pct}%` }} title={`${c.player.name} · ${c.xp} XP`}><Avatar player={c.player} size={c.player.id === me.id ? 34 : 28} /></a>
                  })}
                </div>
                <ul className="lc-items">
                  {g.items.map(r => <li key={r.id}><span>{r.icon}</span><span><b>{r.name}</b><small>{r.desc}</small></span></li>)}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="h-sec">شكلك عند الشلة</h2>
        <div className="glass pg-look" style={{ '--c': active.color || me.color, ...(active.bg ? { background: active.bg.css } : {}) }}>
          <div className="pl-prev"><Avatar player={me} size={56} /><span><b>{me.name}</b>{active.title ? <TitleBadge title={active.title} kind={active.titleKind} small /> : <small className="muted">بدون لقب</small>}</span></div>
          <div className="pl-opts">
            {looks.map(o => o.open
              ? <button key={o.id} onClick={() => setSheet(o.id)}><small>{o.label}</small><span>{o.val}</span></button>
              : <button key={o.id} disabled><small>{o.label}</small><span>🔒 مستوى {o.lvl}</span></button>)}
          </div>
        </div>
        {powers.length > 0 && <div className="pg-powers">{powers.map(p => <button key={p.id} onClick={() => setSheet(p.id)}><span>{p.icon}</span><b>{p.name}</b><small>{p.val}</small></button>)}</div>}
        {(can('tease') || can('challenge')) && <p className="hint pad-x">الطقطقة والبيبي والتحدي وتغيير اللقب: من صفحة اللاعب نفسه.</p>}
      </section>

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

      {can('report') && <Report />}

      {awards.length > 0 && (
        <section className="glass awards">
          <b>🛠️ جوائز اخترعتها الشلة</b>
          <ul>{awards.map(a => <li key={a.id}><b>{a.data?.name}</b><small>{a.data?.desc} · {nameOf(a.player_id)}</small>{(a.player_id === me.id || me.is_admin) && <button className="link-btn danger" onClick={() => undoAction(a.id, 'انشالت')}>شيل</button>}</li>)}</ul>
        </section>
      )}

      <nav className="me-links slim">
        <a className="me-link" href="#/progress/crew"><span>📈</span><b>مستويات الشلة</b><em>بالتفصيل</em><i aria-hidden="true">‹</i></a>
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
            {['color', 'title', 'frame', 'customTitle'].includes(sheet) && <div className="ps-preview"><Avatar player={me} size={44} /><span><b style={{ color: active.color || undefined }}>{me.name}</b>{active.title && <TitleBadge title={active.title} kind={active.titleKind} small />}</span></div>}
            <button className="btn primary" onClick={() => setSheet(null)}>تم</button>
          </div>
        </div>
      )}
    </div>
  )
}

// تقريرك الخاص (مستوى 12): لك بس، ما يدخل في ملخص الشهر
function Report() {
  const { idx, me } = useStore()
  const rep = useMemo(() => {
    const vs = new Map(), games = new Map()
    for (const p of idx.plays) {
      const g = idx.gamesById.get(p.game_id); if (!counts(p, g)) continue
      const mine = p.results.find(r => r.player_id === me.id); if (!mine) continue
      const gs = games.get(p.game_id) || { g, n: 0, w: 0 }; gs.n++; if (mine.position === 1) gs.w++; games.set(p.game_id, gs)
      for (const o of p.results) if (o.player_id !== me.id) {
        const v = vs.get(o.player_id) || { p: idx.playersById.get(o.player_id), beat: 0, lost: 0 }
        if (mine.position < o.position) v.beat++; else if (mine.position > o.position) v.lost++
        vs.set(o.player_id, v)
      }
    }
    const L = [...vs.values()].filter(v => v.p)
    const G = [...games.values()].filter(x => x.n >= 2)
    return {
      victim: [...L].sort((a, b) => b.beat - a.beat)[0], nemesis: [...L].sort((a, b) => b.lost - a.lost)[0],
      best: [...G].sort((a, b) => b.w / b.n - a.w / a.n)[0], worst: [...G].sort((a, b) => a.w / a.n - b.w / b.n)[0],
    }
  }, [idx, me.id])
  const row = (ic, t, v) => v && <li><span>{ic}</span><span className="rp-t">{t}</span><b>{v}</b></li>
  return (
    <section className="glass report">
      <b>🔒 تقريرك الخاص <small>يشوفه أنت بس</small></b>
      <ul>
        {row('😈', 'أكثر واحد تغلبه', rep.victim && `${rep.victim.p.name} (${rep.victim.beat} مرة)`)}
        {row('😤', 'أكثر واحد يغلبك', rep.nemesis && `${rep.nemesis.p.name} (${rep.nemesis.lost} مرة)`)}
        {row('💪', 'أقوى لعبة لك', rep.best && `${rep.best.g.name} (${rep.best.w}/${rep.best.n})`)}
        {row('🫠', 'أضعف لعبة لك', rep.worst && `${rep.worst.g.name} (${rep.worst.w}/${rep.worst.n})`)}
      </ul>
    </section>
  )
}
