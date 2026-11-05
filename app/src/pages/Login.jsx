import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { Avatar } from '../ui'
import { DEMO } from '../api'

export default function Login() {
  const { idx, data, login, setGuest } = useStore()
  const locked = !!data?.settings?.login_locked
  const [who, setWho] = useState(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [taps, setTaps] = useState(0)

  const press = d => { setErr(''); setPin(p => (p.length < 8 ? p + d : p)) }
  const submit = async () => {
    if (pin.length < 4 || busy) return
    setBusy(true)
    try { await login(who.id, pin) } catch (e) { setErr(e.message); setPin('') } finally { setBusy(false) }
  }
  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    if (!who) return
    const on = e => {
      const d = e.key.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632))
      if (/^[0-9]$/.test(d)) press(d)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
      else if (e.key === 'Enter') submitRef.current()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [who])

  if (!who) {
    return (
      <div className="login">
        <div className="login-brand">
          <h1 className="brand big">طاولتنا</h1>
          <p>ألعابنا، أقيامنا، ومين يكسب مين.</p>
        </div>

        <div className="glass login-card">
          <h2 className="login-q">مين أنت؟</h2>
          <div className="who-grid">
            {idx.players.map(p => (
              <button key={p.id} className="who" onClick={() => setWho(p)}>
                <Avatar player={p} size={52} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        {!locked && <button className="link-btn" onClick={() => setGuest(true)}>أتفرج بس بدون دخول</button>}
        {DEMO && <p className="demo-note">نسخة تجريبية: رمز الكل 1111</p>}
      </div>
    )
  }

  if (locked && !who.is_admin && taps < 5) {
    return (
      <div className="login">
        <button className="link-btn back-who" onClick={() => { setWho(null); setTaps(0) }}>مو أنا؟ ارجع</button>
        <div className="maint">
          <span className="maint-icon" aria-hidden="true" onClick={() => setTaps(t => t + 1)}>🛠️</span>
          <h2>هلا {who.name}</h2>
          <p>الموقع مغلق مؤقتاً للصيانة.<br />نجهّز لكم أشياء جديدة، وبنفتحه قريب.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login">
      <button className="link-btn back-who" onClick={() => { setWho(null); setPin(''); setErr(''); setTaps(0) }}>مو أنا؟ ارجع</button>
      <div className="pin-who">
        <Avatar player={who} size={76} ring />
        <h2>هلا {who.name}</h2>
        <p>اكتب رمزك</p>
      </div>
      <div className={`pin-dots ${err ? 'shake' : ''}`} aria-live="polite" aria-label={`${Math.min(pin.length, 4)} أرقام`}>
        {Array.from({ length: 4 }, (_, i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <p className="pin-err" role="alert">{err}</p>
      <div className="keypad" dir="ltr">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => press(String(n))}>{n}</button>)}
        <button className="kp-del" onClick={() => setPin(p => p.slice(0, -1))} aria-label="مسح">⌫</button>
        <button onClick={() => press('0')}>0</button>
        <button className="kp-go" onClick={submit} disabled={pin.length < 4 || busy} aria-label="دخول">دخول</button>
      </div>
    </div>
  )
}
