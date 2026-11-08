// الألقاب: كل لقب له ندرة وطريقة فتح وتقدّم
import { computeLevels, idxBefore, REWARDS } from './levels'
import { counts } from './stats'
import { achContext } from './achievements'
import { resolveActions } from './actions'

export const RARITY = {
  rare: { name: 'نادر', dot: '#6FB7FF', order: 0 },
  epic: { name: 'ملحمي', dot: '#C38BFF', order: 1 },
  legend: { name: 'أسطوري', dot: '#FFD25A', order: 2 },
}

const T = (id, name, icon, rarity, desc, from, to, ring, test) => ({ id, name, icon, rarity, desc, from, to, ring, test })
const B = v => [v ? 1 : 0, 1]
export const TITLE_DEFS = [
  // أسطورية
  T('sultan', 'سلطان الطاولة', '👑', 'legend', 'ابقَ المتصدر في الترتيب 60 يوم متواصل', '#7a5a12', '#e9b425', '#ffe08a', s => [s.leadDays, 60]),
  T('kingofkings', 'ملك الملوك', '🏰', 'legend', 'كن ملك 3 ألعاب من 3 تصانيف مختلفة', '#6b4a10', '#d4a017', '#ffd56b', s => [s.kingCats, 3]),
  T('conqueror', 'القاهر', '⚔️', 'epic', 'اغلب كل واحد في الشلة 10 مرات', '#5a0f1f', '#c2185b', '#ff8fb1', s => [s.minBeat, 10]),
  T('nemesis', 'عقدة الجميع', '🌀', 'legend', 'كل واحد لعبت معه 10 أقيام على الأقل يكون خسر قدّامك أكثر ما فاز عليك', '#1f2a6b', '#5b7cff', '#a9b8ff', s => [s.nemesisOk, s.others]),
  // ملحمية
  T('general', 'الجنرال', '🎖️', 'legend', 'فز 15 مرة في ألعاب الاستراتيجية', '#1e3a2a', '#2e9e5b', '#7be3a6', s => [s.stratWins, 15]),
  T('wolf', 'الذئب', '🐺', 'epic', 'فز 10 مرات في ألعاب الخداع', '#2a1f3d', '#6b4dd8', '#c3b5ff', s => [s.bluffWins, 10]),
  T('teacher', 'المعلّم', '🧑‍🏫', 'epic', 'كن أول واحد يلعب لعبة جديدة ويفوز فيها، في 10 ألعاب', '#3d2a10', '#ee7a2b', '#ffc08a', s => [s.taught, 10]),
  T('kingmaker', 'خاطف التيجان', '🫅', 'epic', 'اخطف تاج «ملك اللعبة» من غيرك 3 مرات', '#4a3a0f', '#c9a227', '#ffe08a', s => [s.crownSteals, 3]),
  T('giantslayer', 'قاتل العمالقة', '🗡️', 'rare', 'اغلب المتصدر وهو متصدر 10 مرات', '#3a1010', '#d93a3a', '#ff9a9a', s => [s.slay, 10]),
  // فكاهية
  T('s67', '67 يرجال', '6', 'epic', 'خلّص قيم ونقاطك 67 بالضبط', '#3a1f4a', '#d6458f', '#ffb3d9', s => B(s.has67)),
  T('s99', 'ناقص واحد', '💯', 'rare', 'خلّص قيم ونقاطك 99', '#3a2a10', '#e9b425', '#ffe08a', s => B(s.has99)),
  T('luckson', 'ابن الحظ', '🍀', 'rare', 'ينحط «بالحظ» على فوزك 3 مرات في نفس اللعبة', '#1e3a2a', '#3ed6a0', '#a6f0d4', s => [s.luckyMax, 3]),
  T('runnerup', 'عاشق الثانية', '🥈', 'rare', 'تجي الثاني 5 مرات متتابعة', '#2b2f3a', '#9aa4c0', '#e3e7f5', s => [s.bestSecond, 5]),
  T('jinx', 'نحس', '🐈‍⬛', 'rare', 'تجي الأخير في نفس اللعبة 5 مرات متتابعة', '#1a1a1a', '#4b4f58', '#a0a4b0', s => [s.jinx, 5]),
  T('loyal', 'الصديق الوفي', '🫂', 'rare', 'العب مع نفس الشخص 50 قيم', '#3a1f2a', '#d6458f', '#ffb3d9', s => [s.maxMate, 50]),
]
export const TITLE_BY_NAME = Object.fromEntries(TITLE_DEFS.map(t => [t.name, t]))

const tsOf = p => p.created_at || `${p.played_on}T12:00:00`
export function computeTitles(idx, levels = computeLevels(idx)) {
  const G = idx.gamesById
  const ctx = achContext(idx, resolveActions(idx))
  const chrono = ctx.chrono
  // خطف التيجان: نتتبع ملك كل لعبة قيم بقيم
  const steals = new Map(), wins = new Map(), king = new Map()
  for (const p of chrono) {
    if (p.results.length < 2) continue
    const w = wins.get(p.game_id) || new Map(); wins.set(p.game_id, w)
    for (const r of p.results) if (r.position === 1) w.set(r.player_id, (w.get(r.player_id) || 0) + 1)
    const s = [...w.entries()].sort((a, b) => b[1] - a[1])
    const k = s[0] && s[0][1] >= 3 && (!s[1] || s[1][1] < s[0][1]) ? s[0][0] : (king.get(p.game_id) || null)
    const prev = king.get(p.game_id) || null
    if (k && prev && k !== prev) steals.set(k, (steals.get(k) || 0) + 1)
    king.set(p.game_id, k)
  }
  const firstPlay = new Map(); for (const p of chrono) if (!firstPlay.has(p.game_id)) firstPlay.set(p.game_id, p)
  const lastDay = d => { const i = ctx.days.indexOf(d); return i > 0 ? ctx.leaderByDay.get(ctx.days[i - 1]) : null }
  const luckyActs = (idx.actions || []).filter(a => a.kind === 'lucky')
  const out = new Map()
  for (const pl of idx.players) {
    const id = pl.id, lv = levels.get(id)
    const mine = chrono.filter(p => p.results.some(r => r.player_id === id))
    const comp = mine.filter(p => counts(p, G.get(p.game_id)))
    const rOf = p => p.results.find(r => r.player_id === id)
    const won = p => p.results.length > 1 && rOf(p)?.position === 1
    const last = p => { const r = rOf(p); return p.results.length > 1 && r.position === Math.max(...p.results.map(x => x.position)) && p.results.some(x => x.position < r.position) }
    const sc = mine.map(p => ({ p, s: rOf(p)?.score })).filter(x => x.s != null && ['points', 'low'].includes(G.get(x.p.game_id)?.scoring))
    let notLast = 0, bestNotLast = 0, second = 0, bestSecond = 0, flips = 0
    comp.forEach((p, i) => {
      if (last(p)) notLast = 0; else { notLast++; bestNotLast = Math.max(bestNotLast, notLast) }
      if (rOf(p).position === 2) { second++; bestSecond = Math.max(bestSecond, second) } else second = 0
      if (i > 0 && won(p) && last(comp[i - 1])) flips++
    })
    const ahead = new Map(), behind = new Map(), shared = new Map()
    for (const p of comp) { const r = rOf(p); for (const o of p.results) if (o.player_id !== id) { shared.set(o.player_id, (shared.get(o.player_id) || 0) + 1); if (r.position < o.position) ahead.set(o.player_id, (ahead.get(o.player_id) || 0) + 1); else if (r.position > o.position) behind.set(o.player_id, (behind.get(o.player_id) || 0) + 1) } }
    const others = idx.players.filter(o => o.id !== id)
    const allShared = new Map(); for (const p of mine) for (const o of p.results) if (o.player_id !== id) allShared.set(o.player_id, (allShared.get(o.player_id) || 0) + 1)
    const byDay = new Map(); for (const p of comp) if (won(p)) { if (!byDay.has(p.played_on)) byDay.set(p.played_on, new Set()); byDay.get(p.played_on).add(p.game_id) }
    const myDays = new Set(mine.map(p => p.played_on))
    let run = 0, bestRun = 0; for (const d of ctx.days) { if (myDays.has(d)) { run++; bestRun = Math.max(bestRun, run) } else run = 0 }
    const kingGames = [...ctx.kings.entries()].filter(([, k]) => k === id).map(([g]) => g)
    const lastPerGame = new Map(); let jinx = 0
    for (const p of comp) { const n = last(p) ? (lastPerGame.get(p.game_id) || 0) + 1 : 0; lastPerGame.set(p.game_id, n); jinx = Math.max(jinx, n) }
    const luckyBy = new Map(); for (const a of luckyActs.filter(a => a.target === id)) { const g = idx.plays.find(p => p.id === a.play_id)?.game_id; if (g) luckyBy.set(g, (luckyBy.get(g) || 0) + 1) }
    const hourOf = p => new Date(p.ended_at || p.created_at || tsOf(p)).getHours()
    const leaderDays = [...ctx.leaderByDay.entries()].filter(([, l]) => l === id).map(([d]) => d)
    const runaway = leaderDays.some(d => { const next = mine.find(p => p.played_on > d); const gap = ((next ? new Date(next.played_on) : new Date()) - new Date(d)) / 864e5; return gap >= 14 })
    const s = {
      level: lv.level, wins: lv.stats.wins, leadDays: ctx.leaderDays.get(id) || 0,
      kingCats: new Set(kingGames.map(g => G.get(g)?.category).filter(Boolean)).size, kingOf: kingGames.length,
      minBeat: others.length ? Math.min(...others.map(o => ahead.get(o.id) || 0)) : 0,
      nemesisOk: others.filter(o => (shared.get(o.id) || 0) >= 10 && (ahead.get(o.id) || 0) > (behind.get(o.id) || 0)).length, others: others.length,
      stratWins: comp.filter(p => won(p) && G.get(p.game_id)?.category === 'strategy').length,
      bluffWins: comp.filter(p => won(p) && G.get(p.game_id)?.category === 'bluff').length,
      bestNotLast, taught: [...firstPlay.values()].filter(p => won(p)).length,
      bestDayGames: Math.max(0, ...[...byDay.values()].map(x => x.size)), crownSteals: steals.get(id) || 0,
      bestAttendRun: bestRun, slay: comp.filter(p => { const l = lastDay(p.played_on); return l && l !== id && p.results.some(r => r.player_id === l) && rOf(p).position < p.results.find(r => r.player_id === l).position }).length,
      has67: sc.some(x => x.s === 67), has69: sc.some(x => x.s === 69), has99: sc.some(x => x.s === 99),
      copy: sc.some((x, i) => i > 0 && x.s > 0 && x.s === sc[i - 1].s), luckyMax: Math.max(0, ...luckyBy.values()),
      bestSecond, nightWins: comp.filter(p => won(p) && hourOf(p) >= 2 && hourOf(p) < 6).length, zeros: sc.filter(x => x.s === 0).length,
      flips, jinx, maxMate: Math.max(0, ...allShared.values()), runaway,
      double: sc.some(x => { const p = x.p; if (!won(p) || G.get(p.game_id)?.scoring !== 'points') return false; const sec = p.results.find(r => r.position === 2)?.score; return sec > 0 && x.s === sec * 2 }),
    }
    const list = TITLE_DEFS.map(t => {
      const [cur, target] = t.test(s)
      return { ...t, cur: Math.min(cur, target), target, done: target > 0 && cur >= target }
    })
    out.set(id, list)
  }
  return out
}

// متى فتح اللاعب كل شي: نعيد حساب الوضع يوم بيوم ونشوف وش انفتح جديد
export function unlockHistory(idx, pid) {
  const days = new Set()
  for (const p of idx.plays) days.add((p.created_at || p.played_on).slice(0, 10))
  for (const r of idx.ratings) if (r.updated_at) days.add(r.updated_at.slice(0, 10))
  for (const c of idx.comments || []) if (c.updated_at) days.add(c.updated_at.slice(0, 10))
  for (const p of idx.posts || []) days.add(p.created_at.slice(0, 10))
  const out = []
  let prev = { level: 1, ach: new Set(), titles: new Set() }
  for (const d of [...days].sort()) {
    const snap = idxBefore(idx, `${d}T23:59:59.999Z`)
    const levels = computeLevels(snap)
    const lv = levels.get(pid); if (!lv) continue
    const ts = computeTitles(snap, levels).get(pid) || []
    const ach = new Set(lv.achievements.flatMap(a => a.keys || []))
    const titles = new Set(ts.filter(t => t.done).map(t => t.id))
    if (lv.level > prev.level) {
      out.push({ at: d, kind: 'level', icon: '⬆️', name: `وصلت مستوى ${lv.level}`, desc: lv.title })
      for (const r of REWARDS.filter(r => r.level > prev.level && r.level <= lv.level)) out.push({ at: d, kind: 'reward', icon: r.icon, name: r.name, desc: r.desc })
    }
    for (const a of lv.achievements) for (const k of a.keys || []) if (!prev.ach.has(k)) {
      const t = a.group === 'tier' ? ` ${['🥉 برونزي', '🥈 فضي', '🥇 ذهبي', '💎 ماسي'][+k.split(':')[1]]}` : a.group === 'season' ? ' (مرة جديدة)' : ''
      out.push({ at: d, kind: 'ach', icon: a.icon, name: a.name + t, desc: a.group === 'tier' ? a.text(a.steps[+k.split(':')[1]], +k.split(':')[1] === a.steps.length - 1) : a.desc })
    }
    for (const t of ts) if (titles.has(t.id) && !prev.titles.has(t.id) && t.id !== 'visitor') out.push({ at: d, kind: 'title', icon: t.icon, name: t.name, desc: t.desc })
    prev = { level: lv.level, ach: new Set([...prev.ach, ...ach]), titles: new Set([...prev.titles, ...titles]) }
  }
  const order = { level: 0, reward: 1, title: 2, ach: 3 }
  return out.sort((a, b) => b.at.localeCompare(a.at) || order[a.kind] - order[b.kind])
}

// أحداث الفتح لكل الشلة في آخر أيام (إنجازات، ألقاب، مستويات) للأحداث الأخيرة
export function unlockEvents(idx, days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const set = new Set()
  for (const p of idx.plays) set.add((p.created_at || p.played_on).slice(0, 10))
  for (const r of idx.ratings) if (r.updated_at) set.add(r.updated_at.slice(0, 10))
  for (const c of idx.comments || []) if (c.updated_at) set.add(c.updated_at.slice(0, 10))
  for (const p of idx.posts || []) set.add(p.created_at.slice(0, 10))
  const all = [...set].sort()
  const recent = all.filter(d => d >= since).slice(-10)
  if (!recent.length) return []
  const base = all.filter(d => d < recent[0]).at(-1)
  const state = (d) => {
    const snap = idxBefore(idx, `${d}T23:59:59.999Z`)
    const levels = computeLevels(snap); const ts = computeTitles(snap, levels)
    const m = new Map()
    for (const [pid, lv] of levels) m.set(pid, { level: lv.level, lv, ach: new Set(lv.achievements.flatMap(a => a.keys || [])), titles: new Set((ts.get(pid) || []).filter(t => t.done).map(t => t.id)), ts: ts.get(pid) || [] })
    return m
  }
  let prev = state(base || recent[0])
  const out = []
  const now = Date.now()
  for (const d of recent) {
    if (!base && d === recent[0]) continue
    const cur = state(d)
    const at = Math.min(new Date(`${d}T23:59:59Z`).getTime(), now)
    const iso = new Date(at).toISOString()
    for (const [pid, c] of cur) {
      const pv = prev.get(pid) || { level: 1, ach: new Set(), titles: new Set() }
      const who = idx.playersById.get(pid)
      if (!who) continue
      if (c.level > pv.level) out.push({ id: `lv${pid}${c.level}`, at: iso, who, by: pid, icon: '⬆️', text: `${who.name} وصل مستوى ${c.level}`, sub: c.lv.title, href: `#/player/${pid}` })
      for (const a of c.lv.achievements) for (const k of a.keys || []) if (!pv.ach.has(k)) {
        const t = a.group === 'tier' ? ` ${['🥉', '🥈', '🥇', '💎'][+k.split(':')[1]] || ''}` : ''
        out.push({ id: `ac${pid}${k}`, at: iso, who, by: pid, icon: a.icon, text: `${who.name} فتح إنجاز «${a.name}»${t}`, href: `#/player/${pid}` })
      }
      for (const t of c.ts) if (c.titles.has(t.id) && !pv.titles.has(t.id) && t.id !== 'visitor') out.push({ id: `ti${pid}${t.id}`, at: iso, who, by: pid, icon: t.icon, text: `${who.name} فتح لقب «${t.name}»`, sub: t.desc, href: `#/player/${pid}` })
    }
    prev = cur
  }
  return out.slice(-60)
}
