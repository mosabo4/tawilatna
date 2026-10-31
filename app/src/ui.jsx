import { useEffect, useRef, useState } from 'react'
import { useStore, go } from './store'
import { catOf, weightLabel } from './categories'

// ---------- تنسيق ----------
const dFmt = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' })
const dFmtY = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
const mFmt = new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' })
export const fmtDate = s => {
  if (!s) return ''
  const d = new Date(s + 'T00:00:00')
  return (d.getFullYear() === new Date().getFullYear() ? dFmt : dFmtY).format(d)
}
export const fmtMonth = s => mFmt.format(new Date(s + 'T00:00:00'))
export const pct = x => `${Math.round(x * 100)}%`
export const fmtScore = x => (x == null ? '—' : Number(x).toFixed(1).replace(/\.0$/, ''))
export const today = () => {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10)
}
export function ago(days) {
  if (days == null) return 'ما انلعبت'
  if (days <= 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 30) return `قبل ${days} يوم`
  const m = Math.round(days / 30)
  if (m < 12) return m === 1 ? 'قبل شهر' : m === 2 ? 'قبل شهرين' : `قبل ${m} أشهر`
  return 'قبل أكثر من سنة'
}
// المدى الرقمي يُعزل باتجاه يسار-يمين عشان "2–4" ما تنقلب داخل النص العربي
export const range = (a, b) => (b && b !== a ? `\u2066${a}–${b}\u2069` : `${a}`)
export const playersText = g => (g?.min_players ? `${range(g.min_players, g.max_players)} لاعبين` : null)
export const timeText = g => (g?.play_minutes ? `${range(g.play_minutes, g.max_minutes)} د` : null)

// ---------- صورة اللاعب ----------
export function initials(player, all) {
  if (!player) return '?'
  const n = player.name.trim()
  const clash = all?.some(o => o.id !== player.id && o.name.trim()[0] === n[0])
  return clash ? n.slice(0, 2) : n[0]
}
export function Avatar({ player, size = 28, ring }) {
  const { idx } = useStore()
  const st = { '--c': player?.color || '#5A6088', width: size, height: size, fontSize: Math.round(size * (initials(player, idx?.players).length > 1 ? 0.36 : 0.42)) }
  return <span className={`avatar ${ring ? 'ring' : ''}`} style={st} aria-hidden="true">{initials(player, idx?.players)}</span>
}
export function PlayerTag({ player, size = 24, link = true }) {
  if (!player) return <span className="ptag muted">لاعب محذوف</span>
  const inner = <><Avatar player={player} size={size} /><span>{player.name}</span></>
  return link ? <a className="ptag" href={`#/player/${player.id}`}>{inner}</a> : <span className="ptag">{inner}</span>
}

// ---------- دائرة النسبة ----------
export function Donut({ value = 0, size = 92, children }) {
  return (
    <span className="donut" style={{ '--p': `${Math.round(value * 100)}%`, width: size, height: size }}>
      <span className="donut-in">{children}</span>
    </span>
  )
}

// ---------- غلاف اللعبة ----------
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }
export function Cover({ game, className = '' }) {
  const [broken, setBroken] = useState(false)
  if (game.image_url && !broken) {
    return <div className={`cover ${className}`}><img src={game.image_url} alt="" loading="lazy" onError={() => setBroken(true)} referrerPolicy="no-referrer" /></div>
  }
  const tone = catOf(game).tone
  const h = hash(game.name)
  return (
    <div className={`cover cover-gen ${className}`} style={{ '--t': tone, '--a': `${h % 360}deg` }}>
      <span className="cover-title">{game.name}</span>
    </div>
  )
}

export function Weight({ value, compact }) {
  if (value == null) return null
  const filled = Math.round(value)
  return (
    <span className={`weight ${compact ? 'compact' : ''}`} title={`الصعوبة ${Number(value).toFixed(1)} من 5`}>
      <span className="w-bars" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= filled ? 'on' : ''} />)}</span>
      {!compact && <span>{weightLabel(value)}</span>}
    </span>
  )
}

// ---------- مدخل التقييم ----------
export function RatingInput({ value, onChange, disabled }) {
  const v = value ?? 0
  return (
    <div className="rating-input">
      <div className="rating-scale" role="radiogroup" aria-label="التقييم من 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" role="radio" aria-checked={Math.ceil(v) === n}
            className={`rs ${n <= v ? 'on' : ''} ${n - 0.5 === v ? 'half' : ''}`}
            disabled={disabled} onClick={() => onChange(v === n ? n - 0.5 : n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="hint">اضغط الرقم مرة ثانية عشان تنقص نص درجة.</p>
    </div>
  )
}

export function ScoreBadge({ value, big }) {
  return <span className={`score-badge ${big ? 'big' : ''} ${value == null ? 'none' : ''}`}>{fmtScore(value)}</span>
}

// ---------- عناصر عامة ----------
export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`glass section ${className}`}>
      {(title || action) && <div className="section-head"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true" />
      <p className="empty-title">{title}</p>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}

export function TopBar({ title, backTo, right }) {
  return (
    <header className="topbar sub">
      <button className="icon-btn" onClick={() => (history.length > 1 ? history.back() : go(backTo || '/'))} aria-label="رجوع">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
      </button>
      <h1>{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  return <div key={toast.id} className={`toast ${toast.kind}`} role="status">{toast.text}</div>
}

export function Confirm({ text, confirmText, onConfirm, onCancel, danger }) {
  const ref = useRef()
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <p className="sheet-text">{text}</p>
        <div className="row gap">
          <button ref={ref} className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmText}</button>
          <button className="btn ghost" onClick={onCancel}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}

export const IconUsers = () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 13.4c1.8.7 3 2.9 3 5.6" /></svg>
export const IconClock = () => <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
