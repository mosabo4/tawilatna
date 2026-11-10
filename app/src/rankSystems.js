// أنظمة ترتيب/مستوى بديلة للتجربة في المختبر (ما تأثر على الموقع الحقيقي)
import { counts } from './stats'

export const DEFAULTS = { half: 60, prior: 4, window: 10, k: 24 }

export const SYSTEMS = [
  { id: 'raw', icon: '📏', name: 'الحالي (النسبة الخام)', desc: 'كم غلبت من كل اللي لعبت ضدهم، بدون أي تعديل. اللي لعب قليل وفاز يقدر يتصدر، واللي وقف لعب يظل مكانه.', unit: '%' },
  { id: 'fair', icon: '⚖️', name: 'عادل (تخفيف + وزن ابتدائي)', desc: 'القيمات القديمة يخف وزنها مع الوقت، والنسبة تتسحب نحو 50% لين يتراكم لعب كافي. ما يفضّل أكثر واحد لعب ولا أقل واحد.', unit: '%', params: ['half', 'prior'] },
  { id: 'decay', icon: '⏳', name: 'تخفيف الزمن بس', desc: 'القيمات الأقدم وزنها أقل، بدون سحب نحو الوسط. اللي وقف يبقى رقمه ثابت (النسبة ما تتغير)، لكن آخر القيمات تأثيرها أكبر.', unit: '%', params: ['half'] },
  { id: 'prior', icon: '🧮', name: 'وزن ابتدائي بس', desc: 'تسحب النسبة نحو 50% لين يتراكم لعب، بدون اعتبار للزمن. يحمي من اللي لعب قليل وفاز، لكنه ما ينزّل المتوقف.', unit: '%', params: ['prior'] },
  { id: 'form', icon: '🔥', name: 'آخر القيمات (الفورمة)', desc: 'نسبتك في آخر N قيم لعبتها بس. اللي يلعب ويفوز الحين يتصدر، وكل واحد يتساوى بعدد القيمات المحسوبة.', unit: '%', params: ['window'] },
  { id: 'elo', icon: '♟️', name: 'إيلو (Elo)', desc: 'كل قيم تحرّك رقمك حسب قوة اللي غلبتهم: الفوز على القوي يعطي أكثر. الكل يبدأ 1000.', unit: '', params: ['k'] },
  { id: 'elo_idle', icon: '🕰️', name: 'إيلو + خمول', desc: 'نفس إيلو، لكن اللي يوقف لعب يرجع رقمه نحو 1000 تدريجياً (نصف الفرق كل فترة).', unit: '', params: ['k', 'half'] },
]

const ageDays = d => Math.max(0, (Date.now() - new Date(d + 'T12:00:00').getTime()) / 864e5)

function pairwise(r, o) { return o.position > r.position ? 1 : o.position === r.position ? 0.5 : 0 }

export function compute(id, idx, opt = {}) {
  const o = { ...DEFAULTS, ...opt }
  const plays = [...idx.plays].filter(p => counts(p, idx.gamesById.get(p.game_id))).sort((a, b) => a.played_on.localeCompare(b.played_on) || (a.created_at || '').localeCompare(b.created_at || ''))
  const acc = new Map(idx.players.map(p => [p.id, { player: p, plays: 0, wins: 0, b: 0, f: 0, bW: 0, fW: 0, last: null, perPlay: [], elo: 1000 }]))
  for (const p of plays) {
    const w = Math.pow(0.5, ageDays(p.played_on) / o.half)
    const n = p.results.length
    const delta = new Map()
    for (const r of p.results) {
      const s = acc.get(r.player_id); if (!s) continue
      s.plays++; if (r.position === 1) s.wins++; s.last = p.played_on
      let b = 0
      for (const x of p.results) if (x !== r) {
        const sc = pairwise(r, x); b += sc; s.b += sc; s.f++; s.bW += sc * w; s.fW += w
        const ex = 1 / (1 + Math.pow(10, ((acc.get(x.player_id)?.elo ?? 1000) - s.elo) / 400))
        delta.set(r.player_id, (delta.get(r.player_id) || 0) + (o.k / (n - 1)) * (sc - ex))
      }
      s.perPlay.push([b, n - 1])
    }
    for (const [pid, d] of delta) acc.get(pid).elo += d
  }
  const rows = [...acc.values()].filter(s => s.plays > 0 && s.f > 0).map(s => {
    let v
    if (id === 'raw') v = (s.b / s.f) * 100
    else if (id === 'fair') v = ((s.bW + o.prior * 0.5) / (s.fW + o.prior)) * 100
    else if (id === 'decay') v = (s.bW / s.fW) * 100
    else if (id === 'prior') v = ((s.b + o.prior * 0.5) / (s.f + o.prior)) * 100
    else if (id === 'form') { const last = s.perPlay.slice(-o.window); v = (last.reduce((t, x) => t + x[0], 0) / last.reduce((t, x) => t + x[1], 0)) * 100 }
    else if (id === 'elo') v = s.elo
    else v = 1000 + (s.elo - 1000) * Math.pow(0.5, ageDays(s.last) / o.half)
    return { player: s.player, value: v, plays: s.plays, wins: s.wins, last: s.last, days: Math.round(ageDays(s.last)) }
  })
  rows.sort((a, b) => b.value - a.value || b.wins - a.wins)
  rows.forEach((r, i) => { r.rank = i + 1 })
  return rows
}
