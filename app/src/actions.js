// نتائج أفعال الجوائز: التوقعات، الرهان، التحديات، الريماتش، الشكر، الفيتو...
// كل شي يتحسب من جدول actions + الأقيام المسجلة

import { winXp } from './winxp'
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
// أول يوم لعب بعد وقت معيّن (ويحضره كل اللي في القائمة)
const nextDay = (idx, iso, who) => {
  const d0 = iso.slice(0, 10)
  const days = [...new Set(idx.plays.filter(p => tsOf(p) > iso || p.played_on > d0).map(p => p.played_on))].sort()
  return days.find(d => who.every(w => idx.plays.some(p => p.played_on === d && p.results.some(r => r.player_id === w)))) || null
}

export function resolveActions(idx) {
  const acts = idx.actions || []
  const xp = new Map() // pid -> {predict, bet, thanks}
  const add = (pid, k, v) => { if (!xp.has(pid)) xp.set(pid, { predict: 0, thanks: 0, thankGive: 0, gift: 0, lucky: 0, luckbox: 0, risk: 0, godfather: 0, box: 0, guarantee: 0 }); xp.get(pid)[k] += v }
  const predictions = [], challenges = [], rematches = [], risks = [], boxes = [], guarantees = []
  for (const a of acts) {
    if (a.kind === 'predict') {
      const p = after(idx, a.created_at, 2, x => x.game_id === a.game_id)
      const ok = p ? pos(p, a.target) === 1 : null
      if (ok) add(a.player_id, 'predict', a.data?.double ? 30 : 15)
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
    } else if (a.kind === 'gift' && a.target) add(a.target, 'gift', 50)
    else if (a.kind === 'luckbox') add(a.player_id, 'luckbox', Math.max(0, Math.min(60, Number(a.data?.xp) || 0)))
    else if (a.kind === 'risk') {
      const p = after(idx, a.created_at, 2, x => x.game_id === a.game_id && x.results.some(r => r.player_id === a.player_id))
      const ok = p ? pos(p, a.player_id) === 1 : null
      if (p) add(a.player_id, 'risk', ok ? 300 : -50)
      risks.push({ ...a, play: p, ok })
    } else if (a.kind === 'godfather' && a.target) {
      const d = nextDay(idx, a.created_at, [a.player_id, a.target])
      if (d) {
        const mine = idx.plays.filter(p => p.played_on === d && p.results.some(r => r.player_id === a.player_id))
        const earned = mine.length * 10 + mine.filter(p => pos(p, a.player_id) === 1 && p.results.length > 1).length * 5
        add(a.target, 'godfather', Math.round(earned / 2)); add(a.player_id, 'godfather', 20)
      }
    } else if (a.kind === 'box') {
      const amt = Math.max(20, Math.min(100, Number(a.data?.amount) || 0))
      add(a.player_id, 'box', -amt)
      const p = after(idx, a.created_at, 60, x => x.results.length > 1)
      const w = p?.results.find(r => r.position === 1)?.player_id
      if (w) add(w, 'box', amt)
      boxes.push({ ...a, amount: amt, play: p, winner: w || null })
    } else if (a.kind === 'guarantee') {
      const d = nextDay(idx, a.created_at, [])
      if (d) {
        const st = new Map()
        for (const p of idx.plays.filter(x => x.played_on === d && x.results.length > 1)) for (const r of p.results) {
          const s = st.get(r.player_id) || { b: 0, f: 0 }
          for (const o of p.results) if (o !== r) { s.f++; s.b += o.position > r.position ? 1 : o.position === r.position ? .5 : 0 }
          st.set(r.player_id, s)
        }
        const last = [...st.entries()].sort((x, y) => x[1].b / x[1].f - y[1].b / y[1].f)[0]
        if (last) add(last[0], 'guarantee', 20)
        guarantees.push({ ...a, day: d, loser: last?.[0] || null })
      } else guarantees.push({ ...a, day: null, loser: null })
    }
    else if (a.kind === 'lucky' && a.target && a.play_id) {
      const p = idx.plays.find(x => x.id === a.play_id)
      if (p) {
        const first = !idx.plays.some(x => x.game_id === p.game_id && x.id !== p.id && tsOf(x) < tsOf(p) && x.results.some(r => r.player_id === a.target))
        add(a.target, 'lucky', -Math.round((10 + winXp(p, idx.gamesById.get(p.game_id)) + (first ? 30 : 0)) / 2))
      }
    } else if (a.kind === 'thanks' && a.target) { add(a.target, 'thanks', 20); add(a.player_id, 'thankGive', 10) }
  }
  return { xp, predictions, challenges, rematches, risks, boxes, guarantees }
}

// المفعول الحالي على كل لاعب (ملصقات، بيبي، لقب مغيّر)
export function activeEffects(idx, now = Date.now()) {
  const acts = idx.actions || []
  const live = (a, ms) => now - new Date(a.created_at).getTime() < ms
  const on = new Map()
  const get = pid => { if (!on.has(pid)) on.set(pid, { teases: [], baby: null, retitle: null, immune: null, caption: null }); return on.get(pid) }
  const IMM = 7 * DAY
  const immunes = acts.filter(a => a.kind === 'immune')
  const shielded = (pid, at) => immunes.some(i => i.player_id === pid && new Date(at) >= new Date(i.created_at) && new Date(at) - new Date(i.created_at) < IMM)
  for (const i of immunes) if (live(i, IMM) && !get(i.player_id).immune) get(i.player_id).immune = i
  for (const a of acts) {
    if (!a.target || shielded(a.target, a.created_at)) continue
    if (a.kind === 'tease' && live(a, TEASE_MS)) get(a.target).teases.push(a)
    if (a.kind === 'baby' && live(a, BABY_MS) && !get(a.target).baby) get(a.target).baby = a
    if (a.kind === 'retitle' && live(a, RETITLE_MS) && !get(a.target).retitle) get(a.target).retitle = a
    if (a.kind === 'caption' && live(a, DAY) && !get(a.target).caption) get(a.target).caption = a
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

// تنبيه ذهبي شغّال (24 ساعة)
export const goldenAlert = (idx, now = Date.now()) => (idx.actions || []).find(a => a.kind === 'alert' && now - new Date(a.created_at).getTime() < DAY) || null
export const isImmune = (idx, pid, now = Date.now()) => (idx.actions || []).some(a => a.kind === 'immune' && a.player_id === pid && now - new Date(a.created_at).getTime() < 7 * DAY)

// أفعال الجلسة اللي شغّالة (12 ساعة): قانون منزلي، مقعد، فريق، ضمان الخاسر
export const liveActs = (idx, kind, hours = 12, now = Date.now()) => (idx.actions || []).filter(a => a.kind === kind && now - new Date(a.created_at).getTime() < hours * 3600e3)
export const hotSeat = (idx, now = Date.now()) => (idx.actions || []).find(a => a.kind === 'hotseat' && now - new Date(a.created_at).getTime() < 7 * DAY) || null
// راية الهزيمة: آخر تحدي محسوم بين كل اثنين، الخسران عليه راية لين يفوز
export function flagsOn(challenges) {
  const last = new Map()
  for (const c of [...challenges].filter(c => c.play && c.winner).sort((x, y) => tsOf(x.play).localeCompare(tsOf(y.play)))) {
    const k = [c.player_id, c.target].sort().join('|')
    last.set(k, c)
  }
  const out = new Map()
  for (const c of last.values()) { const loser = c.winner === c.player_id ? c.target : c.player_id; if (!out.has(loser)) out.set(loser, []); out.get(loser).push(c.winner) }
  return out
}
export const NICK_MS = 2 * 3600e3
