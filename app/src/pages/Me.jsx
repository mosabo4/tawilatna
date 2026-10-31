import { useState } from 'react'
import { useStore, go } from '../store'
import { api, DEMO } from '../api'
import { Avatar, TopBar, Section, Field, Empty } from '../ui'

const PALETTE = ['#D93A3A', '#2F6FDB', '#E9B425', '#2E9E5B', '#8A4FD8', '#EE7A2B', '#1BA6A6', '#D6458F', '#6B7A2E', '#4B4F58']

function PinChange() {
  const { act, updatePin } = useStore()
  const [n, setN] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async e => {
    e.preventDefault()
    setBusy(true)
    try { await act((p, pin) => api.changePin(p, pin, n), 'تغيّر رمزك'); updatePin(n); setN('') } catch { /* toast */ } finally { setBusy(false) }
  }
  return (
    <form className="pad form" onSubmit={save}>
      <Field label="الرمز الجديد" hint="من 4 إلى 8 أرقام. لا تنساه، المسؤول بس يقدر يرجّعه لك.">
        <input className="input pin-input" dir="ltr" inputMode="numeric" autoComplete="new-password" value={n} onChange={e => setN(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" />
      </Field>
      <button className="btn primary" disabled={n.length < 4 || busy}>غيّر رمزي</button>
    </form>
  )
}

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
        <Section title="رمزي"><PinChange /></Section>

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
