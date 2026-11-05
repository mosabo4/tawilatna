import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { standings, counts, PRIOR } from '../stats'
import { CATEGORIES } from '../categories'
import { Avatar, Section } from '../ui'

const num = x => (Number.isInteger(x) ? x : x.toFixed(1))

export function StandingRows({ rows, me, compact }) {
  const played = rows.filter(r => r.plays > 0)
  const idle = rows.filter(r => r.plays === 0)
  return (
    <>
      <ol className={`standings ${compact ? 'compact' : ''}`}>
        {played.map((r, i) => (
          <li key={r.player.id} className={r.player.id === me?.id ? 'mine' : ''}>
            <a href={`#/player/${r.player.id}`}>
              <span className={`st-rank r${i + 1}`}>{i + 1}</span>
              <Avatar player={r.player} size={compact ? 30 : 38} />
              <span className="st-main">
                <b>{r.player.name}</b>
                <small>
                  <span title="عدد اللاعبين اللي خلّص قدّامهم">⭐ {num(r.beat)} نقطة من {r.faced}</span>
                  <span title="عدد الأقيام اللي فاز فيها">🏆 فاز {r.wins} من {r.plays}</span>
                </small>
              </span>
              <span className="st-level"><b>{r.points}</b><small>المستوى</small></span>
            </a>
          </li>
        ))}
      </ol>
      {idle.length > 0 && <p className="st-idle">ما لعبوا هنا للحين: {idle.map(r => r.player.name).join('، ')}</p>}
    </>
  )
}

export default function Ranking() {
  const { idx, me } = useStore()
  const [cat, setCat] = useState('all')
  const cats = useMemo(() => {
    const used = new Map()
    for (const p of idx.plays) {
      const g = idx.gamesById.get(p.game_id)
      if (counts(p, g) && g?.category) used.set(g.category, (used.get(g.category) || 0) + 1)
    }
    return CATEGORIES.filter(c => used.has(c.id)).map(c => ({ ...c, n: used.get(c.id) }))
  }, [idx])
  const total = useMemo(() => idx.plays.filter(p => counts(p, idx.gamesById.get(p.game_id))).length, [idx])
  const rows = useMemo(() => standings(idx, cat === 'all' ? undefined : (p, g) => g?.category === cat), [idx, cat])
  const top = rows.find(r => r.plays > 0)

  const [a, setA] = useState(me?.id || idx.players[0]?.id || '')
  const [b, setB] = useState(() => idx.players.find(p => p.id !== (me?.id || idx.players[0]?.id))?.id || '')

  return (
    <div className="page">
      <header className="page-head"><h1>الترتيب</h1><span className="count">{total} قيم محسوب</span></header>
      <div className="stack">
        <div className="chips-scroll" role="tablist">
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')} role="tab" aria-selected={cat === 'all'}>العام <small>{total}</small></button>
          {cats.map(c => (
            <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)} role="tab" aria-selected={cat === c.id} style={{ '--t': c.tone }}>
              <i className="dot" />{c.name} <small>{c.n}</small>
            </button>
          ))}
        </div>

        <Section title={cat === 'all' ? 'ترتيب الشلة' : `ترتيب ${CATEGORIES.find(c => c.id === cat)?.name}`}>
          {top ? <StandingRows rows={rows} me={me} /> : <p className="muted pad">ما فيه أقيام محسوبة هنا للحين.</p>}
        </Section>

        <Section title="كيف ينحسب الترتيب؟" className="how">
          <div className="pad-x pad-b how-body">
            <h3>⭐ النقاط</h3>
            <p>في كل قيم تاخذ <b>نقطة عن كل لاعب خلّصت قدّامه</b>. في قيم من 5: الأول ياخذ 4، الثاني 3، الثالث 2، الرابع 1، والأخير 0. ولو تعادلت مع أحد تاخذ نص نقطة.</p>
            <p>يعني الفوز في قيم كبير يعطي أكثر من الفوز في قيم من شخصين، واللي يجي ثاني ياخذ حقه.</p>

            <h3>📊 المستوى (هو اللي نرتب فيه)</h3>
            <p>المستوى = نقاطك ÷ كل اللي لعبت ضدهم. لو غلبت 30 من 40 خصم، مستواك 75%.</p>
            <p>بس فيه مشكلة: اللي لعب قيم واحد وفاز فيه يصير 100% ويتصدر بالحظ. عشان كذا <b>كل واحد يبدأ وكأنه لعب ضد {PRIOR} خصوم وغلب نصهم</b>. هذي الـ{PRIOR} تسحب اللي لعب قليل للنص، واللي لعب كثير ما تأثر عليه تقريباً.</p>
            <div className="how-ex">
              <div><span>فاز في قيم واحد من 4</span><b>3 من 3</b><i>بدون تعديل 100%</i><em>(3+5) ÷ (3+10) = 62</em></div>
              <div><span>لعب كثير وغلب أغلب الناس</span><b>30 من 40</b><i>بدون تعديل 75%</i><em>(30+5) ÷ (40+10) = 70</em></div>
            </div>
            <p className="muted small">فاللي أثبت نفسه ضد 40 خصم يتقدم على اللي فاز مرة وحدة. وكل ما لعب الثاني أكثر، يبان مستواه الحقيقي.</p>

            <h3>🏆 الفوز</h3>
            <p>«فاز 2 من 6» يعني لعب 6 أقيام وجاء الأول في 2. للمعلومية بس، ما يدخل في الترتيب.</p>

            <h3>🗂️ التصانيف</h3>
            <p>كل تصنيف له ترتيب خاص يحسب أقيامه بس، عشان تعرفون مين ملك الاستراتيجية ومين ملك الألعاب السريعة. والألعاب التعاونية ما تدخل لأن ما فيها أحد يغلب أحد.</p>
          </div>
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
