import { usePerks } from '../perks'
import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { standings, counts } from '../stats'
import { CATEGORIES } from '../categories'
import { Avatar, Section } from '../ui'

// صف لكل لاعب: مركزه، اسمه، شريط المستوى، وكم فاز
export function StandingRows({ rows, me }) {
  const { look } = usePerks()
  const played = rows.filter(r => r.plays > 0)
  const idle = rows.filter(r => r.plays === 0)
  return (
    <>
      <ol className="standings">
        {played.map((r, i) => (
          <li key={r.player.id} className={r.player.id === me?.id ? 'mine' : ''}>
            <a href={`#/player/${r.player.id}`}>
              <span className={`st-rank r${i + 1}`}>{i + 1}</span>
              <Avatar player={r.player} size={32} />
              <span className="st-main">
                <span className="st-top"><b className={look(r.player.id).nameFx ? 'name-fx' : ''}>{r.player.name}{look(r.player.id).badge && <i className="nm-badge">{look(r.player.id).badge.icon}</i>}</b><small>🏆 {r.wins} من {r.plays}{r.provisional ? ' · مؤقت' : ''}</small></span>
                {look(r.player.id).caption && <span className="st-cap">💬 «{look(r.player.id).caption.data?.text}»</span>}
                <span className="st-bar"><span style={{ width: `${Math.max(r.points, 3)}%`, '--c': r.player.color }} /></span>
              </span>
              <b className="st-pct">{r.points}<small>%</small></b>
            </a>
          </li>
        ))}
      </ol>
      {idle.length > 0 && <p className="st-idle">ما لعبوا للحين: {idle.map(r => r.player.name).join('، ')}</p>}
    </>
  )
}

export default function Ranking() {
  const { idx, me } = useStore()
  const [cat, setCat] = useState('all')

  // ملك كل تصنيف = أكثر واحد فاز فيه
  const kings = useMemo(() => CATEGORIES.filter(c => c.id !== 'coop').map(c => {
    const rows = standings(idx, (p, g) => g?.category === c.id, { fair: true }).filter(r => r.plays > 0)
    const plays = idx.plays.filter(p => { const g = idx.gamesById.get(p.game_id); return g?.category === c.id && counts(p, g) }).length
    const top = Math.max(0, ...rows.map(r => r.wins))
    return { ...c, plays, top, leaders: top ? rows.filter(r => r.wins === top) : [] }
  }), [idx])
  const total = useMemo(() => idx.plays.filter(p => counts(p, idx.gamesById.get(p.game_id))).length, [idx])
  const rows = useMemo(() => standings(idx, cat === 'all' ? undefined : (p, g) => g?.category === cat, { fair: true }), [idx, cat])
  const current = CATEGORIES.find(c => c.id === cat)

  const [a, setA] = useState(me?.id || idx.players[0]?.id || '')
  const [b, setB] = useState(() => idx.players.find(p => p.id !== (me?.id || idx.players[0]?.id))?.id || '')

  return (
    <div className="page">
      <div className="stack">
        <p className="muted small sub-count">{total} قيم محسوب في الترتيب</p>
        <Section
          title={cat === 'all' ? 'ترتيب العيال' : current?.name}
          action={cat !== 'all' && <button className="link-btn" onClick={() => setCat('all')}>رجوع للعام</button>}
        >
          {rows.some(r => r.plays > 0)
            ? <StandingRows rows={rows} me={me} />
            : <p className="muted pad">ما فيه أقيام هنا للحين.</p>}
          <details className="how-mini">
            <summary>وش يعني الرقم؟</summary>
            <p>الرقم = <b>كم شخص غلبت من كل اللي لعبت ضدهم</b>. في قيم من 5، الأول غلب 4 والثاني غلب 3 وهكذا. لو غلبت 30 من 40، رقمك قريب من 75%.</p>
            <p>⚖️ الترتيب عادل: ما يفضّل أكثر واحد لعب ولا أقل واحد. القيمات القديمة يخف وزنها (النص كل شهرين)، فمن وقف لعب ينزل تدريجياً. واللي لعبه قليل يتسحب رقمه نحو 50% وتشوف جنب اسمه «مؤقت» لين يثبت. والفوز على الأقوى يوزن أكثر شوي. وإذا كلنا وقفنا لعب (إجازة) ما ينزّل أحد.</p>
            <p>🏆 = كم قيم جيت فيه الأول. الألعاب التعاونية ما تدخل.</p>
          </details>
        </Section>

        <Section title="ملوك التصانيف">
          <div className="kings">
            {kings.map(k => (
              <button key={k.id} className={`king ${cat === k.id ? 'on' : ''}`} style={{ '--t': k.tone }} onClick={() => setCat(cat === k.id ? 'all' : k.id)} disabled={!k.plays}>
                <span className="k-cat"><i className="dot" />{k.name}</span>
                {k.leaders.length ? (
                  <>
                    <span className="k-who">
                      <span className="k-avs">{k.leaders.slice(0, 3).map(r => <Avatar key={r.player.id} player={r.player} size={26} />)}</span>
                      <b>{k.leaders.map(r => r.player.name).join(' و')}</b>
                    </span>
                    <small>👑 {k.top} فوز من {k.plays} قيم</small>
                  </>
                ) : <small className="muted">ما انلعبت للحين</small>}
              </button>
            ))}
          </div>
          <p className="hint pad-x pad-b">اضغط على تصنيف عشان تشوف ترتيبه.</p>
        </Section>

        {idx.players.length > 1 && (
          <Section title="مين يغلب مين؟">
            <div className="vs-pick pad-x">
              <select className="input" value={a} onChange={e => setA(e.target.value)} aria-label="اللاعب الأول">
                {idx.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="vs-x">ضد</span>
              <select className="input" value={b} onChange={e => setB(e.target.value)} aria-label="اللاعب الثاني">
                {idx.players.filter(p => p.id !== a).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="pad-x pad-b"><button className="btn primary wide" disabled={!a || !b || a === b} onClick={() => go(`/vs/${a}/${b}`)}>قارن</button></div>
          </Section>
        )}
      </div>
    </div>
  )
}
