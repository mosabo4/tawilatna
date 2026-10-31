import { useEffect, useRef, useState } from 'react'
import { useStore, go } from './store'

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
export const placeName = n => ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'][n - 1] || `${n}`

// ---------- القطعة (لون كل لاعب) ----------
export function Pawn({ color = '#999', size = 28, crown = false, title }) {
  return (
    <svg className="pawn" width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden={!title} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {crown && <path d="M10 6 14 0l6 5 6-5 4 6-2 5H12z" fill="var(--gold)" stroke="var(--felt-2)" strokeWidth="1.2" />}
      <circle cx="20" cy="17" r="8.5" fill={color} />
      <path d="M8 43c0-10 5-17 12-17s12 7 12 17z" fill={color} />
      <rect x="5" y="40" width="30" height="5.5" rx="2.75" fill={color} />
      <path d="M8 43c0-10 5-17 12-17" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />
      <circle cx="17" cy="14" r="2.6" fill="#fff" fillOpacity=".35" />
    </svg>
  )
}

export function PlayerTag({ player, size = 22, crown, link = true }) {
  if (!player) return <span className="ptag muted">لاعب محذوف</span>
  const inner = <><Pawn color={player.color} size={size} crown={crown} /><span>{player.name}</span></>
  return link
    ? <a className="ptag" href={`#/player/${player.id}`}>{inner}</a>
    : <span className="ptag">{inner}</span>
}

// ---------- غلاف اللعبة ----------
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }
const COVER_TONES = [['#1F4D3E', '#E9B425'], ['#5B2333', '#F2C6A0'], ['#23395B', '#9BD1E5'], ['#4A3B2A', '#E8C07D'], ['#3B2C55', '#C9B6F2'], ['#24493F', '#F28C6B'], ['#2C3E2D', '#D7E36A']]
export function Cover({ game, className = '' }) {
  const [broken, setBroken] = useState(false)
  if (game.image_url && !broken) {
    return <div className={`cover ${className}`}><img src={game.image_url} alt="" loading="lazy" onError={() => setBroken(true)} referrerPolicy="no-referrer" /></div>
  }
  const h = hash(game.name)
  const [bg, fg] = COVER_TONES[h % COVER_TONES.length]
  const shape = h % 3
  return (
    <div className={`cover cover-gen ${className}`} style={{ background: bg, color: fg }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {shape === 0 && [0, 1, 2, 3, 4].map(i => <polygon key={i} points="50,8 88,30 88,72 50,94 12,72 12,30" transform={`translate(${(i - 2) * 38} ${i % 2 ? 40 : 60}) scale(.42)`} fill="currentColor" opacity={0.10 + i * 0.03} />)}
        {shape === 1 && [0, 1, 2, 3].map(i => <rect key={i} x={10 + i * 22} y={50 + (i % 2) * 14} width="18" height="18" rx="3" fill="currentColor" opacity={0.12 + i * 0.03} transform={`rotate(${i * 9 - 12} ${19 + i * 22} ${59})`} />)}
        {shape === 2 && [0, 1, 2].map(i => <circle key={i} cx={22 + i * 28} cy={72 - i * 6} r={14 - i * 2} fill="currentColor" opacity={0.13 + i * 0.04} />)}
      </svg>
      <span className="cover-title">{game.name}</span>
    </div>
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
            disabled={disabled}
            onClick={() => onChange(v === n ? n - 0.5 : n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="hint">اضغط الرقم مرة ثانية عشان تنقص نص درجة.</p>
    </div>
  )
}

export function ScoreBadge({ value, big }) {
  return <span className={`score-badge ${big ? 'big' : ''}`}>{fmtScore(value)}</span>
}

// ---------- عناصر عامة ----------
export function Section({ title, action, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      {(title || action) && <div className="section-head"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <Pawn color="var(--felt-line)" size={34} />
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
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

export function useRequireLogin() {
  const { me, setGuest } = useStore()
  return () => { if (!me) { setGuest(false); return false } return true }
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
