// موازنة الـ XP (تجريبية للمختبر فقط): نفس محرك المستويات لكن بقيم قابلة للتغيير
import { computeLevels } from './levels'
import { resolveActions } from './actions'
import { achContext, defs, TIER_XP, GROUPS } from './achievements'

export const CATS = [
  { id: 'play', icon: '🎲', name: 'اللعب والحضور', color: '#3B82F6' },
  { id: 'win', icon: '🏆', name: 'الفوز والمنافسة', color: '#F2B33D' },
  { id: 'social', icon: '💬', name: 'التفاعل', color: '#2FB36B' },
  { id: 'help', icon: '🤝', name: 'مساعدة العيال والحظ', color: '#A35BFF' },
  { id: 'ach', icon: '🏅', name: 'الإنجازات', color: '#E5484D' },
]

// القيم الحالية في الموقع
export const CURRENT = {
  session: 30, play: 10, newgame: 40, rate: 10, comment: 5, picks: 5, post: 2, streak: 60, setup: 20, cleanup: 15, fullhouse: 20,
  thanks: 20, thankGive: 10, gift: 50, guarantee: 20, godfather: 20, predict: 15, predictDouble: 30, riskOk: 300, riskFail: -50,
  chalWin: 0, chalPart: 0, winMult: 1, winMin: 5, winMax: 40, tierPct: null, once: {}, season: {},
}
// المقترح
export const PROPOSED = {
  ...CURRENT,
  comment: 10, picks: 15, post: 5, setup: 30, cleanup: 20, fullhouse: 25, thanks: 25, thankGive: 15, guarantee: 30, godfather: 30,
  predict: 30, predictDouble: 60, riskOk: 150, chalWin: 30, chalPart: 10, winMult: 1.25, winMin: 10, winMax: 50, tierPct: 15,
  season: { champ: 200 },
}

// القواعد المسطّحة: id، الفئة، الاسم، الوصف، السبب
export const FLAT = [
  { id: 'session', cat: 'play', icon: '📅', label: 'حضور جلسة', why: 'ثابت: ساعات من وقتك كل جلسة.', part: 'session' },
  { id: 'play', cat: 'play', icon: '🎲', label: 'كل قيم تلعبه', why: 'ثابت: أساس كل شي، كل القيم تتقاس عليه.', part: 'play' },
  { id: 'newgame', cat: 'play', icon: '🆕', label: 'لعبة تجربها لأول مرة', why: 'ثابت: يشجّع التنويع.', part: 'newgame' },
  { id: 'streak', cat: 'play', icon: '🔥', label: 'كل 3 جلسات ورا بعض', why: 'ثابت.', part: 'streak' },
  { id: 'fullhouse', cat: 'play', icon: '👨‍👩‍👦', label: 'جلسة حضرتها العيال كاملة', why: 'رفعناها شوي: الجمعة الكاملة نادرة وتستاهل.', part: 'fullhouse' },
  { id: 'winMult', cat: 'win', icon: '🏆', label: 'الفوز: معامل الصعوبة×المدة', why: 'الفوز هو جوهر اللعبة وكان قريب من نقاط الحضور. رفعناه ×1.25.', part: 'win', step: 0.05 },
  { id: 'winMin', cat: 'win', icon: '⬇️', label: 'الفوز: أقل XP', why: 'فوز في لعبة خفيفة كان 5 بس، أقل من قيم عادي (10).', part: 'win' },
  { id: 'winMax', cat: 'win', icon: '⬆️', label: 'الفوز: أعلى XP', why: 'فوز في لعبة ثقيلة طويلة يستاهل أكثر.', part: 'win' },
  { id: 'chalWin', cat: 'win', icon: '⚔️', label: 'تحدي رسمي: فوز', why: 'التحديات ما تعطي XP أبداً (غير الإنجاز). خلّها تعطي.', part: 'chal' },
  { id: 'chalPart', cat: 'win', icon: '🥊', label: 'تحدي رسمي: مشاركة (للطرفين)', why: 'اللي يتحدى ويخسر يستاهل شي بسيط.', part: 'chal' },
  { id: 'predict', cat: 'win', icon: '🔮', label: 'توقّع صحيح للفايز', why: 'احتمال الصح ≈ 25%، فكان العائد المتوقع ≈ 4 XP. الحين يقرّب من فوز عادي.', part: 'predict' },
  { id: 'predictDouble', cat: 'win', icon: '🔮', label: 'توقّع صحيح (مضاعف، مستوى 15)', why: 'ضعف العادي.', part: 'predict' },
  { id: 'riskOk', cat: 'win', icon: '⚡', label: 'Double or Nothing: لو فزت', why: '+300 مع -50 بس = XP مجاني لكل مخاطر (+37 متوقع). 150 يخلّيها عادلة (صفر متوقع).', part: 'risk' },
  { id: 'riskFail', cat: 'win', icon: '⚡', label: 'Double or Nothing: لو خسرت', why: 'ثابت.', part: 'risk' },
  { id: 'rate', cat: 'social', icon: '⭐', label: 'تقييم لعبة', why: 'ثابت.', part: 'rate' },
  { id: 'comment', cat: 'social', icon: '💬', label: 'تعليق على لعبة', why: 'التعليق أصعب من التقييم (كتابة) ومع ذلك كان نصه.', part: 'comment' },
  { id: 'post', cat: 'social', icon: '📝', label: 'كتابة في اللوحة (3 باليوم)', why: '2 XP ما يحرّك أحد.', part: 'post' },
  { id: 'picks', cat: 'social', icon: '🙋', label: 'اختيار ألعاب للجلسة (مرة لكل جلسة)', why: 'يخدم الكل (يحدد وش نلعب)، وكان أقل من تقييم بس.', part: 'picks' },
  { id: 'setup', cat: 'help', icon: '🧱', label: 'تجهيز لعبة ثقيلة', why: 'شغل فعلي (10-15 دقيقة) وكان نص قيم.', part: 'setup' },
  { id: 'cleanup', cat: 'help', icon: '🧹', label: 'ترتيب لعبة ثقيلة', why: 'نفس السبب.', part: 'cleanup' },
  { id: 'thanks', cat: 'help', icon: '🙏', label: 'أحد يشكرك على التجهيز', why: 'تعزيز بسيط.', part: 'thanks' },
  { id: 'thankGive', cat: 'help', icon: '🤝', label: 'تشكر اللي جهّز', why: 'عشان الشكر ما يكون خسارة على الشاكر.', part: 'thankGive' },
  { id: 'gift', cat: 'help', icon: '🎁', label: 'هدية XP من واحد من العيال', why: 'ثابت.', part: 'gift' },
  { id: 'guarantee', cat: 'help', icon: '🛟', label: 'ضمان الخاسر', why: '20 ما يعوّض جلسة كاملة، رفعناها.', part: 'guarantee' },
  { id: 'godfather', cat: 'help', icon: '🤝', label: 'العرّاب: مكافأة العرّاب', why: 'يتعب مع التلميذ، 20 قليلة.', part: 'godfather' },
]
// قواعد ما تتعدّل بس تنحسب: الصندوق والحظ
export const AUTO = [
  { cat: 'help', part: 'luckbox', icon: '🎁', label: 'صندوق الحظ (عشوائي 0-60)' },
  { cat: 'help', part: 'box', icon: '💰', label: 'صندوق العيال (تنقل XP بين اللاعبين)' },
  { cat: 'help', part: 'lucky', icon: '🍀', label: 'فوز «بالحظ» (يقلّل نص XP الفوز)' },
]
// وحدة الجهد لكل سلّم إنجازات (XP تقريبي لكل خطوة)، واللي مو فيها يظل بالقيم القديمة
const UNIT = { explore: 50, attend: 70, wins: 25, critic: 10, talk: 10, setup: 30, oracle: 30, duelist: 40 }
const r5 = n => Math.round(n / 5) * 5

export function toOpts(c, tiers) {
  const xp = {}; FLAT.forEach(f => { if (CURRENT[f.id] !== undefined && f.id in { session: 1, play: 1, newgame: 1, rate: 1, comment: 1, picks: 1, post: 1, streak: 1, setup: 1, cleanup: 1, fullhouse: 1 }) xp[f.id] = c[f.id] })
  const o = {
    xp, win: { mult: c.winMult, min: c.winMin, max: c.winMax },
    act: { predict: c.predict, predictDouble: c.predictDouble, riskOk: c.riskOk, riskFail: c.riskFail, guarantee: c.guarantee, godfather: c.godfather, gift: c.gift, thanks: c.thanks, thankGive: c.thankGive },
    chal: { chalWin: c.chalWin, chalPart: c.chalPart }, once: c.once || {}, season: c.season || {},
  }
  if (c.tierPct && tiers) o.tier = tierRewards(tiers, c.tierPct)
  return o
}
// مكافآت الدرجات: نسبة من الجهد الفعلي لكل خطوة (الفرق بين الدرجة والتي قبلها)
export function tierRewards(tiers, pct) {
  const out = {}
  for (const t of tiers) {
    const u = UNIT[t.id]; if (!u) continue
    out[t.id] = t.steps.map((n, i) => Math.max(20, r5((n - (t.steps[i - 1] || 0)) * u * pct / 100)))
  }
  return out
}

export function compare(idx, cfg) {
  const rx0 = resolveActions(idx)
  const ctx = achContext(idx, rx0)
  const tiers = defs(ctx).filter(d => d.group === 'tier').map(d => ({ id: d.id, icon: d.icon, name: d.name, steps: d.steps }))
  const opts = toOpts(cfg, tiers)
  const A = computeLevels(idx), B = computeLevels(idx, opts)
  const players = idx.players.map(p => ({ p, a: A.get(p.id), b: B.get(p.id) })).filter(x => x.a && x.b)
  const sum = (m, f) => players.reduce((t, x) => t + f(x[m]), 0)
  const rows = {}
  CATS.forEach(c => { rows[c.id] = [] })
  for (const f of FLAT) rows[f.cat].push({ ...f, cur: CURRENT[f.id], now: cfg[f.id], a: sum('a', l => l.parts[f.part] || 0), b: sum('b', l => l.parts[f.part] || 0) })
  // الأجزاء المشتركة بين أكثر من قاعدة (الفوز، التوقع…) نعرض مجموعها مرة وحدة بالقاعدة الأولى بس
  const seen = new Set()
  for (const c of Object.keys(rows)) rows[c].forEach(r => { if (seen.has(r.part)) { r.shared = true; r.a = null; r.b = null } else seen.add(r.part) })
  for (const x of AUTO) rows[x.cat].push({ ...x, auto: true, a: sum('a', l => l.parts[x.part] || 0), b: sum('b', l => l.parts[x.part] || 0) })
  const grp = Object.fromEntries(GROUPS.map(g => [g.id, g.name]))
  const achMap = new Map()
  players.forEach(x => x.a.achievements.forEach((a, i) => {
    const b = x.b.achievements[i]
    const r = achMap.get(a.id) || { id: a.id, icon: a.icon, name: a.name, group: a.group, grp: grp[a.group], a: 0, b: 0, n: 0, steps: a.steps, each: a.each }
    r.a += a.xp; r.b += b.xp; if (a.done) r.n++
    achMap.set(a.id, r)
  }))
  const defsAll = defs(ctx)
  const ach = [...achMap.values()].map(r => {
    const d = defsAll.find(z => z.id === r.id)
    return { ...r, kind: d.group === 'tier' ? 'tier' : d.group === 'season' ? 'season' : 'once', curVal: d.group === 'tier' ? TIER_XP : d.group === 'season' ? d.each : d.xp, newVal: d.group === 'tier' ? (opts.tier?.[r.id] || TIER_XP) : d.group === 'season' ? (cfg.season?.[r.id] ?? d.each) : (cfg.once?.[r.id] ?? d.xp), steps: d.steps }
  })
  const catTotals = CATS.map(c => {
    const list = rows[c.id]
    let a = list.filter(r => !r.shared).reduce((t, r) => t + (r.a || 0), 0), b = list.filter(r => !r.shared).reduce((t, r) => t + (r.b || 0), 0)
    if (c.id === 'ach') { a = ach.reduce((t, r) => t + r.a, 0); b = ach.reduce((t, r) => t + r.b, 0) }
    return { ...c, a, b }
  })
  const eventCount = {
    win: players.reduce((t, x) => t + x.a.stats.wins, 0),
    predict: rx0.predictions.filter(p => p.ok).length,
    chal: rx0.challenges.filter(c => c.play).length,
    risk: rx0.risks.filter(r => r.play).length,
  }
  return { rows, ach, catTotals, players, eventCount, tiers, tierNew: opts.tier || {} }
}
