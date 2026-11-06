import { useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { Avatar, Section } from '../ui'
import { usePerks, PALETTE, FRAMES, TITLE_STYLES, TitleBadge } from '../perks'
import { STICKERS, Sticker } from '../stickers'
import { Character, CUSTOM, OPTION_NAMES, ACTIONS, Stage, IMG_CHARS, imgSrc, idleFile } from '../characters'

function Lock({ level, L, title, children }) {
  const open = L >= level
  return (
    <div className={`perk ${open ? '' : 'locked'}`}>
      <div className="perk-head"><b>{title}</b><span className="perk-lvl">{open ? '✓' : `🔒 ليفل ${level}`}</span></div>
      <div className="perk-body">{children}</div>
    </div>
  )
}

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

function TeasePicker({ onPick }) {
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

export default function Closet() {
  const { idx, me } = useStore()
  const { perks, set, level: L, realLevel, test, titleOk, active } = usePerks()
  const myPosts = (idx.posts || []).filter(p => p.player_id === me.id)
  const tease = perks.tease && perks.tease.until > Date.now() ? perks.tease : null
  const weekLeft = perks.teaseAt && Date.now() - perks.teaseAt < 7 * 864e5 && !test
  const { act } = useStore()
  const saved = (idx.scenes || []).find(x => x.player_id === me.id)
  const scene = saved ? { target: saved.target, action: saved.action } : {}
  const saveScene = async v => { const n = { ...scene, ...v }; try { await act((p, pin) => api.setScene(p, pin, n.target || null, n.action || 'punch'), n.target ? 'انحفظ المشهد، يشوفه الكل' : 'انشال المشهد') } catch { /* toast */ } }
  return (
    <Section title="خزانة جوائزك" action={test && <span className="tag test-tag">🧪 تجربة</span>}>
      {me.is_admin && (
        <label className="switch pad-x test-switch">
          <input type="checkbox" checked={!!perks.test} onChange={e => set({ test: e.target.checked })} />
          <span>🧪 وضع التجربة: افتح كل الجوائز لي بس (ليفلك الحقيقي {realLevel})</span>
        </label>
      )}
      <div className="perks">
        <Lock level={2} L={L} title="🎨 لون حسابك">
          <div className="swatches">
            <button type="button" className={`sw none ${!perks.color ? 'on' : ''}`} onClick={() => set({ color: null })} aria-label="اللون الأصلي">↺</button>
            {PALETTE.map(c => <button type="button" key={c} className={`sw ${perks.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />)}
          </div>
        </Lock>

        <Lock level={3} L={L} title="🏷️ لقبك">
          <a className="more" href="#/titles">كل الألقاب وكيف تفتحها ←</a>
          <div className="title-pick">
            <button className={`chip ${!perks.title ? 'on' : ''}`} onClick={() => set({ title: null })}>بدون</button>
            {Object.keys(TITLE_STYLES).map(t => (
              <button key={t} className={`tp ${perks.title === t ? 'on' : ''}`} disabled={!titleOk(t)} onClick={() => set({ title: t })}>
                <TitleBadge title={t} />{!titleOk(t) && <small>🔒</small>}
              </button>
            ))}
          </div>
        </Lock>

        <Lock level={4} L={L} title="🖼️ إطار صورتك">
          <div className="frames">
            <button type="button" className={!perks.frame ? 'on' : ''} onClick={() => set({ frame: null })}><span className="avatar-demo"><Avatar player={me} size={40} frame={null} /></span>بدون</button>
            {FRAMES.map(f => (
              <button key={f.id} type="button" disabled={L < f.level} className={perks.frame === f.id ? 'on' : ''} onClick={() => set({ frame: f.id })}>
                <span className="avatar-demo"><Avatar player={me} size={40} frame={f.id} /></span>{f.name}{L < f.level && <small>ليفل {f.level}</small>}
              </button>
            ))}
          </div>
        </Lock>

        <Lock level={4} L={L} title="😂 ردود فعل"><p>في لوحة الشلة، اضغط «+😀» تحت أي كتابة.</p></Lock>

        <Lock level={5} L={L} title="📌 تثبيت كتابة">
          {myPosts.length ? (
            <select className="input" value={perks.pinned || ''} onChange={e => set({ pinned: e.target.value || null })}>
              <option value="">بدون تثبيت</option>
              {myPosts.map(p => <option key={p.id} value={p.id}>{p.body.slice(0, 40)}</option>)}
            </select>
          ) : <p>اكتب شي في اللوحة أول، بعدين تقدر تثبّته.</p>}
        </Lock>

        <Lock level={6} L={L} title="😭 الطقطقة">
          {tease ? (
            <div className="tease-now">
              <Avatar player={idx.playersById.get(tease.target)} size={44} />
              <p>ملزّق على {idx.playersById.get(tease.target)?.name} لين {new Date(tease.until).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' })}</p>
              <button className="link-btn" onClick={() => set({ tease: null })}>شيله</button>
            </div>
          ) : weekLeft ? <p>استخدمتها هالأسبوع. ترجع لك بعد {Math.ceil((7 * 864e5 - (Date.now() - perks.teaseAt)) / 864e5)} أيام.</p> : (
            <TeasePicker onPick={(target, art) => set({ tease: { target, art, until: Date.now() + 3 * 864e5 }, teaseAt: Date.now() })} />
          )}
        </Lock>

        <Lock level={7} L={L} title="🎭 مسرح الرئيسية">
          <div className="scene-pick">
            <select className="input" value={scene.target || ''} onChange={e => saveScene({ target: e.target.value || null })}>
              <option value="">بدون مشهد</option>
              {idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="acts">{ACTIONS.map(a => <button key={a.id} className={`chip ${(scene.action || 'punch') === a.id ? 'on' : ''}`} disabled={!scene.target} onClick={() => saveScene({ action: a.id })}>{a.icon} {a.label}</button>)}</div>
            {scene.target && <div className="scene-prev"><Stage a={me} b={idx.playersById.get(scene.target)} action={scene.action || 'punch'} customA={active.char} compact /></div>}
          </div>
        </Lock>

        <Lock level={8} L={L} title="⚔️ تحدي رسمي"><p>قريباً.</p></Lock>
        <Lock level={9} L={L} title="🎯 اقتراح مميز"><p>قريباً.</p></Lock>
        <Lock level={10} L={L} title="🌌 بروفايل أسطوري">
          <label className="switch"><input type="checkbox" checked={!!perks.legend} onChange={e => set({ legend: e.target.checked })} /><span>خلفية أسطورية لصفحتك واسمك بتدرّج</span></label>
        </Lock>
        <Lock level={15} L={L} title="🏛️ صانع الجوائز"><p>قريباً.</p></Lock>
      </div>
      <p className="hint pad-x pad-b">الجوائز حالياً تبان على جهازك بس. بعد ما نعتمدها نربطها بالقاعدة عشان يشوفها الكل.</p>
    </Section>
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
