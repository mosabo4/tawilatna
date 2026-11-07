// الإنجازات: درجات (برونزي→ماسي)، مواقف صعبة، الشلة، سرية، وموسمية
import { counts, kingOf } from './stats'

export const TIER = [
  { id: 'b', name: 'برونزي', icon: '🥉', color: '#CD7F32' },
  { id: 's', name: 'فضي', icon: '🥈', color: '#C0C7D6' },
  { id: 'g', name: 'ذهبي', icon: '🥇', color: '#FFC45C' },
  { id: 'd', name: 'ماسي', icon: '💎', color: '#7FE3FF' },
]
const TIER_XP = [20, 60, 150, 400]
// جائزة كل إنجاز سري: شارة تحطها على صورتك وجنب اسمك
export const SECRET_BADGES = {
  zero: { icon: '💀', name: 'الجمجمة' }, owl: { icon: '🦉', name: 'البومة' }, tie: { icon: '👯', name: 'التوأم' }, unlucky: { icon: '🫠', name: 'الذايب' },
  addict: { icon: '♾️', name: 'اللانهاية' }, revenge: { icon: '🗡️', name: 'الخنجر' }, ebaby: { icon: '🍼', name: 'الرضّاعة' }, grave: { icon: '🪦', name: 'شاهد القبر' },
}
export const GROUPS = [
  { id: 'tier', name: 'المسيرة' }, { id: 'hard', name: 'صعبة' }, { id: 'crew', name: 'الشلة' }, { id: 'secret', name: 'سرية' }, { id: 'season', name: 'موسمية' },
]
const tsOf = p => p.created_at || `${p.played_on}T12:00:00`
const isLast = (p, pid) => { const r = p.results.find(x => x.player_id === pid); return p.results.length > 1 && r && r.position === Math.max(...p.results.map(x => x.position)) && p.results.some(x => x.position < r.position) }
const won = (p, pid) => p.results.length > 1 && p.results.some(r => r.player_id === pid && r.position === 1)
const monthOf = d => d.slice(0, 7)

// حسابات مشتركة لكل الشلة (مرة وحدة لكل idx)
export function achContext(idx, rx) {
  const chrono = [...idx.plays].sort((a, b) => tsOf(a).localeCompare(tsOf(b)))
  const G = idx.gamesById
  const kings = new Map(idx.games.map(g => [g.id, kingOf(idx, g.id)?.player?.id || null]))
  const days = [...new Set(chrono.map(p => p.played_on))]
  // المتصدر بعد كل يوم لعب (نفس منطق الترتيب: نقطة لكل خصم تغلبه)
  const acc = new Map(), leaderDays = new Map()
  let leader = null, since = null
  for (const d of days) {
    for (const p of chrono.filter(x => x.played_on === d)) {
      if (!counts(p, G.get(p.game_id))) continue
      for (const r of p.results) {
        const s = acc.get(r.player_id) || { b: 0, f: 0 }
        for (const o of p.results) if (o !== r) { s.f++; s.b += o.position > r.position ? 1 : o.position === r.position ? .5 : 0 }
        acc.set(r.player_id, s)
      }
    }
    const top = [...acc.entries()].filter(([, s]) => s.f >= 10).sort((a, b) => b[1].b / b[1].f - a[1].b / a[1].f)[0]?.[0] || null
    if (top !== leader) { leader = top; since = d }
    if (leader) {
      const len = Math.round((new Date(d) - new Date(since)) / 864e5) + 1
      leaderDays.set(leader, Math.max(leaderDays.get(leader) || 0, len))
    }
  }
  // تمديد فترة المتصدر الحالي لين اليوم
  if (leader) { const len = Math.round((Date.now() - new Date(since)) / 864e5) + 1; leaderDays.set(leader, Math.max(leaderDays.get(leader) || 0, len)) }
  const scoringTypes = [...new Set(idx.games.map(g => g.scoring).filter(s => s && s !== 'coop'))]
  const compCats = [...new Set(idx.games.filter(g => g.category && g.category !== 'coop').map(g => g.category))]
  // أبطال كل شهر
  const monthWins = new Map()
  for (const p of chrono) if (won(p, p.results.find(r => r.position === 1)?.player_id) && counts(p, G.get(p.game_id))) {
    const m = monthOf(p.played_on); if (!monthWins.has(m)) monthWins.set(m, new Map())
    for (const r of p.results.filter(r => r.position === 1)) monthWins.get(m).set(r.player_id, (monthWins.get(m).get(r.player_id) || 0) + 1)
  }
  const nowM = monthOf(new Date().toISOString())
  const monthChamps = new Map()
  for (const [m, w] of monthWins) {
    if (m >= nowM) continue
    const s = [...w.entries()].sort((a, b) => b[1] - a[1])
    if (s[0] && (!s[1] || s[1][1] < s[0][1])) monthChamps.set(s[0][0], (monthChamps.get(s[0][0]) || 0) + 1)
  }
  return { chrono, kings, days, leaderDays, scoringTypes, compCats, monthChamps, rx, totalGames: idx.games.length }
}

const tiered = (id, icon, name, text, steps, value) => ({ id, icon, name, group: 'tier', text, steps, value })
// عدد + معدود بالعربي (3-10 جمع، 11+ مفرد)
const cnt = (n, one, many) => `${n} ${n >= 3 && n <= 10 ? many : one}`
const once = (id, icon, name, desc, xp, group, test, prog) => ({ id, icon, name, desc, xp, group, test, prog })

function defs(ctx) {
  const all = ctx.totalGames
  const cats = ctx.compCats.length
  return [
    tiered('explore', '📚', 'المستكشف', (n, last) => (last && n >= all ? 'جرّب كل ألعاب الدولاب' : `جرّب ${cnt(n, 'لعبة', 'ألعاب')} مختلفة`), [15, 30, 45, Math.max(46, all)], s => s.games),
    tiered('attend', '📅', 'الحضور', n => `احضر ${cnt(n, 'جلسة', 'جلسات')}`, [15, 40, 80, 150], s => s.sessions),
    tiered('wins', '🏆', 'الفوز', n => `فز ${cnt(n, 'مرة', 'مرات')}`, [10, 50, 150, 300], s => s.wins),
    tiered('streak', '🔥', 'على النار', n => `فز ${cnt(n, 'مرة', 'مرات')} متتابعة`, [3, 5, 7, 10], s => s.bestWinStreak),
    tiered('critic', '⭐', 'الناقد', (n, last) => (last && n >= all ? 'قيّم كل ألعاب الدولاب' : `قيّم ${cnt(n, 'لعبة', 'ألعاب')}`), [15, 30, 45, Math.max(46, all)], s => s.ratings),
    tiered('talk', '💬', 'صاحب رأي', n => `علّق على ${cnt(n, 'لعبة', 'ألعاب')}`, [10, 25, 50], s => s.comments),
    tiered('cats', '🌈', 'متعدد المواهب', (n, last) => (last ? 'فز في كل التصانيف' : `فز في ${cnt(n, 'تصنيف', 'تصانيف')} مختلفة`), [3, Math.min(5, cats), cats].filter((x, i, a) => a.indexOf(x) === i), s => s.winCats),
    tiered('setup', '🧱', 'المجهّز', n => `جهّز ${cnt(n, 'لعبة ثقيلة', 'ألعاب ثقيلة')}`, [5, 15, 40], s => s.setups),
    tiered('oracle', '🔮', 'المحنك', n => `توقّع الفايز صح ${cnt(n, 'مرة', 'مرات')}`, [5, 15, 30], s => s.predOk),
    tiered('duelist', '⚔️', 'المتحدي', n => `فز في ${cnt(n, 'تحدي رسمي', 'تحديات رسمية')}`, [3, 10, 25], s => s.chalWon),
    tiered('daily', '🎯', 'المواظب', n => `خلّص تحدي اليوم ${cnt(n, 'يوم', 'أيام')} متتابعة`, [7, 30, 100], s => s.dailyStreak),

    once('comeback', '🔄', 'الرجعة', 'فز بعد ما تجي الأخير في 3 أقيام متتابعة', 150, 'hard', s => s.comeback),
    once('kingslayer', '🗡️', 'قاتل الملك', 'اغلب ملك اللعبة في لعبته 3 مرات', 200, 'hard', s => s.kingslay >= 3, s => [s.kingslay, 3]),
    once('prodigy', '🎓', 'الموهبة', 'فز من أول مرة تلعبها في 3 ألعاب مختلفة', 200, 'hard', s => s.firstWins >= 3, s => [s.firstWins, 3]),
    once('hurricane', '🌪️', 'الإعصار', 'فز بكل أقيام الجلسة (4 أقيام على الأقل)', 300, 'hard', s => s.hurricane),
    once('marathon', '🏃', 'الماراثون', 'العب كل أقيام جلسة فيها 8 أقيام أو أكثر', 150, 'hard', s => s.marathon, s => [s.maxDayPlays, 8]),
    once('heavy', '🧠', 'وحش الثقيلة', 'فز 10 مرات في ألعاب صعوبتها 3.5 أو أكثر', 300, 'hard', s => s.heavyWins >= 10, s => [s.heavyWins, 10]),
    once('wall', '🧱', 'الجدار', 'لا تجي الأخير في 25 قيم متتابع', 250, 'hard', s => s.bestNotLast >= 25, s => [s.bestNotLast, 25]),
    once('emperor', '👑', 'الإمبراطور', 'كن ملك 5 ألعاب في نفس الوقت', 400, 'hard', s => s.kingOf >= 5, s => [s.kingOf, 5]),
    once('reign', '🥇', 'المتصدر الدائم', 'ابقَ الأول في الترتيب 30 يوم متواصل', 400, 'hard', s => s.leadDays >= 30, s => [s.leadDays, 30]),
    once('sniper', '🎯', 'القنّاص', 'اغلب كل واحد في الشلة في تحدي رسمي', 400, 'hard', s => s.sniper, s => [s.chalBeaten, s.others]),
    once('goat', '🐐', 'الأسطورة الحية', 'في لعبة وحدة، اغلب كل واحد في الشلة 3 مرات', 500, 'hard', s => s.goat),
    once('perfect', '💯', 'المثالي', 'فز في 10 أقيام من أصل 12 متتابعة', 500, 'hard', s => s.perfect, s => [s.best12, 10]),
    once('chameleon', '🎭', 'الحرباية', `فز بكل طرق الفوز الموجودة (${ctx.scoringTypes.length} طرق)`, 300, 'hard', s => s.scorings >= ctx.scoringTypes.length, s => [s.scorings, ctx.scoringTypes.length]),
    once('patient', '⏱️', 'الصبور', 'فز في قيم استمر ساعتين ونص أو أكثر', 200, 'hard', s => s.longWin),
    once('nomad', '🧳', 'الرحّال', 'العب 20 لعبة مختلفة في شهر واحد', 300, 'hard', s => s.monthGames >= 20, s => [s.monthGames, 20]),

    once('family', '🫂', 'العائلة', 'احضر 10 جلسات حضرتها الشلة كاملة', 200, 'crew', s => s.fullDays >= 10, s => [s.fullDays, 10]),
    once('generous', '🎁', 'الكريم', 'أهدِ XP لأحد من الشلة 10 مرات', 100, 'crew', s => s.gifts >= 10, s => [s.gifts, 10]),
    once('historian', '📜', 'المؤرخ', 'اكتب 15 مذكرة لأقيام', 150, 'crew', s => s.stories >= 15, s => [s.stories, 15]),
    once('beloved', '🙏', 'محبوب الشلة', 'خذ 25 شكر على التجهيز', 200, 'crew', s => s.thanked >= 25, s => [s.thanked, 25]),
    once('luckyme', '🍀', 'المحظوظ رغماً عنه', 'ينحط «بالحظ» على 5 من انتصاراتك', 100, 'crew', s => s.luckyMarked >= 5, s => [s.luckyMarked, 5]),
    once('mentor', '🤝', 'العرّاب الناجح', 'كن عرّاب لاعب يوصل ليفل 10', 300, 'crew', s => s.mentorOk),
    once('taste', '👨‍🍳', 'صاحب الذوق', 'اختر للجلسة 10 ألعاب تنلعب فعلاً', 150, 'crew', s => s.tasteHits >= 10, s => [s.tasteHits, 10]),

    once('zero', '💀', 'الكارثة', 'صفر نقاط في قيم', 60, 'secret', s => s.zero),
    once('owl', '🦉', 'البومة', 'قيم يخلص بعد الساعة 4 الفجر', 80, 'secret', s => s.owl),
    once('tie', '🤝', 'التعادل الأسطوري', 'تعادل على المركز الأول', 100, 'secret', s => s.tieTop),
    once('unlucky', '🫠', 'صفر حظ', 'تجي الأخير 7 مرات في نفس اللعبة', 80, 'secret', s => s.lastSame >= 7),
    once('addict', '🔁', 'المدمن', 'تلعب نفس اللعبة 25 مرة', 120, 'secret', s => s.sameGame >= 25),
    once('revenge', '😈', 'الانتقام البارد', 'تفوز على اللي حط على فوزك «بالحظ» في نفس اللعبة', 150, 'secret', s => s.revenge),
    once('ebaby', '👶', 'البيبي الأبدي', 'يسوّونك بيبي 5 مرات', 60, 'secret', s => s.babied >= 5),
    once('grave', '🪦', 'المقبرة', 'تخسر 10 تحديات رسمية', 80, 'secret', s => s.chalLost >= 10),

    { id: 'champ', icon: '🏅', name: 'بطل الشهر', desc: 'كن أكثر واحد فاز في الشهر (يتجدد كل شهر)', group: 'season', each: 150, times: s => s.champMonths },
    { id: 'always', icon: '📆', name: 'الحاضر الدائم', desc: 'احضر كل جلسات الشهر (3 جلسات على الأقل)', group: 'season', each: 100, times: s => s.fullMonths },
  ]
}

// إحصائيات لاعب واحد للإنجازات
export function achStats(idx, pl, ctx, base) {
  const { chrono, rx } = ctx
  const G = idx.gamesById
  const id = pl.id
  const mine = chrono.filter(p => p.results.some(r => r.player_id === id))
  const comp = mine.filter(p => counts(p, G.get(p.game_id)))
  let comeback = false, lastRun = 0, notLast = 0, bestNotLast = 0
  for (const p of comp) {
    if (won(p, id) && lastRun >= 3) comeback = true
    if (isLast(p, id)) { lastRun++; notLast = 0 } else { if (!won(p, id)) lastRun = 0; else lastRun = 0; notLast++; bestNotLast = Math.max(bestNotLast, notLast) }
  }
  let best12 = 0
  for (let i = 0; i < comp.length; i++) best12 = Math.max(best12, comp.slice(i, i + 12).filter(p => won(p, id)).length)
  const seen = new Set(); let firstWins = 0
  for (const p of mine) { if (!seen.has(p.game_id)) { seen.add(p.game_id); if (won(p, id) && counts(p, G.get(p.game_id))) firstWins++ } }
  const kingslay = comp.filter(p => won(p, id) && ctx.kings.get(p.game_id) && ctx.kings.get(p.game_id) !== id && p.results.some(r => r.player_id === ctx.kings.get(p.game_id))).length
  const byDay = new Map(); for (const p of chrono) { if (!byDay.has(p.played_on)) byDay.set(p.played_on, []); byDay.get(p.played_on).push(p) }
  let hurricane = false, marathon = false, maxDayPlays = 0
  for (const ps of byDay.values()) {
    const inAll = ps.every(p => p.results.some(r => r.player_id === id))
    if (inAll) maxDayPlays = Math.max(maxDayPlays, ps.length)
    if (inAll && ps.length >= 8) marathon = true
    const c = ps.filter(p => counts(p, G.get(p.game_id)))
    if (inAll && c.length >= 4 && c.every(p => won(p, id))) hurricane = true
  }
  const heavyWins = comp.filter(p => won(p, id) && (G.get(p.game_id)?.weight || 0) >= 3.5).length
  const kingOfN = [...ctx.kings.values()].filter(k => k === id).length
  const others = idx.players.filter(o => o.id !== id)
  const chal = rx.challenges.filter(c => c.play && (c.player_id === id || c.target === id))
  const beatenIn = new Set(chal.filter(c => c.winner === id).map(c => (c.player_id === id ? c.target : c.player_id)))
  let goat = false
  for (const gid of new Set(comp.map(p => p.game_id))) {
    const ps = comp.filter(p => p.game_id === gid && won(p, id))
    if (others.length && others.every(o => ps.filter(p => p.results.some(r => r.player_id === o.id)).length >= 3)) goat = true
  }
  const scorings = new Set(comp.filter(p => won(p, id)).map(p => G.get(p.game_id)?.scoring).filter(Boolean)).size
  const longWin = comp.some(p => won(p, id) && ((p.started_at && p.ended_at && (new Date(p.ended_at) - new Date(p.started_at)) / 60000 >= 150) || (G.get(p.game_id)?.max_minutes || G.get(p.game_id)?.play_minutes || 0) >= 150))
  const mg = new Map(); for (const p of mine) { const m = monthOf(p.played_on); if (!mg.has(m)) mg.set(m, new Set()); mg.get(m).add(p.game_id) }
  const monthGames = Math.max(0, ...[...mg.values()].map(s => s.size))
  const acts = idx.actions || []
  const fullDaySet = [...byDay.entries()].filter(([, ps]) => { const w = new Set(ps.flatMap(p => p.results.map(r => r.player_id))); return idx.players.length > 1 && idx.players.every(x => w.has(x.id)) }).map(([d]) => d)
  const luckyOnMe = acts.filter(a => a.kind === 'lucky' && a.target === id)
  const revenge = luckyOnMe.some(a => { const orig = idx.plays.find(p => p.id === a.play_id); return orig && comp.some(p => p.game_id === orig.game_id && tsOf(p) > a.created_at && won(p, id) && p.results.some(r => r.player_id === a.player_id)) })
  const mentees = acts.filter(a => a.kind === 'godfather' && a.player_id === id).map(a => a.target)
  const picks = (idx.picks || []).filter(p => p.player_id === id)
  const tasteHits = new Set(picks.filter(pk => idx.plays.some(p => p.game_id === pk.game_id && pk.created_at && tsOf(p) > pk.created_at && new Date(tsOf(p)) - new Date(pk.created_at) < 10 * 864e5)).map(pk => pk.game_id)).size
  const lastBy = new Map(), sameBy = new Map()
  for (const p of mine) { sameBy.set(p.game_id, (sameBy.get(p.game_id) || 0) + 1); if (isLast(p, id)) lastBy.set(p.game_id, (lastBy.get(p.game_id) || 0) + 1) }
  // تحدي اليوم ورا بعض
  let dRun = 0, dBest = 0
  if (base.dailyDays?.length) {
    const set = new Set(base.dailyDays)
    for (let t = new Date(base.dailyDays[0] + 'T00:00:00Z'); t <= new Date(); t = new Date(t.getTime() + 864e5)) {
      const d = t.toISOString().slice(0, 10); if (set.has(d)) { dRun++; dBest = Math.max(dBest, dRun) } else if (d !== new Date().toISOString().slice(0, 10)) dRun = 0
    }
  }
  // شهور حضر فيها كل الجلسات
  const months = new Map(); for (const d of ctx.days) { const m = monthOf(d); if (!months.has(m)) months.set(m, []); months.get(m).push(d) }
  const myDays = new Set(mine.map(p => p.played_on))
  const fullMonths = [...months.entries()].filter(([m, ds]) => m < monthOf(new Date().toISOString()) && ds.length >= 3 && ds.every(d => myDays.has(d))).length
  return {
    ...base,
    predOk: rx.predictions.filter(a => a.player_id === id && a.ok).length,
    chalWon: chal.filter(c => c.winner === id).length, chalLost: chal.filter(c => c.winner && c.winner !== id).length,
    dailyStreak: dBest,
    comeback, kingslay, firstWins, hurricane, marathon, maxDayPlays, heavyWins, bestNotLast, kingOf: kingOfN,
    leadDays: ctx.leaderDays.get(id) || 0, sniper: others.length > 0 && others.every(o => beatenIn.has(o.id)), chalBeaten: beatenIn.size, others: others.length,
    goat, perfect: best12 >= 10, best12, scorings, longWin, monthGames,
    fullDays: fullDaySet.filter(d => myDays.has(d)).length,
    gifts: acts.filter(a => a.kind === 'gift' && a.player_id === id).length,
    stories: acts.filter(a => a.kind === 'story' && a.player_id === id).length,
    thanked: acts.filter(a => a.kind === 'thanks' && a.target === id).length,
    luckyMarked: luckyOnMe.length, revenge,
    mentorOk: mentees.some(t => (base.levelOf?.(t) || 0) >= 10),
    tasteHits,
    zero: mine.some(p => p.results.some(r => r.player_id === id && r.score === 0) && ['points', 'low'].includes(G.get(p.game_id)?.scoring)),
    owl: mine.some(p => p.ended_at && new Date(p.ended_at).getHours() >= 4 && new Date(p.ended_at).getHours() < 9),
    tieTop: mine.some(p => p.results.length > 1 && p.results.filter(r => r.position === 1).length > 1 && won(p, id)),
    lastSame: Math.max(0, ...lastBy.values()), sameGame: Math.max(0, ...sameBy.values()),
    babied: acts.filter(a => a.kind === 'baby' && a.target === id).length,
    champMonths: ctx.monthChamps.get(id) || 0, fullMonths,
  }
}

// تقييم الإنجازات للاعب
export function evalAchievements(ctx, s) {
  return defs(ctx).map(d => {
    if (d.group === 'tier') {
      const v = d.value(s)
      const tier = d.steps.filter(n => v >= n).length
      const xp = TIER_XP.slice(0, tier).reduce((a, b) => a + b, 0)
      const maxed = tier >= d.steps.length
      const target = maxed ? d.steps.at(-1) : d.steps[tier]
      const tierIdx = n => (d.steps.length === 3 ? n : n)
      return {
        ...d, desc: d.text(target, tier === d.steps.length - 1 || maxed), unit: '', tier, tiers: d.steps.length, tierInfo: tier ? TIER[tierIdx(tier - 1)] : null,
        done: tier > 0, maxed, xp, nextXp: maxed ? 0 : TIER_XP[tier], progress: [Math.min(v, target), target], value: v,
        keys: Array.from({ length: tier }, (_, i) => `${d.id}:${i}`),
      }
    }
    if (d.group === 'season') {
      const n = d.times(s)
      return { ...d, done: n > 0, maxed: false, xp: n * d.each, nextXp: d.each, times: n, progress: null, keys: Array.from({ length: n }, (_, i) => `${d.id}:${i}`) }
    }
    const done = !!d.test(s)
    return { ...d, done, maxed: done, xp: done ? d.xp : 0, nextXp: d.xp, progress: d.prog ? d.prog(s) : null, keys: done ? [d.id] : [] }
  })
}
