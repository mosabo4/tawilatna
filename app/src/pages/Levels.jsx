import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { computeLevels, REWARDS, XP_RULES, TITLES, xpFor } from '../levels'
import { Avatar, Section } from '../ui'
import { usePerks, TitleBadge } from '../perks'

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

export default function Levels() {
  const { me } = useStore()
  const { active } = usePerks()
  const levels = useLevels()
  const list = [...levels.values()].sort((a, b) => b.xp - a.xp)
  const mine = me ? levels.get(me.id) : null
  const [tab, setTab] = useState('rewards')
  const byLevel = [...new Set(REWARDS.map(r => r.level))].map(l => ({ level: l, items: REWARDS.filter(r => r.level === l) }))

  return (
    <div className="page">
      <div className="stack">
        {mine && (
          <div className="glass lv-me">
            <div className="lv-me-av"><Avatar player={me} size={72} /><LevelPill level={mine.level} big /></div>
            <div className="lv-me-info">
              <small>ليفل {mine.level} · {mine.title}</small>
              {active.title ? <TitleBadge title={active.title} /> : <strong>{me.name}</strong>}
              <Bar value={mine.progress} color={active.color || me.color} />
              <span className="lv-me-xp">باقي {mine.need - mine.into} XP على ليفل {mine.level + 1}</span>
              <a className="lv-closet" href="#/me/closet">🎁 خزانة جوائزك وشخصيتك ←</a>
            </div>
          </div>
        )}

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

        <div className="seg" role="tablist">
          {[['rewards', 'الجوائز'], ['ach', 'الإنجازات'], ['how', 'كيف أجمع XP']].map(([k, t]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
          ))}
        </div>

        {tab === 'rewards' && (
          <Section title="وش ينفتح مع كل ليفل">
            <ol className="lv-road">
              {byLevel.map(g => {
                const have = list.filter(l => l.level >= g.level)
                const open = mine && mine.level >= g.level
                return (
                  <li key={g.level} className={open ? 'open' : ''}>
                    <span className="lr-lvl">{g.level}</span>
                    <div className="lr-body">
                      {g.items.map(r => <div key={r.name} className="lr-item"><b>{r.icon} {r.name}</b><p>{r.desc}</p></div>)}
                      <div className="lr-who">
                        {have.length ? <><span className="lr-avs">{have.map(l => <Avatar key={l.player.id} player={l.player} size={22} />)}</span><small>{have.length === list.length ? 'الكل وصل' : `وصلها ${have.length}`}</small></> : <small className="muted">ما أحد وصل للحين</small>}
                        {mine && !open && <small className="lr-left">باقي لك {xpFor(g.level) - mine.xp} XP</small>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {tab === 'ach' && (
          <Section title="الإنجازات">
            <div className="ach-grid">
              {(mine ? mine.achievements : list[0]?.achievements || []).map(a => {
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
        )}

        {tab === 'how' && (
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
        )}
      </div>
    </div>
  )
}
