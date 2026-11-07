// تحدي اليوم: مهمة صغيرة تتغير كل يوم (للكل)
export const MISSION_START = '2026-11-07'
const day = iso => (iso || '').slice(0, 10)
export const MISSIONS = [
  { id: 'rate', icon: '⭐', text: 'قيّم لعبة أو عدّل تقييمك', test: (idx, pid, d) => idx.ratings.some(r => r.player_id === pid && day(r.updated_at) === d) },
  { id: 'comment', icon: '💬', text: 'علّق على لعبة', test: (idx, pid, d) => (idx.comments || []).some(c => c.player_id === pid && day(c.updated_at) === d) },
  { id: 'post', icon: '📝', text: 'اكتب شي في اللوحة', test: (idx, pid, d) => (idx.posts || []).some(p => p.player_id === pid && day(p.created_at) === d) },
  { id: 'pick', icon: '🎲', text: 'اختر لعبة للجلسة الجاية', test: (idx, pid, d) => (idx.picks || []).some(p => p.player_id === pid && day(p.created_at) === d) },
  { id: 'play', icon: '🎮', text: 'العب قيم', test: (idx, pid, d) => idx.plays.some(p => p.played_on === d && p.results.some(r => r.player_id === pid)) },
  { id: 'react', icon: '😂', text: 'رد على كتابة في اللوحة', test: (idx, pid, d) => (idx.actions || []).some(a => a.kind === 'react' && a.player_id === pid && day(a.created_at) === d) },
]
const hashDay = d => [...d].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
export const missionOf = d => MISSIONS[hashDay(d) % MISSIONS.length]
export const todayKey = () => new Date().toISOString().slice(0, 10)
export function dailyDone(idx, pid) {
  const out = []
  const end = todayKey()
  for (let t = new Date(MISSION_START + 'T00:00:00Z'); t.toISOString().slice(0, 10) <= end; t = new Date(t.getTime() + 864e5)) {
    const d = t.toISOString().slice(0, 10)
    if (missionOf(d).test(idx, pid, d)) out.push(d)
  }
  return out
}
