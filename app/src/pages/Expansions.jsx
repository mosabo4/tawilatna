import { useState } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import { Avatar, Cover, Section, fmtScore } from '../ui'

export const DELTAS = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]
const sign = d => (d > 0 ? `+${fmtScore(d)}` : d < 0 ? `−${fmtScore(-d)}` : '0')
export const deltaText = sign

export function expStats(idx, exp) {
  const rs = (idx.expRatings || []).filter(r => r.expansion_id === exp.id)
  const avg = rs.length ? rs.reduce((s, r) => s + Number(r.delta), 0) / rs.length : null
  const plays = idx.plays.filter(p => p.expansions?.includes(exp.id)).length
  return { rs, avg, plays }
}

// قسم الإضافات في صفحة اللعبة الأصلية
export function ExpansionsSection({ game, baseAvg }) {
  const { idx, me, act } = useStore()
  const exps = idx.expansionsOf?.get(game.id) || []
  const [busy, setBusy] = useState(null)
  if (!exps.length) return null
  const rate = async (exp, d) => {
    setBusy(exp)
    try { await act((p, pin) => api.setExpRating(p, pin, exp, d)) } catch { /* toast */ } finally { setBusy(null) }
  }
  return (
    <Section title={`الإضافات (${exps.length})`}>
      <ul className="exp-list">
        {exps.map(e => {
          const s = expStats(idx, e)
          const mine = me ? s.rs.find(r => r.player_id === me.id)?.delta : undefined
          const combined = baseAvg != null && s.avg != null ? Math.max(1, Math.min(10, baseAvg + s.avg)) : null
          return (
            <li key={e.id} className="exp">
              <div className="exp-head">
                <Cover game={e} className="sm" />
                <div className="exp-info">
                  <b>{e.name}</b>
                  <small>{s.plays ? `انلعبت في ${s.plays} قيم` : 'ما انلعبت للحين'}</small>
                </div>
                <div className={`exp-delta ${s.avg > 0 ? 'up' : s.avg < 0 ? 'down' : ''}`}>
                  <b>{s.avg != null ? sign(Math.round(s.avg * 10) / 10) : '—'}</b>
                  <small>{combined != null ? `معها ${fmtScore(Math.round(combined * 10) / 10)}` : s.rs.length ? '' : 'ما أحد قيّمها'}</small>
                </div>
              </div>
              {s.rs.length > 0 && (
                <div className="exp-votes">{s.rs.map(r => <span key={r.player_id}><Avatar player={idx.playersById.get(r.player_id)} size={20} />{sign(Number(r.delta))}</span>)}</div>
              )}
              {me && (
                <div className="exp-rate">
                  <span className="muted small">وش تضيف للعبة؟</span>
                  <div className="exp-scale" role="radiogroup" aria-label={`تقييم ${e.name}`}>
                    {DELTAS.map(d => (
                      <button key={d} role="radio" aria-checked={Number(mine) === d} disabled={busy === e.id}
                        className={`${Number(mine) === d ? 'on' : ''} ${d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero'}`}
                        onClick={() => rate(e.id, Number(mine) === d ? null : d)}>{sign(d)}</button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="hint pad-x pad-b">قيّم اللعبة الأصلية فوق، وهنا حط كم الإضافة تزيدها أو تنقصها. مثلاً +1 يعني اللعبة معها أحلى بدرجة.</p>
    </Section>
  )
}

// شارات الإضافات على بطاقة القيم
export function ExpTags({ play }) {
  const { idx } = useStore()
  if (!play.expansions?.length) return null
  return <span className="exp-tags">{play.expansions.map(id => idx.gamesById.get(id)).filter(Boolean).map(g => <span key={g.id}>+ {g.name.replace(/^.*?:\s*/, '')}</span>)}</span>
}
