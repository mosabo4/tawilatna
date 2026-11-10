// الجلسة الحيّة (تنحفظ على الجهاز)
const KEY = 'tw-live'
export const getLive = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
export const setLive = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* ignore */ } }
const pad = n => String(n).padStart(2, '0')
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
// الجلسة: أقيام نفس اليوم، وإذا عدّت ساعتين بين قيم وقيم تصير جلسة ثانية
export const SESSION_GAP = 2 * 3600e3
const localDay = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const playTime = p => p.started_at || p.ended_at || (p.created_at && localDay(p.created_at) === p.played_on ? p.created_at : null)
export function sessionsOf(plays) {
  const days = new Map()
  for (const p of plays) { if (!days.has(p.played_on)) days.set(p.played_on, []); days.get(p.played_on).push(p) }
  const out = new Map()
  for (const [day, ps] of days) {
    const timed = ps.filter(playTime).sort((a, b) => new Date(playTime(a)) - new Date(playTime(b)))
    const untimed = ps.filter(p => !playTime(p))
    const sess = []
    for (const p of timed) {
      const s = sess.at(-1), t = new Date(playTime(p)).getTime(), e = new Date(p.ended_at || playTime(p)).getTime()
      if (s && t - s.end <= SESSION_GAP) { s.plays.push(p); s.end = Math.max(s.end, e) } else sess.push({ plays: [p], start: t, end: e })
    }
    if (!sess.length) sess.push({ plays: [], start: null, end: null })
    sess[0].plays.push(...untimed)
    sess.forEach((s, i) => s.plays.forEach(p => out.set(p.id, { key: `${day}#${i}`, day, n: i + 1, of: sess.length, start: s.start, end: s.end, timed: s.start != null })))
  }
  return out
}
export const livePlays = (idx, live) => idx.plays.filter(p => p.played_on === live.date && (!p.created_at || p.created_at >= live.start))
export const dayStartIso = date => new Date(`${date}T00:00:00`).toISOString()
const LAST = 'tw-live-last'
// جلسة انتهت قبل أقل من ساعتين: لو بدأت ثانية تكمل عليها
export const getLast = () => { try { const v = JSON.parse(localStorage.getItem(LAST)); return v && v.date === todayStr() && Date.now() - (v.end || 0) < SESSION_GAP ? v : null } catch { return null } }
export const setLast = v => { try { localStorage.setItem(LAST, JSON.stringify({ ...v, end: Date.now() })) } catch { /* ignore */ } }
