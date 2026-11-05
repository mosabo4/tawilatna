import { useState } from 'react'
import { useStore, go } from '../store'
import { api, DEMO } from '../api'
import { availableMonths, monthName } from '../recap'
import { Avatar, TopBar, Section, Field, Empty } from '../ui'

const PALETTE = ['#D93A3A', '#2F6FDB', '#E9B425', '#2E9E5B', '#8A4FD8', '#EE7A2B', '#1BA6A6', '#D6458F', '#6B7A2E', '#4B4F58']

function PlayerEditor({ player, onDone }) {
  const { act, me } = useStore()
  const [f, setF] = useState({ name: player?.name || '', color: player?.color || PALETTE[6], is_admin: !!player?.is_admin, pin: '' })
  const [busy, setBusy] = useState(false)
  const save = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      await act((p, pin) => api.savePlayer(p, pin, { id: player?.id, ...f, pin: f.pin || null }), player ? `انحفظ ${f.name}` : `انضاف ${f.name}`)
      onDone()
    } catch { /* toast */ } finally { setBusy(false) }
  }
  return (
    <form className="pad form editor" onSubmit={save}>
      <div className="row gap center">
        <Avatar player={{ id: player?.id, name: f.name || '؟', color: f.color }} size={44} />
        <Field label="الاسم"><input className="input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      </div>
      <div className="field">
        <span className="field-label">اللون</span>
        <div className="swatches">
          {PALETTE.map(c => <button type="button" key={c} className={`sw ${f.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} aria-pressed={f.color === c} />)}
        </div>
      </div>
      <Field label={player ? 'رمز جديد (اتركه فاضي إذا ما تبي تغيّره)' : 'الرمز'}>
        <input className="input pin-input" dir="ltr" inputMode="numeric" required={!player} value={f.pin} onChange={e => setF({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 8) })} placeholder="••••" />
      </Field>
      {player?.id !== me.id && (
        <label className="switch"><input type="checkbox" checked={f.is_admin} onChange={e => setF({ ...f, is_admin: e.target.checked })} /><span>مسؤول (يقدر يحذف ويدير اللاعبين)</span></label>
      )}
      <div className="row gap">
        <button className="btn primary" disabled={busy || !f.name.trim() || (!player && f.pin.length < 4) || (f.pin && f.pin.length < 4)}>{player ? 'احفظ' : 'أضف اللاعب'}</button>
        <button type="button" className="btn ghost" onClick={onDone}>إلغاء</button>
      </div>
    </form>
  )
}

function RecapLauncher() {
  const { idx } = useStore()
  const months = availableMonths(idx)
  const [m, setM] = useState(months[0])
  const start = () => { document.documentElement.requestFullscreen?.().catch(() => {}); go(`/recap/${m}`) }
  return (
    <div className="pad form">
      <p className="hint" style={{ margin: 0 }}>عرض كامل للشهر بالإحصائيات والجوائز، تعرضه على الشلة. اضغط على الشاشة أو الأسهم عشان تنتقل بين الشرائح.</p>
      <div className="row gap">
        <select className="input" value={m} onChange={e => setM(e.target.value)} aria-label="الشهر">
          {months.map(x => <option key={x} value={x}>{monthName(x)}</option>)}
        </select>
        <button className="btn primary" onClick={start}>▶ اعرض</button>
      </div>
    </div>
  )
}

function LockToggle() {
  const { data, act } = useStore()
  const locked = !!data?.settings?.login_locked
  const [busy, setBusy] = useState(false)
  const flip = async () => {
    setBusy(true)
    try { await act((p, pin) => api.setLoginLock(p, pin, !locked), locked ? 'انفتح الدخول للكل' : 'انقفل الدخول، أنت بس تقدر تدخل') } catch { /* toast */ } finally { setBusy(false) }
  }
  return (
    <div className="pad lock-row">
      <div><b>{locked ? '🔒 الدخول مقفل' : '🔓 الدخول مفتوح'}</b><p className="hint">{locked ? 'أنت بس تقدر تدخل. الباقين يتفرجون بدون دخول.' : 'الكل يقدر يدخل برمزه.'}</p></div>
      <button className={`btn small ${locked ? 'primary' : 'ghost'}`} disabled={busy} onClick={flip}>{locked ? 'افتح للكل' : 'اقفل'}</button>
    </div>
  )
}

export default function Me() {
  const { me, idx, logout } = useStore()
  const [editing, setEditing] = useState(null) // player id | 'new'
  if (!me) return <div className="page"><TopBar title="حسابي" /><Empty title="ما دخلت" /></div>
  return (
    <div className="page">
      <TopBar title="حسابي" />
      <div className="stack">
        <div className="glass pad me-card">
          <Avatar player={me} size={48} />
          <div><b>{me.name}</b>{me.is_admin && <span className="tag">مسؤول</span>}</div>
          <a className="more" href={`#/player/${me.id}`}>إحصائياتي</a>
        </div>
        <p className="hint pad-x">رمزك ثابت. لو نسيته، المسؤول يقدر يعطيك رمز جديد.</p>

        {me.is_admin && <Section title="ملخص الشهر 🎬"><RecapLauncher /></Section>}
        {me.is_admin && <Section title="دخول الشلة"><LockToggle /></Section>}

        {me.is_admin && (
          <Section title="إدارة اللاعبين" action={editing !== 'new' && <button className="btn small ghost" onClick={() => setEditing('new')}>أضف لاعب</button>}>
            {editing === 'new' && <PlayerEditor onDone={() => setEditing(null)} />}
            <ul className="admin-players">
              {idx.players.map(p => (
                <li key={p.id}>
                  {editing === p.id ? <PlayerEditor player={p} onDone={() => setEditing(null)} /> : (
                    <div className="ap-row">
                      <Avatar player={p} size={28} /><span>{p.name}</span>
                      {p.is_admin && <span className="tag">مسؤول</span>}
                      <button className="link-btn" onClick={() => setEditing(p.id)}>تعديل أو رمز جديد</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="hint pad-x pad-b">إذا أحد نسى رمزه، اضغط «تعديل» واكتب له رمز جديد.</p>
          </Section>
        )}

        {DEMO && (
          <Section title="النسخة التجريبية">
            <p className="pad-x muted">البيانات هنا وهمية ومحفوظة على جهازك بس.</p>
            <div className="pad"><button className="btn ghost" onClick={() => { api.reset(); location.reload() }}>رجّع البيانات التجريبية</button></div>
          </Section>
        )}
        <button className="btn danger-link" onClick={() => { logout(); go('/') }}>اطلع من الحساب</button>
      </div>
    </div>
  )
}
