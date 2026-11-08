// آخر الأحداث والتنبيهات: تنبني من البيانات الموجودة
import { unlockEvents } from './titles'
const KEY = 'tw-seen'
export const getSeen = () => { try { return localStorage.getItem(KEY) || '1970' } catch { return '1970' } }
export const markSeen = () => { try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* ignore */ } }

const cache = new WeakMap()
export function buildEvents(idx) {
  if (!cache.has(idx)) cache.set(idx, build(idx))
  return cache.get(idx)
}
function build(idx) {
  const P = idx.playersById, G = idx.gamesById
  const ev = []
  for (const p of idx.plays.slice(0, 60)) {
    const g = G.get(p.game_id); const w = p.results.filter(r => r.position === 1).map(r => P.get(r.player_id)).filter(Boolean)
    const who = P.get(p.created_by) || w[0]
    ev.push({ id: 'p' + p.id, at: p.created_at || p.played_on, who, by: p.created_by, icon: '🎲', text: `${who ? who.name + ' سجّل' : 'انسجل'} قيم ${g?.name || ''}`, sub: `${w.length ? '🏆 ' + w.map(x => x.name).join(' و') + ' · ' : ''}${p.results.length} لاعبين`, href: `#/play/${p.id}` })
  }
  for (const x of (idx.posts || []).slice(0, 40)) {
    const who = P.get(x.player_id); if (!who) continue
    ev.push({ id: 'b' + x.id, at: x.created_at, who, by: x.player_id, icon: '💬', text: `${who.name} كتب في اللوحة: «${x.body.length > 50 ? x.body.slice(0, 50) + '…' : x.body}»`, sub: x.body.slice(0, 60), href: '#/board', post: true })
  }
  for (const c of (idx.comments || [])) {
    const who = P.get(c.player_id); const g = G.get(c.game_id); if (!who || !g) continue
    ev.push({ id: 'c' + c.game_id + c.player_id, at: c.updated_at, who, by: c.player_id, icon: '🗨️', text: `${who.name} علّق على ${g.name}`, sub: c.body.slice(0, 60), href: `#/game/${g.id}` })
  }
  // الألعاب اللي انضافت أول مرة مع بعض ما نعتبرها أحداث
  const allG = (idx.allGames || idx.games).filter(g => g.created_at)
  const first = allG.reduce((m, g) => (g.created_at < m ? g.created_at : m), '9999')
  const cutoff = first === '9999' ? '' : new Date(new Date(first).getTime() + 2 * 864e5).toISOString()
  for (const g of allG) {
    if (g.created_at < cutoff) continue
    const who = P.get(g.added_by)
    ev.push({ id: 'g' + g.id, at: g.created_at, who, by: g.added_by, icon: '📦', text: `انضافت لعبة جديدة: ${g.name}`, href: `#/game/${g.id}` })
  }
  try { ev.push(...unlockEvents(idx)) } catch { /* لا نكسر الصفحة */ }
  return ev.filter(e => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 80)
}

export function unread(idx, me) {
  const seen = getSeen()
  return buildEvents(idx).filter(e => e.at > seen && e.by !== me?.id)
}

export function timeAgo(iso) {
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso); const m = (Date.now() - d) / 60000
  if (m < 1) return 'الحين'
  if (m < 60) return `قبل ${Math.round(m)} د`
  if (m < 1440) return `قبل ${Math.round(m / 60)} ساعة`
  const days = Math.round(m / 1440)
  return days === 1 ? 'أمس' : days < 30 ? `قبل ${days} يوم` : d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' })
}
