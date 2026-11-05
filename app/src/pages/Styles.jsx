import { useStore } from '../store'
import { Character } from '../characters'

const V = [['flat', '1. كرتون مسطّح', 'الحالي: ألوان صافية وخطوط ناعمة، بسيط وواضح'], ['sticker', '2. ستيكر لامع', 'إطار أبيض سميك وظل ولمعة، كأنها ملصقات'], ['doodle', '3. رسم يدوي', 'خطوط سوداء مهزوزة شوي، كأنها مرسومة بالقلم']]
export default function Styles() {
  const { idx } = useStore()
  const ps = ['مصعب', 'محمدي', 'معتز', 'هاني'].map(n => idx.players.find(p => p.name === n)).filter(Boolean)
  return (
    <div className="styles-page">
      {V.map(([v, t, d]) => (
        <section key={v} className={`sty sty-${v}`}>
          <h2>{t}</h2><p>{d}</p>
          <div className="sty-row">{ps.map((p, i) => <div key={p.id}><Character player={p} variant={v} size={110} pose={['idle', 'laugh', 'idle', 'cry'][i]} /><b>{p.name}</b></div>)}</div>
        </section>
      ))}
    </div>
  )
}
