// نتائج أفعال الجوائز: التوقعات، الرهان، التحديات، الريماتش، الشكر، الفيتو...
// كل شي يتحسب من جدول actions + الأقيام المسجلة

const tsOf = p => p.created_at || `${p.played_on}T12:00:00`
const DAY = 864e5
export const TEASE_MS = 3 * DAY
export const BABY_MS = DAY
export const RETITLE_MS = DAY

const after = (idx, iso, maxDays, test) => {
  const t0 = new Date(iso).getTime()
  return [...idx.plays].filter(p => { const t = new Date(tsOf(p)).getTime(); return t > t0 && t - t0 <= maxDays * DAY && test(p) })
    .sort((a, b) => tsOf(a).localeCompare(tsOf(b)))[0] || null
}
const pos = (p, pid) => p.results.find(r => r.player_id === pid)?.position

export function resolveActions(idx) {
  const acts = idx.actions || []
  const xp = new Map() // pid -> {predict, bet, thanks}
  const add = (pid, k, v) => { if (!xp.has(pid)) xp.set(pid, { predict: 0, thanks: 0, thankGive: 0 }); xp.get(pid)[k] += v }
  const predictions = [], challenges = [], rematches = []
  for (const a of acts) {
    if (a.kind === 'predict') {
      const p = after(idx, a.created_at, 2, x => x.game_id === a.game_id)
      const ok = p ? pos(p, a.target) === 1 : null
      if (ok) add(a.player_id, 'predict', 15)
      predictions.push({ ...a, play: p, ok })
    } else if (a.kind === 'challenge') {
      const p = after(idx, a.created_at, 14, x => (!a.game_id || x.game_id === a.game_id) && x.results.some(r => r.player_id === a.player_id) && x.results.some(r => r.player_id === a.target))
      const winner = p ? (pos(p, a.player_id) < pos(p, a.target) ? a.player_id : pos(p, a.target) < pos(p, a.player_id) ? a.target : null) : undefined
      challenges.push({ ...a, play: p, winner })
    } else if (a.kind === 'rematch') {
      const orig = idx.plays.find(x => x.id === a.play_id)
      const w = orig?.results.find(r => r.position === 1)?.player_id
      const p = orig ? after(idx, a.created_at, 30, x => x.game_id === orig.game_id && x.results.some(r => r.player_id === a.player_id) && x.results.some(r => r.player_id === w)) : null
      rematches.push({ ...a, orig, rival: w, play: p, done: !!p })
    } else if (a.kind === 'thanks' && a.target) { add(a.target, 'thanks', 10); add(a.player_id, 'thankGive', 3) }
  }
  return { xp, predictions, challenges, rematches }
}

// المفعول الحالي على كل لاعب (ملصقات، بيبي، لقب مغيّر)
export function activeEffects(idx, now = Date.now()) {
  const acts = idx.actions || []
  const live = (a, ms) => now - new Date(a.created_at).getTime() < ms
  const on = new Map()
  const get = pid => { if (!on.has(pid)) on.set(pid, { teases: [], baby: null, retitle: null }); return on.get(pid) }
  for (const a of acts) {
    if (!a.target) continue
    if (a.kind === 'tease' && live(a, TEASE_MS)) get(a.target).teases.push(a)
    if (a.kind === 'baby' && live(a, BABY_MS) && !get(a.target).baby) get(a.target).baby = a
    if (a.kind === 'retitle' && live(a, RETITLE_MS) && !get(a.target).retitle) get(a.target).retitle = a
  }
  return on
}

// آخر مرة استخدم اللاعب نوع معيّن (للحدود: مرة بالأسبوع/بالشهر)
export const lastUse = (idx, pid, kind) => (idx.actions || []).find(a => a.player_id === pid && a.kind === kind) || null
export const cooldownLeft = (idx, pid, kind, days) => {
  const a = lastUse(idx, pid, kind); if (!a) return 0
  const left = days * DAY - (Date.now() - new Date(a.created_at).getTime())
  return left > 0 ? Math.ceil(left / DAY) : 0
}

// البورد على جهة لاعب (ليفل 7): يشتغل 12 ساعة من وقت ما يفعّله
export const boardSide = (idx, now = Date.now()) => (idx.actions || []).find(a => a.kind === 'board' && now - new Date(a.created_at).getTime() < 12 * 3600e3) || null
