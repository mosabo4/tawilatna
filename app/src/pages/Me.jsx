import { useState } from 'react'
import { useStore, go } from '../store'
import { api, DEMO } from '../api'
import { availableMonths, monthName } from '../recap'
import { playerStats } from '../stats'
import { Character } from '../characters'
import { CharacterEditor, StyleAdmin } from './Closet'
import Progress from './Progress'
import { MyGames } from './Players'
import { usePerks, TitleBadge } from '../perks'
import { useLevels } from './Levels'
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
    try { await act((p, pin) => api.setLoginLock(p, pin, !locked), locked ? 'انفتح الدخول للكل' : 'انقفل الموقع، أنت بس تقدر تدخل') } catch { /* toast */ } finally { setBusy(false) }
  }
  return (
    <div className="pad lock-row">
      <div><b>{locked ? '🔒 الدخول مقفل' : '🔓 الدخول مفتوح'}</b><p className="hint">{locked ? 'الموقع مقفل على الكل: ما أحد يقدر يدخل ولا يتفرج غيرك.' : 'الكل يقدر يدخل برمزه.'}</p></div>
      <button className={`btn small ${locked ? 'primary' : 'ghost'}`} disabled={busy} onClick={flip}>{locked ? 'افتح للكل' : 'اقفل'}</button>
    </div>
  )
}

function Admin() {
  const { idx, me } = useStore()
  const [editing, setEditing] = useState(null) // player id | 'new'
  if (!me?.is_admin) return <Empty title="هذي للمسؤول بس" />
  return (
    <>
      <Section title="ملخص الشهر 🎬"><RecapLauncher /></Section>
      <Section title="دخول الشلة"><LockToggle /></Section>
      <StyleAdmin />
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
      {DEMO && (
        <Section title="النسخة التجريبية">
          <p className="pad-x muted">البيانات هنا وهمية ومحفوظة على جهازك بس.</p>
          <div className="pad"><button className="btn ghost" onClick={() => { api.reset(); location.reload() }}>رجّع البيانات التجريبية</button></div>
        </Section>
      )}
    </>
  )
}

const SUBS = { char: ['شخصيتي', CharacterEditor], games: ['ألعابي وتقييماتي', MyGames], admin: ['أدوات المسؤول', Admin] }

export default function Me({ sub }) {
  const { me, idx, logout } = useStore()
  const { active } = usePerks()
  const levels = useLevels()
  if (!me) return <div className="page"><TopBar title="أنا" /><Empty title="ما دخلت" text="ادخل باسمك عشان تشوف ليفلك وجوائزك." /></div>
  if (sub === 'closet') return <Progress />
  if (sub && SUBS[sub]) {
    const [title, C] = SUBS[sub]
    return <div className="page"><TopBar title={title} backTo="/me" /><div className="stack"><C /></div></div>
  }
  const lv = levels.get(me.id)
  const st = playerStats(idx, me.id)
  const unrated = (() => {
    const played = new Set(idx.plays.filter(p => p.results.some(r => r.player_id === me.id)).map(p => p.game_id))
    const rated = new Set(idx.ratings.filter(r => r.player_id === me.id).map(r => r.game_id))
    return [...played].filter(g => !rated.has(g)).length
  })()
  const link = (icon, label, href, note, cls = '') => <a className={`me-link ${cls}`} href={href}><span>{icon}</span><b>{label}</b><em>{note}</em><i aria-hidden="true">‹</i></a>
  return (
    <div className="page">
      <header className="sec-head"><div className="sec-top"><h1>أنا</h1></div></header>
      <div className="stack">
        <a className={`me-card ${active.legend ? 'legend' : ''}`} href="#/progress" style={{ '--c': active.color || me.color }}>
          <div className="mc-body">
            <span className="mc-chr"><Character player={me} custom={active.char} size={150} /></span>
            <div className="mc-mid">
              <b className={`mc-nm ${active.legend ? 'legend-name' : ''}`}>{me.name}</b>
              {active.title ? <TitleBadge title={active.title} small /> : <span className="mc-tb">{lv.title}</span>}
              <span className="mc-lv"><span className="mc-lvn">{lv.level}</span>ليفل · <bdi>{lv.xp} XP</bdi></span>
            </div>
            <div className="mc-left">
              <div className="mc-big"><bdi>{st.points ?? '—'}{st.points != null && <em>%</em>}</bdi></div>
              <small className="mc-cap">المستوى</small>
              <div className="mc-chips">
                <span>🏆 <b><bdi>{st.wins}/{st.plays}</bdi></b> فوز</span>
                <span>🎲 <b>{lv.stats.games}</b> {lv.stats.games === 1 ? 'لعبة' : 'ألعاب'}</span>
                <span>🔥 <b>{lv.stats.bestWinStreak}</b> سلسلة</span>
              </div>
            </div>
          </div>
          <div className="mc-xp">
            <div className="mc-xprow"><span>باقي <bdi>{lv.need - lv.into} XP</bdi> على ليفل {lv.level + 1}</span><bdi>{Math.round(lv.progress * 100)}%</bdi></div>
            <div className="mc-bar"><i style={{ width: `${Math.max(3, lv.progress * 100)}%` }} /></div>
          </div>
        </a>

        <div className="me-prog">
          <a href="#/progress" className="mp-main">
            <span className="mp-ic">🎁</span>
            <span className="mp-txt"><b>تقدّمي وجوائزي</b><small>{lv.nextReward ? `الجاية: ${lv.nextReward.icon} ${lv.nextReward.name} · ليفل ${lv.nextReward.level}` : 'فتحت كل شي 👑'}</small></span>
            <i aria-hidden="true">‹</i>
          </a>
        </div>

        <nav className="me-links slim">
          {link('🧍', 'شخصيتي', '#/me/char', 'وضعياتها')}
          {link('🎲', 'ألعابي وتقييماتي', '#/me/games', unrated ? `${unrated} بدون تقييم` : 'كلها مقيّمة', unrated ? 'warn' : '')}
          {link('🌐', 'صفحتي العامة', `#/player/${me.id}`, 'كيف يشوفني الباقين')}
        </nav>
        {me.is_admin && <nav className="me-links">{link('🛠️', 'أدوات المسؤول', '#/me/admin', 'الملخص، القفل، اللاعبين، الشخصيات', 'admin')}</nav>}
        <p className="hint pad-x">رمزك ثابت. لو نسيته، المسؤول يقدر يعطيك رمز جديد.</p>
        <button className="btn danger-link" onClick={() => { logout(); go('/') }}>اطلع من الحساب</button>
      </div>
    </div>
  )
}
