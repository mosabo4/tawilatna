// آخر الأحداث والتنبيهات: تنبني من البيانات الموجودة
import { unlockEvents } from './titles'
const KEY = 'tw-seen', RKEY = 'tw-read'
export const getSeen = () => { try { return localStorage.getItem(KEY) || '1970' } catch { return '1970' } }
const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(RKEY) || '[]')) } catch { return new Set() } }
// «علّم الكل مقروء»: نحدّث وقت آخر زيارة ونفضّي قائمة المقروء الفردي
export const markSeen = () => { try { localStorage.setItem(KEY, new Date().toISOString()); localStorage.removeItem(RKEY) } catch { /* ignore */ } }
export const markRead = id => { try { const s = readSet(); s.add(id); localStorage.setItem(RKEY, JSON.stringify([...s].slice(-300))) } catch { /* ignore */ } }
export const isNew = (e, me, seen = getSeen(), rs = readSet()) => e.at > seen && e.by !== me?.id && !rs.has(e.id)
export const readIds = readSet

export const CATS = [
  ['all', 'الكل'], ['me', '🎯 يخصني'], ['social', '💬 تفاعل'], ['progress', '🏅 إنجازات'],
]

const cache = new WeakMap()
// نخفي تعليقاتك وتقييماتك من تنبيهاتك أنت (تطلع للباقين عادي)
export function buildEvents(idx, me) {
  const k = me?.id || '-'
  if (!cache.has(idx)) cache.set(idx, new Map())
  const m = cache.get(idx)
  if (!m.has(k)) m.set(k, build(idx, me))
  return m.get(k)
}

export const TYPES = {
  play: ['قيم', '#5B7CFF'], rate: ['تقييم', '#F2B33D'], comment: ['تعليق', '#2BC4D6'], vote: ['جلسة', '#A35BFF'],
  lv: ['مستوى', '#2FB36B'], ach: ['إنجاز', '#FF8A3D'], title: ['لقب', '#E8508F'], crown: ['تاج', '#E5C100'], social: ['تفاعل', '#8A94A8'], game: ['لعبة جديدة', '#4C9AFF'],
}

const day = iso => String(iso).slice(0, 10)

// نجمّع الأحداث المتشابهة (نفس النوع + نفس الهدف + نفس اليوم) في حدث واحد
function group(list, keyFn, make) {
  const m = new Map()
  for (const e of list) { const k = keyFn(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e) }
  return [...m.values()].map(g => (g.length === 1 ? g[0] : make(g.sort((a, b) => String(b.at).localeCompare(String(a.at))))))
}

function crownEvents(idx, days = 60) {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const plays = [...idx.plays].sort((a, b) => (a.played_on + (a.created_at || '')).localeCompare(b.played_on + (b.created_at || '')))
  const wins = new Map(), holder = new Map(), out = []
  for (const p of plays) {
    if (p.results.length < 2) continue
    const w = wins.get(p.game_id) || new Map()
    for (const r of p.results) if (r.position === 1) w.set(r.player_id, (w.get(r.player_id) || 0) + 1)
    wins.set(p.game_id, w)
    const s = [...w.entries()].sort((a, b) => b[1] - a[1])
    const king = s.length && s[0][1] >= 3 && !(s[1] && s[1][1] === s[0][1]) ? s[0][0] : null
    const old = holder.get(p.game_id) || null
    if (king && king !== old) {
      const at = p.created_at || p.played_on
      if (String(at) >= since) {
        const who = idx.playersById.get(king), g = idx.gamesById.get(p.game_id), from = old && idx.playersById.get(old)
        if (who && g) out.push({ id: `k${p.game_id}${king}${p.id}`, at, who, by: king, to: from ? [old] : [], t: 'crown', cat: 'social', icon: from ? '🫅' : '👑', text: from ? `${who.name} خطف تاج «${g.name}» من ${from.name}` : `${who.name} صار ملك «${g.name}»`, sub: `${s[0][1]} فوز`, href: `#/game/${g.id}` })
      }
    }
    holder.set(p.game_id, king)
  }
  return out
}

const ACT = {
  thanks: () => ({ icon: '🙏', text: (w, t) => `${w} شكر ${t} على التجهيز`, cat: 'social' }),
  gift: () => ({ icon: '🎁', text: (w, t) => `${w} أهدى ${t} هدية`, cat: 'social' }),
  tease: () => ({ icon: '😜', text: (w, t) => `${w} طقّ ${t}`, cat: 'social' }),
  baby: () => ({ icon: '🍼', text: (w, t) => `${w} حط ${t} في الرضّاعة`, cat: 'social' }),
  retitle: () => ({ icon: '🏷️', text: (w, t) => `${w} غيّر لقب ${t}`, cat: 'social' }),
  caption: () => ({ icon: '💭', text: (w, t) => `${w} كتب تعليق على ${t}`, cat: 'social' }),
  challenge: () => ({ icon: '⚔️', text: (w, t) => `${w} تحدّى ${t}`, cat: 'social' }),
  rematch: () => ({ icon: '🔁', text: (w, t) => `${w} طلب إعادة من ${t}`, cat: 'social' }),
  hotseat: () => ({ icon: '🔥', text: (w, t) => `${w} حط ${t} على الكرسي الساخن`, cat: 'social' }),
  immune: () => ({ icon: '🛡️', text: w => `${w} فعّل الحصانة`, cat: 'social' }),
  alert: () => ({ icon: '🚨', text: w => `${w} أطلق تنبيه ذهبي`, cat: 'social' }),
  godfather: () => ({ icon: '🤝', text: (w, t) => `${w} صار عرّاب ${t}`, cat: 'social' }),
  predict: () => ({ icon: '🔮', text: w => `${w} توقّع الفايز`, cat: 'social' }),
}

function build(idx, me) {
  const P = idx.playersById, G = idx.gamesById
  const ev = []
  for (const x of (idx.posts || []).slice(0, 40)) {
    const who = P.get(x.player_id); if (!who) continue
    ev.push({ id: 'b' + x.id, at: x.created_at, who, by: x.player_id, t: 'social', cat: 'social', icon: '💬', text: `${who.name} كتب في اللوحة: «${x.body.length > 50 ? x.body.slice(0, 50) + '…' : x.body}»`, sub: x.body.slice(0, 60), href: '#/board', post: true })
  }
  const cmts = []
  for (const c of (idx.comments || [])) {
    const who = P.get(c.player_id); const g = G.get(c.game_id); if (!who || !g || c.player_id === me?.id) continue
    cmts.push({ id: 'c' + c.game_id + c.player_id, at: c.updated_at, who, by: c.player_id, t: 'comment', cat: 'social', icon: '🗨️', text: `${who.name} علّق على ${g.name}`, sub: c.body.slice(0, 60), href: `#/game/${g.id}`, gk: 'c' + day(c.updated_at), game: g })
  }
  ev.push(...group(cmts, e => e.gk, g => ({ id: 'cg' + g[0].gk, at: g[0].at, who: g[0].who, by: g[0].by, t: 'comment', cat: 'social', icon: '🗨️', text: `${g.length} تعليقات جديدة على الألعاب`, sub: [...new Set(g.map(x => x.game.name))].slice(0, 2).join('، '), href: g[0].href, whos: [...new Map(g.map(x => [x.by, x.who])).values()] })))
  // تقييمات: تتجمّع لكل لعبة باليوم
  const rate = []
  for (const r of idx.ratings || []) {
    const who = P.get(r.player_id), g = G.get(r.game_id); if (!who || !g || !r.updated_at || r.player_id === me?.id) continue
    rate.push({ id: 'r' + r.game_id + r.player_id, at: r.updated_at, who, by: r.player_id, t: 'rate', cat: 'social', icon: '⭐', text: `${who.name} قيّم ${g.name} بـ ${Number(r.score)}`, href: `#/game/${g.id}`, gk: 'r' + day(r.updated_at), game: g, score: Number(r.score) })
  }
  ev.push(...group(rate, e => e.gk, g => ({ id: 'rg' + g[0].gk, at: g[0].at, who: g[0].who, by: g[0].by, t: 'rate', cat: 'social', icon: '⭐', text: `${g.length === 1 ? 'تقييم جديد' : g.length === 2 ? 'تقييمين جدد' : g.length + ' تقييمات جديدة'} (${(n => (n === 1 ? 'لعبة' : n === 2 ? 'لعبتين' : n <= 10 ? `${n} ألعاب` : `${n} لعبة`))(new Set(g.map(x => x.game.id)).size)})`, sub: `${[...new Set(g.map(x => x.game.name))].slice(0, 2).join('، ')}${new Set(g.map(x => x.game.id)).size > 2 ? '…' : ''}`, href: g[0].href, whos: [...new Map(g.map(x => [x.by, x.who])).values()] })))
  // ترشيحات الجلسة الجاية: تتجمّع لكل لعبة
  const picks = []
  const wk = (idx.picks || []).reduce((m, p) => (p.week > m ? p.week : m), '')
  for (const k of idx.picks || []) {
    if (k.week !== wk || !k.created_at) continue
    const who = P.get(k.player_id), g = G.get(k.game_id); if (!who || !g) continue
    picks.push({ id: 'k' + k.game_id + k.player_id + k.week, at: k.created_at, who, by: k.player_id, t: 'vote', cat: 'social', icon: '🗳️', text: `${who.name} صوّت للجلسة الجاية على ${g.name}${(k.votes || 1) > 1 ? ` (×${k.votes})` : ''}`, href: '#/friday', gk: day(k.created_at), game: g })
  }
  ev.push(...group(picks, e => e.gk, g => ({ id: 'kg' + g[0].gk + g[0].at, at: g[0].at, who: g[0].who, by: g[0].by, t: 'vote', cat: 'social', icon: '🗳️', text: `${g.length} أصوات للجلسة الجاية`, sub: `${[...new Set(g.map(x => x.game.name))].slice(0, 2).join('، ')}${new Set(g.map(x => x.game.id)).size > 2 ? '…' : ''}`, href: '#/friday', whos: [...new Map(g.map(x => [x.by, x.who])).values()] })))
  // حركات العيال (شكر، هدايا، فيتو، افتتاح...)
  for (const a of idx.actions || []) {
    const who = P.get(a.player_id); if (!who || !a.created_at) continue
    const t = a.target && P.get(a.target)
    const g = a.game_id && G.get(a.game_id)
    if (a.kind === 'veto' && g) { ev.push({ id: 'a' + a.id, at: a.created_at, who, by: a.player_id, t: 'vote', cat: 'social', icon: '🚫', text: `${who.name} استخدم الفيتو على ${g.name}`, href: '#/friday' }); continue }
    if (a.kind === 'opener' && g) { ev.push({ id: 'a' + a.id, at: a.created_at, who, by: a.player_id, t: 'vote', cat: 'social', icon: '🎬', text: `${who.name} اختار ${g.name} لعبة الافتتاح`, href: '#/friday' }); continue }
    const f = ACT[a.kind]; if (!f) continue
    const d = f(a)
    if (['thanks', 'gift', 'tease', 'baby', 'retitle', 'caption', 'challenge', 'rematch', 'hotseat', 'godfather'].includes(a.kind) && !t) continue
    ev.push({ id: 'a' + a.id, at: a.created_at, who, by: a.player_id, to: t ? [t.id] : [], t: a.kind === 'predict' ? 'play' : 'social', cat: d.cat, icon: d.icon, text: d.text(who.name, t?.name), href: t ? `#/player/${t.id}` : '#/' })
  }
  // الألعاب اللي انضافت أول مرة مع بعض ما نعتبرها أحداث
  const allG = (idx.allGames || idx.games).filter(g => g.created_at)
  const first = allG.reduce((m, g) => (g.created_at < m ? g.created_at : m), '9999')
  const cutoff = first === '9999' ? '' : new Date(new Date(first).getTime() + 2 * 864e5).toISOString()
  for (const g of allG) {
    if (g.created_at < cutoff) continue
    const who = P.get(g.added_by)
    ev.push({ id: 'g' + g.id, at: g.created_at, who, by: g.added_by, t: 'game', cat: 'social', icon: '📦', text: `انضافت لعبة جديدة: ${g.name}`, href: `#/game/${g.id}` })
  }
  try { ev.push(...crownEvents(idx)) } catch { /* لا نكسر الصفحة */ }
  try {
    const un = unlockEvents(idx).map(e => ({ ...e, cat: 'progress', t: e.un.k }))
    // نفس الشخص فتح 3 أشياء أو أكثر بنفس اليوم = إشعار واحد
    const cnt = new Map(); un.filter(e => e.un.k !== 'lv').forEach(e => { const k = `${e.by}|${e.un.day}`; cnt.set(k, (cnt.get(k) || 0) + 1) })
    const bulk = new Map(), rest = []
    for (const e of un) {
      const k = `${e.by}|${e.un.day}`
      if (e.un.k !== 'lv' && cnt.get(k) >= 3) { if (!bulk.has(k)) bulk.set(k, []); bulk.get(k).push(e) } else rest.push(e)
    }
    for (const [k, g] of bulk) ev.push({ ...g[0], id: 'ub' + k, t: 'ach', icon: '🎉', text: `${g[0].who.name} فتح ${g.length} إنجازات وألقاب جديدة`, sub: g.map(x => x.un.name).slice(0, 3).join('، ') + (g.length > 3 ? '…' : ''), un: { k: 'bulk', name: k, day: g[0].un.day } })
    // نفس الإنجاز/اللقب/المستوى لأكثر من واحد بنفس اليوم = إشعار واحد
    const whatN = { lv: 'وصلوا', ach: 'فتحوا إنجاز', title: 'فتحوا لقب' }
    ev.push(...group(rest, e => `${e.un.k}|${e.un.name}|${e.un.day}`, g => ({ ...g[0], id: 'ug' + g[0].id, text: `${whatN[g[0].un.k]} ${g[0].un.name}`, sub: undefined, to: g.map(x => x.by), whos: g.map(x => x.who) })))
  } catch { /* لا نكسر الصفحة */ }
  return ev.filter(e => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200)
}

// هل الحدث يخصني؟ (أنا الهدف، أو لعبت القيم، أو الحدث على شخصي)
export const isMine = (e, me) => !!me && (e.to || []).includes(me.id)

export const DAY_MS = 864e5
// الإشعارات تطلع آخر 24 ساعة، وسجل الإشعارات آخر أسبوع
export const within = (list, ms) => list.filter(e => Date.now() - new Date(String(e.at).length <= 10 ? e.at + 'T12:00:00' : e.at).getTime() <= ms)

export function unread(idx, me) {
  const seen = getSeen(), rs = readSet()
  return within(buildEvents(idx), DAY_MS).filter(e => e.at > seen && e.by !== me?.id && !rs.has(e.id))
}

export function timeAgo(iso) {
  const d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso); const m = (Date.now() - d) / 60000
  if (m < 1) return 'الحين'
  if (m < 60) return `قبل ${Math.round(m)} د`
  if (m < 1440) return `قبل ${Math.round(m / 60)} ساعة`
  const days = Math.round(m / 1440)
  return days === 1 ? 'أمس' : days < 30 ? `قبل ${days} يوم` : d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' })
}

export function dayLabel(iso) {
  const d = new Date(String(iso).length <= 10 ? iso + 'T12:00:00' : iso); const t = new Date(); t.setHours(0, 0, 0, 0)
  const diff = Math.floor((t - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5)
  return diff <= 0 ? 'اليوم' : diff === 1 ? 'أمس' : diff < 7 ? 'هذا الأسبوع' : 'أقدم'
}
