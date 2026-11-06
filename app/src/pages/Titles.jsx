import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { computeTitles, RARITY } from '../titles'
import { Avatar, TopBar } from '../ui'
import { useLevels } from './Levels'
import { usePerks } from '../perks'

export default function Titles() {
  const { idx, me } = useStore()
  const levels = useLevels()
  const { perks, set, realLevel } = usePerks()
  const all = useMemo(() => computeTitles(idx, levels), [idx, levels])
  const [r, setR] = useState('all')
  const mine = me ? all.get(me.id) : all.get(idx.players[0]?.id)
  const owners = id => idx.players.filter(p => all.get(p.id).find(t => t.id === id)?.done)
  const list = mine.filter(t => r === 'all' || t.rarity === r).sort((a, b) => (b.done - a.done) || RARITY[b.rarity].order - RARITY[a.rarity].order)
  return (
    <div className="page">
      <TopBar title="الألقاب" backTo="/me" right={me && <span className="muted small">فتحت {mine.filter(t => t.done).length} من {mine.length}</span>} />
      <div className="stack">
        <div className="chips-scroll">
          <button className={`chip ${r === 'all' ? 'on' : ''}`} onClick={() => setR('all')}>الكل</button>
          {Object.entries(RARITY).reverse().map(([k, v]) => <button key={k} className={`chip ${r === k ? 'on' : ''}`} onClick={() => setR(k)}><i className="dot" style={{ background: v.dot }} />{v.name}</button>)}
        </div>
        {list.map(t => {
          const who = owners(t.id)
          const wearing = perks.title === t.name
          return (
            <div key={t.id} className={`tcard ${t.done ? '' : 'locked'} r-${t.rarity}`} style={{ '--f': t.from, '--t': t.to, '--r': t.ring }}>
              <span className="tc-icon">{t.icon}</span>
              <div className="tc-body">
                <div className="tc-top"><b>{t.name}</b><span className="tc-rar"><i style={{ background: RARITY[t.rarity].dot }} />{RARITY[t.rarity].name}{t.done ? ' · ✓' : ' · 🔒'}</span></div>
                <p>{t.desc}</p>
                {!t.done && t.target > 1 && <div className="tc-prog"><span className="tc-bar"><span style={{ width: `${(t.cur / t.target) * 100}%` }} /></span><small>{t.cur} / {t.target}</small></div>}
                <div className="tc-foot">
                  {who.length ? <span className="lr-avs">{who.map(p => <Avatar key={p.id} player={p} size={22} />)}</span> : <small>ما أحد فتحه للحين</small>}
                  {me && t.done && realLevel >= 3 && <button className={`tc-wear ${wearing ? 'on' : ''}`} onClick={() => set({ title: wearing ? null : t.name })}>{wearing ? '✓ لابسه' : 'البسه'}</button>}
                </div>
              </div>
            </div>
          )
        })}
        {me && realLevel < 3 && <p className="hint pad-x">تقدر تلبس لقب جنب اسمك من ليفل 3.</p>}
      </div>
    </div>
  )
}
