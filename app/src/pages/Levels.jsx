import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { computeLevels, REWARDS, XP_RULES, TITLES, xpFor } from '../levels'
import { Avatar, Section } from '../ui'
import { usePerks, PALETTE, TEASES, PixelArt } from '../perks'

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

function Lock({ level, children, L }) {
  const open = L >= level
  return (
    <div className={`perk ${open ? '' : 'locked'}`}>
      <span className="perk-lvl">{open ? '✓' : `🔒 ${level}`}</span>
      <div className="perk-body">{children}</div>
    </div>
  )
}

function Closet({ mine }) {
  const { idx, me } = useStore()
  const { perks, set, level: L, realLevel, test } = usePerks()
  const titles = [...new Set([...['زائر الطاولة', 'لاعب جديد', 'من الشلة', 'صاحب حضور', 'لاعب ثابت', 'قلب الجلسة', 'محترف الطاولة', 'خبير الدولاب', 'شيخ اللعّيبة', 'أسطورة الطاولة'].slice(0, test ? 10 : realLevel), ...mine.achievements.filter(a => test || a.done).map(a => a.name)])]
  const myPosts = (idx.posts || []).filter(p => p.player_id === me.id)
  const tease = perks.tease && perks.tease.until > Date.now() ? perks.tease : null
  const weekLeft = perks.teaseAt && Date.now() - perks.teaseAt < 7 * 864e5 && !test
  return (
    <Section title="خزانة جوائزك" action={test && <span className="tag test-tag">🧪 وضع التجربة</span>}>
      {me.is_admin && (
        <label className="switch pad-x test-switch">
          <input type="checkbox" checked={!!perks.test} onChange={e => set({ test: e.target.checked })} />
          <span>🧪 وضع التجربة: افتح كل الجوائز لي بس (ليفلك الحقيقي {realLevel} ما يتغير)</span>
        </label>
      )}
      <div className="perks">
        <Lock level={2} L={L}>
          <b>🎨 لون حسابك</b>
          <div className="swatches">
            <button type="button" className={`sw none ${!perks.color ? 'on' : ''}`} onClick={() => set({ color: null })} aria-label="اللون الأصلي">↺</button>
            {PALETTE.map(c => <button type="button" key={c} className={`sw ${perks.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ color: c })} aria-label={c} />)}
          </div>
        </Lock>
        <Lock level={3} L={L}>
          <b>🏷️ لقبك</b>
          <select className="input" value={perks.title || ''} onChange={e => set({ title: e.target.value || null })}>
            <option value="">بدون لقب</option>
            {titles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Lock>
        <Lock level={4} L={L}>
          <b>🖼️ إطار صورتك</b>
          <div className="frames">
            {[['', 'بدون', 1], ['silver', 'فضي', 4], ['gold', 'ذهبي', 7], ['diamond', 'ماسي', 12]].map(([k, n, lv]) => (
              <button key={k} type="button" disabled={L < lv} className={(perks.frame || '') === k ? 'on' : ''} onClick={() => set({ frame: k || null })}>
                <span className="avatar-demo"><Avatar player={me} size={36} frame={k || null} /></span>{n}{L < lv && <small>ليفل {lv}</small>}
              </button>
            ))}
          </div>
        </Lock>
        <Lock level={4} L={L}><b>😂 ردود فعل</b><p>روح للوحة الشلة واضغط «+😀» تحت أي كتابة.</p></Lock>
        <Lock level={5} L={L}>
          <b>📌 تثبيت كتابة</b>
          {myPosts.length ? (
            <select className="input" value={perks.pinned || ''} onChange={e => set({ pinned: e.target.value || null })}>
              <option value="">بدون تثبيت</option>
              {myPosts.map(p => <option key={p.id} value={p.id}>{p.body.slice(0, 40)}</option>)}
            </select>
          ) : <p>اكتب شي في اللوحة أول، بعدين تقدر تثبّته.</p>}
        </Lock>
        <Lock level={6} L={L}>
          <b>😭 الطقطقة</b>
          {tease ? (
            <div className="tease-now">
              <Avatar player={idx.playersById.get(tease.target)} size={40} />
              <p>ملزّق على {idx.playersById.get(tease.target)?.name} لين {new Date(tease.until).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' })}</p>
              <button className="link-btn" onClick={() => set({ tease: null })}>شيلها</button>
            </div>
          ) : weekLeft ? <p>استخدمتها هالأسبوع. ترجع لك بعد {Math.ceil((7 * 864e5 - (Date.now() - perks.teaseAt)) / 864e5)} أيام.</p> : (
            <TeasePicker onPick={(target, art) => set({ tease: { target, art, until: Date.now() + 3 * 864e5 }, teaseAt: Date.now() })} />
          )}
        </Lock>
        <Lock level={8} L={L}><b>⚔️ تحدي رسمي</b><p>قريباً: تختار لاعب ولعبة، والقيم ينحسب في سجل التحديات.</p></Lock>
        <Lock level={9} L={L}><b>🎯 اقتراح مميز</b><p>قريباً: لعبة تثبّتها فوق قائمة الجلسة الجاية مرة بالشهر.</p></Lock>
        <Lock level={10} L={L}>
          <b>🌌 بروفايل أسطوري</b>
          <label className="switch"><input type="checkbox" checked={!!perks.legend} onChange={e => set({ legend: e.target.checked })} /><span>خلفية أسطورية لصفحتك واسمك بلون مميز</span></label>
        </Lock>
        <Lock level={15} L={L}><b>🏛️ صانع الجوائز</b><p>قريباً: تخترع جائزة تنضاف لملخص الشهر الجاي.</p></Lock>
      </div>
      <p className="hint pad-x pad-b">الجوائز حالياً تبان على جهازك بس. بعد ما نعتمدها نربطها بالقاعدة عشان يشوفها الكل.</p>
    </Section>
  )
}

function TeasePicker({ onPick }) {
  const { idx, me } = useStore()
  const [who, setWho] = useState('')
  const [art, setArt] = useState('cry')
  return (
    <div className="tease-pick">
      <select className="input" value={who} onChange={e => setWho(e.target.value)}>
        <option value="">اختر الضحية 😈</option>
        {idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="arts">{TEASES.map(t => <button key={t.id} type="button" className={art === t.id ? 'on' : ''} onClick={() => setArt(t.id)} title={t.name}><PixelArt id={t.id} size={28} /><small>{t.name}</small></button>)}</div>
      <button className="btn primary small" disabled={!who} onClick={() => onPick(who, art)}>لزّقها 3 أيام</button>
    </div>
  )
}

export default function Levels() {
  const { me } = useStore()
  const { active } = usePerks()
  const levels = useLevels()
  const list = [...levels.values()].sort((a, b) => b.xp - a.xp)
  const mine = me ? levels.get(me.id) : null
  const [tab, setTab] = useState('rewards')

  return (
    <div className="page">
      <header className="page-head"><h1>الليفلات</h1></header>
      <div className="stack">
        {mine && (
          <div className="glass lv-me">
            <div className="lv-me-av"><Avatar player={me} size={72} /><LevelPill level={mine.level} big /></div>
            <div className="lv-me-info">
              <small>ليفل {mine.level}</small>
              <strong>{active.title || mine.title}</strong>
              <Bar value={mine.progress} color={me.color} />
              <span className="lv-me-xp">باقي {mine.need - mine.into} XP على ليفل {mine.level + 1}</span>
              {mine.nextReward && <span className="lv-next">الجائزة الجاية: {mine.nextReward.icon} {mine.nextReward.name} في ليفل {mine.nextReward.level}</span>}
            </div>
          </div>
        )}

        {mine && <Closet mine={mine} />}

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
              {REWARDS.map(r => {
                const have = list.filter(l => l.level >= r.level)
                const open = mine && mine.level >= r.level
                return (
                  <li key={r.level} className={open ? 'open' : ''}>
                    <span className="lr-lvl">{r.level}</span>
                    <div className="lr-body">
                      <b>{r.icon} {r.name}</b>
                      <p>{r.desc}</p>
                      <div className="lr-who">
                        {have.length ? <><span className="lr-avs">{have.map(l => <Avatar key={l.player.id} player={l.player} size={22} />)}</span><small>{have.length === list.length ? 'الكل فتحها' : `فتحها ${have.length}`}</small></> : <small className="muted">ما أحد وصل لها للحين</small>}
                        {mine && !open && <small className="lr-left">باقي لك {xpFor(r.level) - mine.xp} XP</small>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="hint pad-x pad-b">🔧 الجوائز نفعّلها وحدة وحدة قريب. الليفلات نفسها تنحسب من الحين.</p>
          </Section>
        )}

        {tab === 'ach' && (
          <Section title="الإنجازات">
            <div className="ach-grid">
              {(mine ? mine.achievements : [...levels.values()][0]?.achievements || []).map(a => {
                const who = list.filter(l => l.achievements.find(x => x.id === a.id)?.done)
                return (
                  <div key={a.id} className={`ach ${mine ? (a.done ? 'done' : '') : ''}`}>
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
              <div className="lv-titles">{TITLES.map(([l, t]) => <span key={l}><b>{l}</b>{t}<small>{xpFor(l)} XP</small></span>)}</div>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
