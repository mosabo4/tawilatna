// بطاقات الجوائز المحدودة: مرة بالأسبوع / مرة بالشهر
/* eslint-disable react/prop-types */
import { useStore } from '../store'
import { usePerks } from '../perks'
import { REWARDS } from '../levels'
import { lastUse, isImmune } from '../actions'

const DAY = 864e5
// id الجائزة = نوع الفعل. days = فترة التجدد. where = وين تستخدمها
const LIMITED = [
  ['luckbox', 7, 'صفحة المستوى'], ['tease', 7, 'صفحة اللاعب'], ['firstturn', 7, 'الجلسة الحية'],
  ['teampick', 7, 'الجلسة الحية'], ['baby', 7, 'صفحة اللاعب'], ['caption', 7, 'صفحة اللاعب'], ['retitle', 7, 'صفحة اللاعب'],
  ['gift', 7, 'صفحة اللاعب'], ['nick', 7, 'صفحة اللاعب'], ['box', 7, 'صفحة المستوى'], ['alert', 7, 'صفحة المستوى'],
  ['veto', 30, 'اللوحة'], ['guarantee', 30, 'الجلسة الحية'], ['lucky', 30, 'صفحة القيم'],
  ['swap', 30, 'صفحة القيم'], ['hotseat', 30, 'صفحة المستوى'], ['opener', 30, 'اللوحة'], ['immune', 30, 'صفحة المستوى'], ['godfather', 30, 'صفحة اللاعب'],
]

const fmt = ms => { const h = Math.ceil(ms / 36e5); return h >= 24 ? `${Math.ceil(ms / DAY)} يوم` : `${Math.max(1, h)} ساعة` }

export function LimitsList() {
  const { idx, me } = useStore()
  const { level: L } = usePerks()
  if (!me) return null
  const cards = LIMITED.map(([id, days, where]) => {
    const r = REWARDS.find(x => x.id === id); if (!r) return null
    const last = lastUse(idx, me.id, id)
    const left = last ? days * DAY - (Date.now() - new Date(last.created_at).getTime()) : 0
    const state = L < r.level ? 'lock' : left > 0 ? 'wait' : 'ready'
    return { ...r, days, where, left, state, active: id === 'immune' && isImmune(idx, me.id) }
  }).filter(Boolean)
  const ready = cards.filter(c => c.state === 'ready').length
  const order = { ready: 0, wait: 1, lock: 2 }
  const group = d => cards.filter(c => c.days === d).sort((a, b) => order[a.state] - order[b.state] || a.level - b.level)
  const COL = { 7: ['#12466b', '#1f9ec9', '#8fd8ff'], 30: ['#4a2670', '#b04fd1', '#e3a6ff'] }
  const block = (title, d) => (
    <section className="lim-sec">
      <h3>{title}</h3>
      <div className="tlist">{group(d).map(c => {
        const [f, t, r] = COL[c.days]
        const pct = c.state === 'wait' ? Math.max(4, 100 - (c.left / (c.days * DAY)) * 100) : 0
        return (
          <div key={c.id} className={`tcard ${c.state === 'lock' ? 'locked' : ''}`} style={{ '--f': f, '--t': t, '--r': r }}>
            <span className="tc-icon">{c.icon}</span>
            <div className="tc-body">
              <div className="tc-top"><b>{c.name}</b>
                <span className="tc-rar">{c.state === 'ready' ? (c.active ? '✅ شغّالة' : '✅ جاهزة') : c.state === 'wait' ? '⏳ منتظرة' : `🔒 ليفل ${c.level}`}</span>
              </div>
              <p>{c.desc.replace(/[،,]? ?مرة (بالأسبوع|بالشهر)\.?/, '').trim()}</p>
              {c.state === 'wait' && <div className="tc-prog"><span className="tc-bar"><span style={{ width: `${pct}%` }} /></span><small>تتجدد بعد {fmt(c.left)}</small></div>}
              <div className="tc-foot"><small>مرة {c.days === 7 ? 'بالأسبوع' : 'بالشهر'}</small>{c.state === 'ready' && <small>من: {c.where}</small>}{c.state === 'lock' && <small>تفتح بليفل {c.level}</small>}</div>
            </div>
          </div>
        )
      })}</div>
    </section>
  )
  return (
    <>
      <p className="hint pad-x">{ready} جاهزة للاستخدام الحين. كل بطاقة تتجدد بعد ما تستخدمها بالمدة المكتوبة.</p>
      {block('مرة بالأسبوع 📅', 7)}
      {block('مرة بالشهر 🗓️', 30)}
    </>
  )
}
