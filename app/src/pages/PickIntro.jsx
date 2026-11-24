import { useState } from 'react'

// شاشة الشرح: تطلع أول مرة يدخل اللاعب صفحة الترشيح. كل بطاقة نقطة + مقطع متحرك بسيط (CSS)
const key = id => `tawilatna-pickintro-v1-${id}`
export const introSeen = id => { try { return !!localStorage.getItem(key(id)) } catch { return true } }
const mark = id => { try { localStorage.setItem(key(id), '1') } catch { /* ignore */ } }

const Card = ({ c, n, children }) => <i className={`pi-card c${n}`} style={{ '--c': c }}>{children}</i>

const STEPS = [
  {
    t: 'النظام يرشّح لك 3 ألعاب', d: 'ألعاب ما جرّبها أحد من العيال للحين. ما تحتاج تدوّر ولا تقترح، تجيك جاهزة.',
    scene: () => (
      <div className="pi-row">
        {['#5B7CFF', '#F2B33D', '#2FB36B'].map((c, i) => <Card key={c} c={c} n={i}><span>🎲</span></Card>)}
      </div>
    ),
  },
  {
    t: 'عندك 12 نقطة بس', d: 'الكل نفس الرصيد. توزّعه على اللي تبي تلعبه: كل ما رفعت لعبة فوق، أخذت نقاط أكثر.',
    scene: () => (
      <div className="pi-coins">
        {Array.from({ length: 12 }, (_, i) => <b key={i} style={{ '--i': i }} />)}
        <em>12</em>
      </div>
    ),
  },
  {
    t: 'رتّب اختياراتك', d: 'اضغط اللعبة الأولى اللي تبيها، وبعدها الثانية، وبعدها الثالثة. ثلاث ألعاب تاخذ 6 و4 و2.',
    scene: () => (
      <div className="pi-row">
        {[['#5B7CFF', '🥇', 6], ['#F2B33D', '🥈', 4], ['#2FB36B', '🥉', 2]].map(([c, m, p], i) => (
          <Card key={c} c={c} n={i}><span className="pi-pick" style={{ '--d': `${i * 0.9}s` }}>{m}<small>{p}</small></span></Card>
        ))}
      </div>
    ),
  },
  {
    t: 'الخيار الرابع: رشّحوا غيرها', d: 'ما عجبتك الألعاب؟ حط لها «إعادة ترشيح» مثل أي لعبة. إذا اتفق عليها أكثر من نص النقاط، تتبدّل الألعاب كلها.',
    scene: () => (
      <div className="pi-redo">
        <div className="pi-bar"><i /><u /></div>
        <div className="pi-row"><Card c="#5B7CFF" n={0}><span>🎲</span></Card><Card c="#8892a6" n={1}><span className="pi-spin">🔄</span></Card></div>
        <small>51%</small>
      </div>
    ),
  },
  {
    t: 'المقاعد تقول مين الفايز', d: 'كل نقطة تصير مقعد في القوس. اللعبة الأكثر مقاعد تتصدر، ولو تعادلت تفوز اللي أكثر ناس حطّوها أولى.',
    scene: () => (
      <svg className="pi-hemi" viewBox="0 0 200 106" aria-hidden="true">
        {Array.from({ length: 36 }, (_, i) => {
          const a = Math.PI * (1 - i / 35), r = 70 + (i % 3) * 9
          const c = i < 15 ? '#5B7CFF' : i < 26 ? '#F2B33D' : '#2FB36B'
          return <circle key={i} cx={100 + r * Math.cos(a)} cy={100 - r * Math.sin(a)} r="4.2" fill={c} style={{ animationDelay: `${i * 0.06}s` }} />
        })}
      </svg>
    ),
  },
  {
    t: 'جوائز المستوى تفيدك هنا', d: 'ترجيح التعادل، هدية نقاط، مضاعفة الأولى، نقاط سالبة، فيتو، لعبة افتتاح. تلقاها تحت الورقة وتنفتح كل ما طلع مستواك.',
    scene: () => (
      <div className="pi-perks">{['⚖️', '🎁', '✌️', '🧨', '🚫', '🎬'].map((e, i) => <span key={e} style={{ '--i': i }}>{e}</span>)}</div>
    ),
  },
]

export default function PickIntro({ playerId, onClose }) {
  const [i, setI] = useState(0)
  const s = STEPS[i], last = i === STEPS.length - 1
  const close = () => { mark(playerId); onClose() }
  return (
    <div className="pi-wrap" role="dialog" aria-modal="true" aria-label="شرح الترشيح">
      <div className="pi-box">
        <button type="button" className="pi-skip" onClick={close}>تخطّي</button>
        <div className="pi-scene" key={i}>{s.scene()}</div>
        <h3>{s.t}</h3>
        <p>{s.d}</p>
        <div className="pi-dots">{STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}</div>
        <div className="pi-act">
          {i > 0 && <button type="button" className="btn small ghost" onClick={() => setI(i - 1)}>السابق</button>}
          <button type="button" className="btn primary" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'يلا نصوّت' : 'التالي'}</button>
        </div>
      </div>
    </div>
  )
}
