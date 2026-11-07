import { useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { Section } from '../ui'
import { usePerks } from '../perks'
import { STICKERS, Sticker } from '../stickers'
import { Character, CUSTOM, OPTION_NAMES, IMG_CHARS, imgSrc, idleFile } from '../characters'

// شخصيتك + تعديلها
export function CharacterEditor() {
  const { me } = useStore()
  const { perks, set, level: L, active } = usePerks()
  const ch = perks.char || {}
  const setCh = (k, v) => set({ char: { ...ch, [k]: v } })
  const ic = IMG_CHARS[(me.realName || me.name).trim()]
  if (me.is_admin) return <AllPoses />
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
    try { await act(async (p, pin) => { for (const pl of idx.players) if (IMG_CHARS[(pl.realName || pl.name).trim()]?.styles[style]) await api.setCharStyle(p, pin, pl.id, style) }, 'انحفظ للكل') } catch { /* toast */ } finally { setBusy(null) }
  }
  return (
    <Section title="أسلوب الشخصيات">
      <div className="pad-x row gap wrap-row">
        <span className="muted small">للكل:</span>
        {all.map(k => <button key={k} className="chip" disabled={!!busy} onClick={() => setAll(k)}>{IMG_CHARS['هاني'].styles[k].name}</button>)}
      </div>
      {idx.players.map(pl => {
        const ic = IMG_CHARS[(pl.realName || pl.name).trim()]; if (!ic) return null
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

// متى تطلع كل وضعية في التطبيق
const USES = {
  idle: ['الوقفة الأساسية: الرئيسية، بطاقة «أنا»، بطاقات الشلة، صفحة اللاعب', 'في «مين حاضر الليلة؟» قبل ما تختاره'],
  cards: ['الوقفة الأساسية: الرئيسية، بطاقة «أنا»، بطاقات الشلة، صفحة اللاعب', 'في «مين حاضر الليلة؟» قبل ما تختاره', 'تتبدل عشوائياً مع الوقفات الثانية'],
  punch: ['مشهد «يضرب» في الرئيسية: اللي يضرب'],
  hit: ['مشهد «يضرب» و«يرمي النرد على»: اللي ينضرب'],
  dice: ['مشهد «يرمي النرد على»: اللي يرمي'],
  laugh: ['مشهد «يطقطق على»: اللي يطقطق', 'وضعية «الضحك» (جائزة وضعية شخصيتك)'],
  cry: ['مشهد «يطقطق على»: الضحية', 'لما يسوّونه بيبي (إذا ما عنده صورة بيبي)'],
  dance: ['مشهد «يرقص مع»', 'وضعية «الرقص» (جائزة وضعية شخصيتك)'],
  cheer: ['مشهد «يتحدى»', 'لما تختاره في «مين حاضر الليلة؟»', 'ملخص الجلسة لما يرتفع ليفله', 'وضعية «الاحتفال»'],
  jump: ['نجم الليلة في ملخص الجلسة', 'وضعية «النطّة»'],
  flag: ['وضعية «الراية»'],
  crown: ['تمثال الشهر في الرئيسية', 'وضعية «التاج»'],
  baby: ['لما أحد يسوّيه بيبي (طقطقة البيبي)'],
}
function usesOf(sty, file, slugHasFace) {
  const out = []
  if (sty.cards?.includes(file)) out.push(...USES.cards)
  for (const [k, v] of Object.entries(sty.poses)) {
    const f = Array.isArray(v) ? v[0] : v
    if (f === file && USES[k] && !(k === 'idle' && sty.cards)) out.push(...USES[k])
  }
  if (file === 'bust' || (slugHasFace && file === 'f1')) out.push('ملصق وجهه في ردود اللوحة (جائزة ليفل 14)')
  return [...new Set(out)]
}

// للمسؤول: وضعيات كل الشلة، ويقدر يتنقل بين الأساليب
function AllPoses() {
  const { idx } = useStore()
  const [pick, setPick] = useState({})
  return (
    <>
      {idx.players.map(pl => {
        const ic = IMG_CHARS[(pl.realName || pl.name).trim()]; if (!ic) return null
        const cur = ic.styles[pl.char_style] ? pl.char_style : ic.def
        const st = pick[pl.id] || cur
        const sty = ic.styles[st]
        return (
          <Section key={pl.id} title={pl.name} action={<span className="muted small">الحالي: {ic.styles[cur].name}</span>}>
            <div className="pad-x title-pick">{Object.entries(ic.styles).map(([k, v]) => <button key={k} className={`chip ${st === k ? 'on' : ''}`} onClick={() => setPick(p => ({ ...p, [pl.id]: k }))}>{v.name}</button>)}</div>
            <div className="pose-grid">{sty.gallery.map(g => {
              const u = usesOf(sty, g, st === 'e' || st === 'v')
              return (
                <figure key={g} className={u.length ? '' : 'unused'}>
                  <img src={imgSrc(ic.slug, st, g)} alt="" loading="lazy" />
                  <figcaption>{u.length ? <ul>{u.map(x => <li key={x}>{x}</li>)}</ul> : <span>ما تطلع للحين (احتياط)</span>}</figcaption>
                </figure>
              )
            })}</div>
          </Section>
        )
      })}
      <p className="hint pad-x">تغيير أسلوب كل واحد من «أدوات المسؤول».</p>
    </>
  )
}
