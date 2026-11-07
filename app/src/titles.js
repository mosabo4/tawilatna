// الألقاب: كل لقب له ندرة وطريقة فتح وتقدّم
import { computeLevels, idxBefore, REWARDS } from './levels'
import { standings, counts } from './stats'

export const RARITY = {
  common: { name: 'عادي', dot: '#C9CEE8', order: 0 },
  rare: { name: 'نادر', dot: '#5FB2FF', order: 1 },
  epic: { name: 'ملحمي', dot: '#C38BFF', order: 2 },
  legend: { name: 'أسطوري', dot: '#FFD25A', order: 3 },
}

const T = (id, name, icon, rarity, desc, from, to, ring, test) => ({ id, name, icon, rarity, desc, from, to, ring, test })
export const TITLE_DEFS = [
  T('visitor', 'زائر الطاولة', '🚪', 'common', 'أول ما تنضم للشلة', '#4B5578', '#2E3550', '#8C96BC', () => [1, 1]),
  T('lucky', 'المبتدئ المحظوظ', '🍀', 'common', 'فز في أول قيم لك', '#3E8B4A', '#1F5E3A', '#A6F0C2', s => [Math.min(s.wins, 1), 1]),
  T('crew', 'من الشلة', '🤝', 'common', 'وصل ليفل 3', '#2F6FDB', '#5B3FD8', '#9DB4FF', s => [Math.min(s.level, 3), 3]),
  T('critic', 'الناقد', '📝', 'common', 'قيّم 10 ألعاب', '#5A6B88', '#2E3A55', '#B9C6DA', s => [s.ratings, 10]),
  T('present', 'صاحب حضور', '📅', 'rare', 'احضر 10 جلسات', '#1BA6A6', '#16606B', '#8FF0E6', s => [s.sessions, 10]),
  T('shark', 'القرش', '🦈', 'rare', 'فز 3 أقيام ورا بعض', '#FF6A3D', '#B5172C', '#FFC08A', s => [s.bestWinStreak, 3]),
  T('fox', 'الثعلب', '🦊', 'rare', 'فز 3 مرات في ألعاب الخداع', '#E07A2E', '#8A3B12', '#FFCF8A', s => [s.bluffWins, 3]),
  T('brain', 'العقل المدبّر', '🧠', 'rare', 'فز 5 مرات في ألعاب ثقيلة (صعوبة 3 وفوق)', '#3D4FCF', '#1B2A7A', '#AFC0FF', s => [s.heavyWins, 5]),
  T('party', 'ملك الحفلات', '🎉', 'rare', 'فز في قيم فيه 5 لاعبين أو أكثر', '#D6458F', '#7A1F5C', '#FFB3D9', s => [s.bigWins, 1]),
  T('explorer', 'المستكشف', '🧭', 'rare', 'العب 15 لعبة مختلفة', '#2E9E5B', '#16553A', '#A6F0C2', s => [s.games, 15]),
  T('steady', 'لاعب ثابت', '🛡️', 'rare', 'وصل ليفل 5', '#1BA6A6', '#2E7D4F', '#8FF0D6', s => [Math.min(s.level, 5), 5]),
  T('friend', 'صديق الكل', '🫂', 'rare', 'العب مع كل واحد في الشلة', '#8A6BFF', '#4B3BA8', '#D2C6FF', s => [s.mates, s.matesNeeded]),
  T('unbeaten', 'لا يُقهر', '⚔️', 'epic', 'خلّص قدّام كل واحد في الشلة مرة على الأقل', '#2E9E5B', '#0F3D2A', '#A6F0C2', s => [s.beatPlayers, s.matesNeeded]),
  T('nomad', 'ملك متنقل', '🌍', 'epic', 'فز في 4 تصانيف مختلفة', '#8A4FD8', '#D6458F', '#F2B8FF', s => [s.winCats, 4]),
  T('keeper', 'خبير الدولاب', '🗝️', 'epic', 'وصل ليفل 8', '#B8781F', '#7A3E12', '#FFD36E', s => [Math.min(s.level, 8), 8]),
  T('home', 'ساكن الطاولة', '🏠', 'epic', 'احضر 30 جلسة', '#2E9E5B', '#1F5E3A', '#A6F0C2', s => [s.sessions, 30]),
  T('sultan', 'سلطان الطاولة', '👑', 'legend', 'تصدّر الترتيب العام وعندك 10 أقيام أو أكثر', '#C9A227', '#8A4FD8', '#FFE59A', s => [s.isLeader ? 1 : 0, 1]),
  T('legend', 'أسطورة الطاولة', '🌟', 'legend', 'وصل ليفل 10', '#C9A227', '#B5172C', '#FFE59A', s => [Math.min(s.level, 10), 10]),
]
export const TITLE_BY_NAME = Object.fromEntries(TITLE_DEFS.map(t => [t.name, t]))

export function computeTitles(idx, levels = computeLevels(idx)) {
  const G = idx.gamesById
  const board = standings(idx).filter(r => r.plays > 0)
  const leaderId = board[0] && board[0].plays >= 10 ? board[0].player.id : null
  const out = new Map()
  for (const pl of idx.players) {
    const lv = levels.get(pl.id)
    let bluffWins = 0, heavyWins = 0, bigWins = 0
    const beat = new Set()
    for (const p of idx.plays) {
      const r = p.results.find(x => x.player_id === pl.id); if (!r) continue
      const g = G.get(p.game_id); if (!counts(p, g)) continue
      for (const o of p.results) if (o.position > r.position) beat.add(o.player_id)
      if (r.position !== 1) continue
      if (g?.category === 'bluff') bluffWins++
      if (Number(g?.weight) >= 3) heavyWins++
      if (p.results.length >= 5) bigWins++
    }
    const s = { ...lv.stats, level: lv.level, bluffWins, heavyWins, bigWins, beatPlayers: beat.size, isLeader: leaderId === pl.id }
    const list = TITLE_DEFS.map(t => {
      const [cur, target] = t.test(s)
      return { ...t, cur: Math.min(cur, target), target, done: target > 0 && cur >= target }
    })
    out.set(pl.id, list)
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
    const ach = new Set(lv.achievements.filter(a => a.done).map(a => a.id))
    const titles = new Set(ts.filter(t => t.done).map(t => t.id))
    if (lv.level > prev.level) {
      out.push({ at: d, kind: 'level', icon: '⬆️', name: `وصلت ليفل ${lv.level}`, desc: lv.title })
      for (const r of REWARDS.filter(r => r.level > prev.level && r.level <= lv.level)) out.push({ at: d, kind: 'reward', icon: r.icon, name: r.name, desc: r.desc })
    }
    for (const a of lv.achievements) if (ach.has(a.id) && !prev.ach.has(a.id)) out.push({ at: d, kind: 'ach', icon: a.icon, name: a.name, desc: `${a.desc} · +${a.xp} XP` })
    for (const t of ts) if (titles.has(t.id) && !prev.titles.has(t.id) && t.id !== 'visitor') out.push({ at: d, kind: 'title', icon: t.icon, name: t.name, desc: t.desc })
    prev = { level: lv.level, ach: new Set([...prev.ach, ...ach]), titles: new Set([...prev.titles, ...titles]) }
  }
  const order = { level: 0, reward: 1, title: 2, ach: 3 }
  return out.sort((a, b) => b.at.localeCompare(a.at) || order[a.kind] - order[b.kind])
}
