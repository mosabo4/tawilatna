import { useMemo, useState } from 'react'
import { api } from '../api'
import { useStore, go } from '../store'
import { computeTitles } from '../titles'
import { TitlesList } from './Titles'
import { Avatar, Section } from '../ui'
import { usePerks, PALETTE, FRAMES, TITLE_STYLES, TitleBadge } from '../perks'
import { STICKERS, Sticker } from '../stickers'
import { Character, CUSTOM, OPTION_NAMES, ACTIONS, Stage, IMG_CHARS, imgSrc, idleFile } from '../characters'
import { REWARDS, xpFor } from '../levels'
import { useLevels, AchList, XpHow, CrewLevels } from './Levels'

// شخصيتك + تعديلها
export function CharacterEditor() {
  const { me } = useStore()
  const { perks, set, level: L, active } = usePerks()
  const ch = perks.char || {}
  const setCh = (k, v) => set({ char: { ...ch, [k]: v } })
  const ic = IMG_CHARS[me.name.trim()]
  if (ic) {
    const st = ic.styles[me.char_style] ? me.char_style : ic.def
    const sty = ic.styles[st]
    return (
      <Section title="شخصيتك">
        <div className="pose-strip">{sty.gallery.map(g => <img key={g} src={imgSrc(ic.slug, st, g)} alt="" />)}</div>
        <p className="hint pad-x pad-b">أسلوب رسم الشخصيات يحدده المسؤول للكل.</p>
      </Section>
    )
  }
  return (
    <Section title="شخصيتك">
      <div className="char-edit">
        <div className="char-stage"><Character player={me} custom={active.char} pose="idle" size={130} /></div>
        <div className="char-opts">
          {Object.entries(CUSTOM).map(([k, c]) => {
            const open = L >= c.level
            return (
              <div key={k} className={`copt ${open ? '' : 'locked'}`}>
                <span className="copt-label">{c.label}{!open && <small>🔒 ليفل {c.level}</small>}</span>
                <div className="copt-row">
                  {c.options.map(o => {
                    const lock = !open || (o === 'crown' && L < 10)
                    const on = (ch[k] ?? null) === o
                    return k === 'outfit'
                      ? <button key={String(o)} disabled={lock} className={`sw ${on ? 'on' : ''} ${o ? '' : 'none'}`} style={o ? { background: o } : null} onClick={() => setCh(k, o)} aria-label={o || 'الأصلي'}>{o ? '' : '↺'}</button>
                      : <button key={String(o)} disabled={lock} className={`chip ${on ? 'on' : ''}`} onClick={() => setCh(k, o)}>{o ? OPTION_NAMES[o] : 'الأصلي'}{o === 'crown' && L < 10 ? ' 🔒' : ''}</button>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

export function TeasePicker({ onPick }) {
  const { idx, me } = useStore()
  const [who, setWho] = useState('')
  const [art, setArt] = useState('cry')
  return (
    <div className="tease-pick">
      <select className="input" value={who} onChange={e => setWho(e.target.value)}>
        <option value="">اختر الضحية 😈</option>
        {idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="arts">{STICKERS.map(t => <button key={t.id} type="button" className={art === t.id ? 'on' : ''} onClick={() => setArt(t.id)}><Sticker id={t.id} size={34} /><small>{t.name}</small></button>)}</div>
      <button className="btn primary small" disabled={!who} onClick={() => onPick(who, art)}>لزّقه 3 أيام</button>
    </div>
  )
}

const SOON = new Set(['تحدي رسمي', 'اقتراح مميز', 'صانع الجوائز', 'نظارات للشخصية', 'قبعات للشخصية', 'هالة للشخصية'])
const PERKS = [
  { id: 'color', icon: '🎨', name: 'لون حسابك', level: 2, tone: '#E9B425' },
  { id: 'title', icon: '🏷️', name: 'لقبك', level: 3, tone: '#8A4FD8' },
  { id: 'frame', icon: '🖼️', name: 'إطار صورتك', level: 4, tone: '#2F6FDB' },
  { id: 'reacts', icon: '😂', name: 'ردود فعل', level: 4, tone: '#EE7A2B' },
  { id: 'pin', icon: '📌', name: 'تثبيت كتابة', level: 5, tone: '#D93A3A' },
  { id: 'tease', icon: '😭', name: 'الطقطقة', level: 6, tone: '#D6458F' },
  { id: 'scene', icon: '🎭', name: 'مسرح الرئيسية', level: 7, tone: '#1BA6A6' },
  { id: 'legend', icon: '🌌', name: 'بروفايل أسطوري', level: 10, tone: '#6B5CFF' },
]

export default function Closet({ tab = 'rewards' }) {
  const { idx, me, act } = useStore()
  const { perks, set, level: L, realLevel, test, titleOk, active } = usePerks()
  const levels = useLevels()
  const lv = levels.get(me.id)
  const [open, setOpen] = useState(null)
  const levelList = [...levels.values()]
  const titleCount = useMemo(() => { const t = computeTitles(idx, levels).get(me.id) || []; return [t.filter(x => x.done).length, t.length] }, [idx, levels, me.id])
  const achs = lv?.achievements || []
  const myPosts = (idx.posts || []).filter(p => p.player_id === me.id)
  const tease = perks.tease && perks.tease.until > Date.now() ? perks.tease : null
  const weekLeft = perks.teaseAt && Date.now() - perks.teaseAt < 7 * 864e5 && !test
  const saved = (idx.scenes || []).find(x => x.player_id === me.id)
  const scene = saved ? { target: saved.target, action: saved.action } : {}
  const saveScene = async v => { const n = { ...scene, ...v }; try { await act((p, pin) => api.setScene(p, pin, n.target || null, n.action || 'punch'), n.target ? 'انحفظ المشهد، يشوفه الكل' : 'انشال المشهد') } catch { /* toast */ } }
  const nameOf = id => idx.playersById.get(id)?.name

  const unlocked = PERKS.filter(p => L >= p.level)
  const locked = PERKS.filter(p => L < p.level)
  const allReal = REWARDS.filter(r => !SOON.has(r.name))
  const gotReal = allReal.filter(r => realLevel >= r.level).length
  const next = REWARDS.find(r => r.level > realLevel && !SOON.has(r.name))
  const nextXp = next ? Math.max(0, xpFor(next.level) - (lv?.xp || 0)) : 0
  const nextPct = next && lv ? Math.min(100, Math.round(((lv.xp - xpFor(realLevel)) / (xpFor(next.level) - xpFor(realLevel))) * 100)) : 100

  const summary = {
    color: perks.color ? <i className="sw-dot" style={{ background: perks.color }} /> : 'الأصلي',
    title: active.title ? <TitleBadge title={active.title} small /> : 'بدون',
    frame: active.frame ? FRAMES.find(f => f.id === active.frame)?.name : 'بدون',
    reacts: 'في لوحة الشلة',
    pin: active.pin ? 'كتابة مثبّتة' : 'بدون',
    tease: tease ? `على ${nameOf(tease.target)}` : weekLeft ? 'استخدمتها هالأسبوع' : 'جاهزة 😈',
    scene: scene.target ? `${ACTIONS.find(a => a.id === (scene.action || 'punch'))?.icon} مع ${nameOf(scene.target)}` : 'بدون مشهد',
    legend: perks.legend ? 'مفعّل ✨' : 'مطفي',
  }

  const editors = {
    color: (
      <div className="swatches big">
        <button type="button" className={`sw none ${!perks.color ? 'on' : ''}`} onClick={() => set({ color: null })} aria-label="اللون الأصلي">↺</button>
        {PALETTE.map(c => <button type="button" key={c} className={`sw ${perks.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />)}
      </div>
    ),
    title: (
      <>
        <div className="title-pick">
          <button className={`chip ${!perks.title ? 'on' : ''}`} onClick={() => set({ title: null })}>بدون</button>
          {Object.keys(TITLE_STYLES).filter(t => titleOk(t)).map(t => (
            <button key={t} className={`tp ${perks.title === t ? 'on' : ''}`} onClick={() => set({ title: t })}><TitleBadge title={t} /></button>
          ))}
        </div>
        <a className="more" href="#/progress/titles" onClick={() => setOpen(null)}>كل الألقاب وكيف تفتح الباقي ←</a>
      </>
    ),
    frame: (
      <div className="frames">
        <button type="button" className={!perks.frame ? 'on' : ''} onClick={() => set({ frame: null })}><span className="avatar-demo"><Avatar player={me} size={44} frame={null} /></span>بدون</button>
        {FRAMES.map(f => (
          <button key={f.id} type="button" disabled={L < f.level} className={perks.frame === f.id ? 'on' : ''} onClick={() => set({ frame: f.id })}>
            <span className="avatar-demo"><Avatar player={me} size={44} frame={f.id} /></span>{f.name}{L < f.level && <small>🔒 ليفل {f.level}</small>}
          </button>
        ))}
      </div>
    ),
    reacts: <p className="muted">في لوحة الشلة، اضغط «+😀» تحت أي كتابة وحط ردّك.</p>,
    pin: myPosts.length ? (
      <select className="input" value={perks.pinned || ''} onChange={e => set({ pinned: e.target.value || null })}>
        <option value="">بدون تثبيت</option>
        {myPosts.map(p => <option key={p.id} value={p.id}>{p.body.slice(0, 40)}</option>)}
      </select>
    ) : <p className="muted">اكتب شي في اللوحة أول، بعدين تقدر تثبّته فوق الكل.</p>,
    tease: tease ? (
      <div className="tease-now">
        <Avatar player={idx.playersById.get(tease.target)} size={52} />
        <p>ملزّق على {nameOf(tease.target)} لين {new Date(tease.until).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' })}</p>
        <button className="btn ghost small" onClick={() => set({ tease: null })}>شيله</button>
      </div>
    ) : weekLeft ? <p className="muted">استخدمتها هالأسبوع. ترجع لك بعد {Math.ceil((7 * 864e5 - (Date.now() - perks.teaseAt)) / 864e5)} أيام.</p> : (
      <TeasePicker onPick={(target, art) => { set({ tease: { target, art, until: Date.now() + 3 * 864e5 }, teaseAt: Date.now() }); setOpen(null) }} />
    ),
    scene: (
      <div className="scene-pick">
        <select className="input" value={scene.target || ''} onChange={e => saveScene({ target: e.target.value || null })}>
          <option value="">بدون مشهد</option>
          {idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="acts">{ACTIONS.map(a => <button key={a.id} className={`chip ${(scene.action || 'punch') === a.id ? 'on' : ''}`} disabled={!scene.target} onClick={() => saveScene({ action: a.id })}>{a.icon} {a.label}</button>)}</div>
        {scene.target && <div className="scene-prev"><Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action || 'punch'} compact /></div>}
        <p className="hint">المشهد يطلع للشلة كلها في الرئيسية.</p>
      </div>
    ),
    legend: <label className="switch"><input type="checkbox" checked={!!perks.legend} onChange={e => set({ legend: e.target.checked })} /><span>خلفية أسطورية لصفحتك واسمك بتدرّج</span></label>,
  }

  const byLevel = [...new Set(REWARDS.map(r => r.level))].map(l => ({ l, items: REWARDS.filter(r => r.level === l) }))
  const nextLevel = byLevel.find(g => g.l > realLevel)?.l

  return (
    <div className="closet">
      <div className={`glass cl-hero ${active.legend ? 'legend' : ''}`} style={{ '--c': active.color || me.color }}>
        <div className="cl-me">
          <Avatar player={me} size={78} />
          <div className="cl-id">
            <b className="cl-name">{me.name}</b>
            {active.title ? <TitleBadge title={active.title} small /> : <small className="muted">بدون لقب</small>}
            <span className="cl-lvl">ليفل {realLevel} · {lv?.xp || 0} XP{test && <em className="tag test-tag">🧪 تجربة</em>}</span>
          </div>
          <div className="cl-count"><strong>{gotReal}</strong><small>من {allReal.length}<br />جائزة</small></div>
        </div>
        <div className="cl-lvbar"><span>{realLevel}</span><div className="cl-bar thin"><i style={{ width: `${Math.max(3, (lv?.progress || 0) * 100)}%` }} /></div><span>{realLevel + 1}</span><small>باقي {lv ? lv.need - lv.into : 0} XP</small></div>
        {tab !== 'rewards' ? null : next ? (
          <div className="cl-next">
            <div className="cl-next-top"><span className="cl-next-ic">{next.icon}</span><span><small>الجائزة الجاية · ليفل {next.level}</small><b>{next.name}</b></span><em>باقي {nextXp} XP</em></div>
            <div className="cl-bar"><i style={{ width: `${nextPct}%` }} /></div>
          </div>
        ) : <p className="cl-done">فتحت كل الجوائز 👑</p>}
        <p className="cl-hint">هذا شكلك عند الشلة</p>
      </div>

      <div className="seg prog-tabs" role="tablist">
        {[['rewards', '🎁', 'الجوائز', `${gotReal}/${allReal.length}`], ['titles', '🏷️', 'الألقاب', `${titleCount[0]}/${titleCount[1]}`], ['ach', '🏅', 'الإنجازات', `${achs.filter(a => a.done).length}/${achs.length}`], ['crew', '📈', 'الشلة', '']].map(([k, ic, t, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go(`/progress/${k}`)}><span>{ic} {t}</span>{n && <small>{n}</small>}</button>
        ))}
      </div>

      {tab === 'titles' && <TitlesList />}
      {tab === 'ach' && <><AchList /><XpHow /></>}
      {tab === 'crew' && <CrewLevels />}
      {tab === 'rewards' && <>
      <h2 className="h-sec">جوائزك <small>اضغط على أي وحدة وغيّرها</small></h2>
      {unlocked.length ? (
        <div className="perk-grid">
          {unlocked.map(p => (
            <button key={p.id} className="perk-tile" style={{ '--t': p.tone }} onClick={() => setOpen(p.id)}>
              <span className="pt-ic">{p.icon}</span>
              <b>{p.name}</b>
              <span className="pt-val">{summary[p.id]}</span>
            </button>
          ))}
        </div>
      ) : <div className="glass cl-empty">أول جائزة تنفتح في ليفل 2. العب واحضر وقيّم وتجمع XP 🎲</div>}

      {locked.length > 0 && (
        <div className="perk-grid locked">
          {locked.map(p => (
            <div key={p.id} className="perk-tile off">
              <span className="pt-ic">{p.icon}</span>
              <b>{p.name}</b>
              <span className="pt-val">🔒 ليفل {p.level}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="h-sec">طريق الجوائز</h2>
      <ol className="road">
        {byLevel.map(g => {
          const st = realLevel >= g.l ? 'done' : g.l === nextLevel ? 'next' : 'lock'
          return (
            <li key={g.l} className={`road-step ${st}`}>
              <span className="road-node">{st === 'done' ? '✓' : g.l}</span>
              <div className="road-body">
                <div className="road-top"><small>ليفل {g.l}{st === 'next' ? ` · باقي ${Math.max(0, xpFor(g.l) - (lv?.xp || 0))} XP` : ''}</small>{(() => { const who = levelList.filter(x => x.level >= g.l); return who.length ? <span className="lr-avs">{who.map(x => <Avatar key={x.player.id} player={x.player} size={18} />)}</span> : null })()}</div>
                {g.items.map(r => (
                  <div key={r.name} className="road-item">
                    <span className="ri-ic">{r.icon}</span>
                    <span><b>{r.name}{SOON.has(r.name) && <em className="soon">قريباً</em>}</b><small>{r.desc}</small></span>
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="hint pad-x">اللون واللقب والإطار والطقطقة تبان حالياً على جهازك بس. المشهد يشوفه الكل.</p>
      {me.is_admin && (
        <label className="switch test-switch glass">
          <input type="checkbox" checked={!!perks.test} onChange={e => set({ test: e.target.checked })} />
          <span>🧪 وضع التجربة: افتح كل الجوائز لي بس</span>
        </label>
      )}

      </>}

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)}>
          <div className="sheet perk-sheet" onClick={e => e.stopPropagation()}>
            {(() => { const p = PERKS.find(x => x.id === open); return <div className="ps-head"><span className="pt-ic" style={{ '--t': p.tone }}>{p.icon}</span><b>{p.name}</b><button className="icon-btn" onClick={() => setOpen(null)} aria-label="إغلاق">✕</button></div> })()}
            <div className="ps-body">{editors[open]}</div>
            <div className="ps-preview"><Avatar player={me} size={44} /><span><b style={{ color: active.color || undefined }}>{me.name}</b>{active.title && <TitleBadge title={active.title} small />}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

// المسؤول يحدد أسلوب الرسم لكل لاعب
export function StyleAdmin() {
  const { idx, act } = useStore()
  const [busy, setBusy] = useState(null)
  const setStyle = async (pid, style) => {
    setBusy(pid)
    try { await act((p, pin) => api.setCharStyle(p, pin, pid, style), 'انحفظ الأسلوب') } catch { /* toast */ } finally { setBusy(null) }
  }
  const all = Object.keys(IMG_CHARS['هاني']?.styles || {})
  const setAll = async style => {
    setBusy('all')
    try { await act(async (p, pin) => { for (const pl of idx.players) if (IMG_CHARS[pl.name.trim()]?.styles[style]) await api.setCharStyle(p, pin, pl.id, style) }, 'انحفظ للكل') } catch { /* toast */ } finally { setBusy(null) }
  }
  return (
    <Section title="أسلوب الشخصيات">
      <div className="pad-x row gap wrap-row">
        <span className="muted small">للكل:</span>
        {all.map(k => <button key={k} className="chip" disabled={!!busy} onClick={() => setAll(k)}>{IMG_CHARS['هاني'].styles[k].name}</button>)}
      </div>
      {idx.players.map(pl => {
        const ic = IMG_CHARS[pl.name.trim()]; if (!ic) return null
        const cur = ic.styles[pl.char_style] ? pl.char_style : ic.def
        return (
          <div key={pl.id} className="style-admin">
            <b>{pl.name}</b>
            <div className="style-pick">
              {Object.entries(ic.styles).map(([k, v]) => (
                <button key={k} className={`sp ${cur === k ? 'on' : ''}`} disabled={busy === pl.id} onClick={() => setStyle(pl.id, k)}>
                  <img src={imgSrc(ic.slug, k, idleFile(v))} alt="" /><span>{v.name}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </Section>
  )
}
