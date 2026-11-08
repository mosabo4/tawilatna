import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api, DEMO } from '../api'
import { availableMonths, monthName } from '../recap'
import { playerStats } from '../stats'
import { Character } from '../characters'
import { CharacterEditor } from './Closet'
import Progress from './Progress'
import { MyGames } from './Players'
import { usePerks, TitleBadge } from '../perks'
import { unlockHistory } from '../titles'
import { useLevels } from './Levels'
import { LimitsList } from './Limits'
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
      <Section title="شرح الموقع 📖"><div className="pad form"><p className="hint" style={{ margin: 0 }}>عرض يشرح للشلة نظام الموقع: النقاط، المستويات، الجوائز، الإنجازات، الألقاب.</p><button className="btn primary" onClick={() => { document.documentElement.requestFullscreen?.().catch(() => {}); go('/guide') }}>▶ اعرض الشرح</button></div></Section>
      <Section title="دخول الشلة"><LockToggle /></Section>
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

const SUBS = { char: ['شخصيتي', CharacterEditor], games: ['ألعابي وتقييماتي', MyGames], limits: ['جوائزي المحدودة', LimitsList], admin: ['أدوات المسؤول', Admin] }

export default function Me({ sub }) {
  const { me, idx, logout } = useStore()
  const levels = useLevels()
  if (!me) return <div className="page"><TopBar title="أنا" /><Empty title="ما دخلت" text="ادخل باسمك عشان تشوف مستواك وجوائزك." /></div>
  if (sub === 'closet') return <Progress />
  if (sub === 'cards') return <AllCards />
  if (sub && SUBS[sub]) {
    const [title, C] = SUBS[sub]
    return <div className="page"><TopBar title={title} backTo="/me" /><div className="stack"><C /></div></div>
  }
  const lv = levels.get(me.id)
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
        <PlayerCard pid={me.id} href="#/me/cards" />

        <div className="me-prog">
          <a href="#/progress" className="mp-main">
            <span className="mp-ic">🎁</span>
            <span className="mp-txt"><b>تقدّمي وجوائزي</b><small>{lv.nextReward ? `الجاية: ${lv.nextReward.icon} ${lv.nextReward.name} · مستوى ${lv.nextReward.level}` : 'فتحت كل شي 👑'}</small></span>
            <i aria-hidden="true">‹</i>
          </a>
        </div>

        <RecentUnlocks pid={me.id} />

        <nav className="me-links slim">
          {me.is_admin && link('🧍', 'شخصيتي', '#/me/char', 'وضعياتها')}
          {link('🎲', 'ألعابي وتقييماتي', '#/me/games', unrated ? `${unrated} بدون تقييم` : 'كلها مقيّمة', unrated ? 'warn' : '')}
          {link('⏳', 'جوائزي المحدودة', '#/me/limits', 'مرة بالأسبوع وبالشهر')}
          {link('🌐', 'صفحتي العامة', `#/player/${me.id}`, 'كيف يشوفني الباقين')}
        </nav>
        {me.is_admin && <nav className="me-links">{link('🛠️', 'أدوات المسؤول', '#/me/admin', 'الملخص، القفل، اللاعبين، الشخصيات', 'admin')}</nav>}
        <p className="hint pad-x">رمزك ثابت. لو نسيته، المسؤول يقدر يعطيك رمز جديد.</p>
        <button className="btn danger-link" onClick={() => { logout(); go('/') }}>اطلع من الحساب</button>
      </div>
    </div>
  )
}

const KIND = { level: ['مستوى', '#FF7A59'], reward: ['جائزة', '#E9B425'], title: ['لقب', '#8A4FD8'], ach: ['إنجاز', '#2E9E5B'] }
const dayText = d => { const n = Math.round((new Date(new Date().toISOString().slice(0, 10)) - new Date(d)) / 864e5); return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n < 7 ? `قبل ${n} أيام` : new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) }
function RecentUnlocks({ pid }) {
  const { idx } = useStore()
  const list = useMemo(() => unlockHistory(idx, pid), [idx, pid])
  const [all, setAll] = useState(false)
  if (!list.length) return null
  const shown = list.slice(0, all ? 20 : 5)
  return (
    <section className="glass unl">
      <div className="unl-h"><b>🎉 آخر اللي فتحته</b><a className="more" href="#/progress">تقدّمي</a></div>
      <ul>
        {shown.map((u, i) => (
          <li key={i}>
            <span className="unl-ic" style={{ '--k': KIND[u.kind][1] }}>{u.icon}</span>
            <span className="unl-t"><b>{u.name}</b><small>{u.desc}</small></span>
            <span className="unl-m"><em style={{ '--k': KIND[u.kind][1] }}>{KIND[u.kind][0]}</em><small>{dayText(u.at)}</small></span>
          </li>
        ))}
      </ul>
      {list.length > 5 && <button className="link-btn unl-more" onClick={() => setAll(v => !v)}>{all ? 'أقل' : `شوف الكل (${Math.min(list.length, 20)})`}</button>}
    </section>
  )
}

// بطاقة لاعب (نفس شكل بطاقة «أنا»)
export function PlayerCard({ pid, href }) {
  const { idx } = useStore()
  const { look } = usePerks()
  const levels = useLevels()
  const p = idx.playersById.get(pid); const lv = levels.get(pid)
  if (!p || !lv) return null
  const st = playerStats(idx, pid)
  const lk = look(pid)
  return (
    <a className={`me-card ${lk.gold ? 'gold-card' : ''}`} href={href} style={{ '--c': lk.color || p.color, ...(lk.bg ? { background: lk.bg.css } : {}) }}>
      <div className="mc-body">
        <span className="mc-chr"><Character player={p} size={150} /></span>
        <div className="mc-mid">
          <b className={`mc-nm ${lk.nameFx ? 'name-fx' : ''}`}>{p.name}{lk.badge && <i className="nm-badge">{lk.badge.icon}</i>}</b>
          {lk.title ? <TitleBadge title={lk.title} kind={lk.titleKind} small /> : <span className="mc-tb">{lv.title}</span>}
          <span className="mc-lv"><span className="mc-lvn">{lv.level}</span>مستوى · <bdi>{lv.xp} XP</bdi></span>
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
        <div className="mc-xprow"><span>باقي <bdi>{lv.need - lv.into} XP</bdi> على مستوى {lv.level + 1}</span><bdi>{Math.round(lv.progress * 100)}%</bdi></div>
        <div className="mc-bar"><i style={{ width: `${Math.max(3, lv.progress * 100)}%` }} /></div>
      </div>
    </a>
  )
}

// بطاقات الشلة كلها، الأعلى مستوى أول
function AllCards() {
  const { me } = useStore()
  const levels = useLevels()
  const list = [...levels.values()].sort((a, b) => b.xp - a.xp)
  return (
    <div className="page">
      <TopBar title="بطاقات الشلة" backTo="/me" />
      <div className="stack">
        {list.map(l => <PlayerCard key={l.player.id} pid={l.player.id} href={l.player.id === me?.id ? '#/progress' : `#/player/${l.player.id}`} />)}
      </div>
    </div>
  )
}
