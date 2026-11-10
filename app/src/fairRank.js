// الترتيب العادل: النسبة (كم غلبت من اللي لعبت ضدهم) بعد تعديلات تخلّيه ما يفضّل أكثر واحد لعب ولا أقل واحد
//  1) تخفيف الزمن: القيمات القديمة يخف وزنها (النص كل HALF يوم).
//  2) ساعة المجموعة: العمر يُحسب من آخر قيم لعبناه كلنا، مو من اليوم. فلو أخذنا إجازة ما ينزّل أحد.
//  3) وزن ابتدائي: النسبة تتسحب نحو 50% لين يتراكم لعب كافي (ما يتصدر من لعب قيمين).
//  4) قوة الخصم: الفوز على الأقوى يوزن أكثر شوي (±25%)، والخسارة قدام الأضعف تكلّف أكثر.
//  5) «مؤقت»: اللي لعبه المؤثر قليل نعلّمه إن رقمه مو ثابت بعد.
export const FAIR = { half: 60, prior: 4, strength: 50, clock: true, solid: 6 }

const dayMs = 864e5
const toT = d => new Date(String(d).slice(0, 10) + 'T12:00:00').getTime()

// plays: أقيام محسوبة (فيها results). يرجّع Map: player_id -> { points, eff, provisional, plays }
export function fairScores(plays, opt = {}) {
  const o = { ...FAIR, ...opt }
  const ref = o.clock && plays.length ? Math.max(...plays.map(p => toT(p.played_on))) : Date.now()
  const pairs = []
  const pc = new Map()
  for (const p of plays) {
    if (p.results.length < 2) continue
    const w = Math.pow(0.5, Math.max(0, (ref - toT(p.played_on)) / dayMs) / o.half)
    for (const r of p.results) {
      pc.set(r.player_id, (pc.get(r.player_id) || 0) + 1)
      for (const x of p.results) if (x !== r) pairs.push({ a: r.player_id, b: x.player_id, sc: x.position > r.position ? 1 : x.position === r.position ? 0.5 : 0, w })
    }
  }
  let s = new Map([...pc.keys()].map(id => [id, 0.5]))
  const eff = new Map()
  for (const pr of pairs) eff.set(pr.a, (eff.get(pr.a) || 0) + pr.w)
  const k = o.strength / 100
  for (let it = 0; it < (k > 0 ? 4 : 1); it++) {
    const num = new Map(), den = new Map()
    for (const pr of pairs) {
      const m = Math.max(0.3, 1 + k * 0.5 * ((s.get(pr.b) ?? 0.5) - 0.5) * 2)
      // الفوز يوزن بقوة الخصم، والخسارة بعكسها (خسارة قدام الأضعف أثقل)، والتعادل بوزن عادي
      const wt = pr.sc === 1 ? m : pr.sc === 0 ? 2 - m : 1
      num.set(pr.a, (num.get(pr.a) || 0) + pr.sc * pr.w * wt)
      den.set(pr.a, (den.get(pr.a) || 0) + pr.w * wt)
    }
    const nx = new Map()
    for (const id of pc.keys()) nx.set(id, ((num.get(id) || 0) + o.prior * 0.5) / ((den.get(id) || 0) + o.prior))
    s = nx
  }
  const out = new Map()
  for (const [id, v] of s) out.set(id, { points: Math.round(v * 100), eff: eff.get(id) || 0, provisional: (eff.get(id) || 0) < o.solid, plays: pc.get(id) || 0 })
  return out
}
