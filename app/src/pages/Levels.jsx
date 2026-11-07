import { useMemo } from 'react'
import { useStore } from '../store'
import { computeLevels, XP_RULES, TITLES, xpFor } from '../levels'
import { Avatar, Section } from '../ui'
import { TitleBadge } from '../perks'

export function useLevels() {
  const { idx } = useStore()
  return useMemo(() => computeLevels(idx), [idx])
}

export function LevelPill({ level, big }) {
  return <span className={`lvl-pill ${big ? 'big' : ''}`}>{level}</span>
}

function Bar({ value, color }) {
  return <span className="lv-bar"><span style={{ width: `${Math.max(3, Math.min(100, value * 100))}%`, '--c': color }} /></span>
}

export function CrewLevels() {
  const { me } = useStore()
  const levels = useLevels()
  const list = [...levels.values()].sort((a, b) => b.xp - a.xp)
  return (
    <Section title="ليفلات الشلة">
      <ol className="lv-list">
        {list.map(l => (
          <li key={l.player.id} className={l.player.id === me?.id ? 'mine' : ''}>
            <a href={`#/player/${l.player.id}`}>
              <span className="lv-av"><Avatar player={l.player} size={38} /><LevelPill level={l.level} /></span>
              <span className="lv-main">
                <span className="lv-top"><b>{l.player.name}</b><small>{l.title}</small></span>
                <Bar value={l.progress} color={l.player.color} />
              </span>
              <span className="lv-xp"><b>{l.xp}</b><small>XP</small></span>
            </a>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function AchList() {
  const { me } = useStore()
  const levels = useLevels()
  const list = [...levels.values()]
  const mine = me ? levels.get(me.id) : null
  const achs = (mine ? mine.achievements : list[0]?.achievements || [])
  const done = achs.filter(a => mine && a.done).length
  return (
    <Section title="الإنجازات" action={mine && <span className="muted small">{done} من {achs.length}</span>}>
      <div className="ach-grid">
        {[...achs].sort((a, b) => (mine ? (b.done - a.done) : 0)).map(a => {
          const who = list.filter(l => l.achievements.find(x => x.id === a.id)?.done)
          return (
            <div key={a.id} className={`ach ${mine && a.done ? 'done' : ''}`}>
              <span className="ach-icon">{a.icon}</span>
              <b>{a.name}</b>
              <small>{a.desc}</small>
              <em>+{a.xp} XP</em>
              {mine && !a.done && a.progress && <span className="ach-prog"><Bar value={a.progress[0] / a.progress[1]} color={me.color} /><small>{Math.min(a.progress[0], a.progress[1])}/{a.progress[1]}</small></span>}
              {who.length > 0 && <span className="lr-avs">{who.map(l => <Avatar key={l.player.id} player={l.player} size={20} />)}</span>}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

export function XpHow() {
  return (
    <Section title="كيف تجمع XP">
      <ul className="xp-rules">
        {XP_RULES.map(r => <li key={r.id}><span>{r.icon}</span><span>{r.label}</span><b>+{r.xp}</b></li>)}
        <li><span>🏅</span><span>كل إنجاز تفتحه</span><b>+10 إلى 250</b></li>
      </ul>
      <div className="pad-x pad-b">
        <p className="hint">الليفل يقيس حضورك وتفاعلك، مو مهارتك. المهارة لها صفحة الترتيب.</p>
        <div className="lv-titles">{TITLES.map(([l, t]) => <span key={l}><b>{l}</b><TitleBadge title={t} small /><small>{xpFor(l)} XP</small></span>)}</div>
      </div>
    </Section>
  )
}
