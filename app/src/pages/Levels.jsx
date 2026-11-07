import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { computeLevels, XP_RULES, TITLES, xpFor } from '../levels'
import { GROUPS, TIER } from '../achievements'
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
  const achs = mine ? mine.achievements : list[0]?.achievements || []
  const [tab, setTab] = useState('near')
  const doneCount = id => list.filter(l => l.achievements.find(x => x.id === id)?.done).length
  const revealed = a => a.group !== 'secret' || doneCount(a.id) > 0
  const near = achs.filter(a => !a.maxed && a.progress && a.group !== 'secret' && a.group !== 'season').sort((a, b) => b.progress[0] / b.progress[1] - a.progress[0] / a.progress[1]).slice(0, 6)
  const shown = tab === 'near' ? near : achs.filter(a => a.group === tab)
  const totalXp = achs.reduce((t, a) => t + a.xp, 0)
  const doneN = achs.filter(a => a.done).length
  return (
    <Section title="الإنجازات" action={mine && <span className="muted small">{doneN} من {achs.length} · <bdi>{totalXp} XP</bdi></span>}>
      <div className="seg ach-tabs pad-x">
        {[['near', 'الأقرب لك'], ...GROUPS.map(g => [g.id, g.name])].map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      <div className="ach-list">
        {shown.map(a => {
          const who = list.filter(l => l.achievements.find(x => x.id === a.id)?.done)
          const hide = !revealed(a)
          return (
            <div key={a.id} className={`achx ${a.done ? 'done' : ''} ${a.maxed ? 'maxed' : ''} g-${a.group}`} style={a.tierInfo ? { '--tc': a.tierInfo.color } : null}>
              <span className="ax-ic">{hide ? '❓' : a.icon}{a.tierInfo && <i>{a.tierInfo.icon}</i>}</span>
              <div className="ax-main">
                <div className="ax-top">
                  <b>{hide ? '؟؟؟' : a.name}</b>
                  {a.group === 'tier' && <span className="ax-tiers">{Array.from({ length: a.tiers }, (_, i) => <i key={i} className={i < a.tier ? 'on' : ''} style={{ '--c': TIER[i].color }} />)}</span>}
                  {a.group === 'season' && a.times > 0 && <em className="ax-times">×{a.times}</em>}
                </div>
                <small>{hide ? 'إنجاز سري، ينكشف لما أحد يفتحه' : a.group === 'tier' && !a.maxed ? `الدرجة الجاية (${TIER[a.tier].name}): ${a.desc}` : a.desc}</small>
                {mine && !a.maxed && a.progress && !hide && <span className="pw-bar"><span className="trk"><i style={{ width: `${Math.min(100, (a.progress[0] / a.progress[1]) * 100)}%` }} /></span><em>{Math.min(a.progress[0], a.progress[1])}/{a.progress[1]}</em></span>}
                <span className="ax-foot">
                  <em className="ax-xp">{a.maxed ? `✓ ${a.xp} XP` : `+${a.nextXp} XP`}{a.group === 'tier' && a.xp > 0 && !a.maxed ? ` · أخذت ${a.xp}` : ''}</em>
                  <span className="ax-who">{who.length > 0 && <span className="lr-avs">{who.map(l => <Avatar key={l.player.id} player={l.player} size={18} />)}</span>}<small>{who.length} من {list.length}</small></span>
                </span>
              </div>
            </div>
          )
        })}
        {!shown.length && <p className="muted pad-x">ما فيه شي هنا للحين.</p>}
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
