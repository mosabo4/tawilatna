// نظام الليفلات: يقيس التفاعل والحضور (مو المهارة). كل شي يتحسب من البيانات المسجلة.
import { counts } from './stats'

export const XP_RULES = [
  { id: 'session', icon: '📅', label: 'حضور جلسة (كل يوم لعب)', xp: 30 },
  { id: 'play', icon: '🎲', label: 'كل قيم تلعبه', xp: 10 },
  { id: 'newgame', icon: '🆕', label: 'لعبة تجربها لأول مرة', xp: 25 },
  { id: 'rate', icon: '⭐', label: 'تقييم لعبة', xp: 5 },
  { id: 'comment', icon: '💬', label: 'تعليق على لعبة', xp: 5 },
  { id: 'win', icon: '🏆', label: 'الفوز في قيم', xp: 5 },
  { id: 'picks', icon: '🙋', label: 'تختار ألعاب للجلسة الجاية (مرة لكل جلسة)', xp: 5 },
  { id: 'post', icon: '📝', label: 'كتابة في اللوحة (3 باليوم بالكثير)', xp: 2 },
  { id: 'streak', icon: '🔥', label: 'كل 3 جلسات ورا بعض', xp: 50 },
]
const XP = Object.fromEntries(XP_RULES.map(r => [r.id, r.xp]))

// XP المطلوب للوصول لليفل L (تراكمي): 100، 300، 600، 1000، 1500...
export const xpFor = L => 50 * (L - 1) * L
export const levelFromXp = xp => { let L = 1; while (xpFor(L + 1) <= xp) L++; return L }

export const TITLES = [
  [1, 'زائر الطاولة'], [2, 'لاعب جديد'], [3, 'من الشلة'], [4, 'صاحب حضور'], [5, 'لاعب ثابت'],
  [6, 'قلب الجلسة'], [7, 'محترف الطاولة'], [8, 'خبير الدولاب'], [9, 'شيخ اللعّيبة'], [10, 'أسطورة الطاولة'],
  [12, 'أسطورة حيّة'], [15, 'خالد في الطاولة'],
]
export const titleOf = L => TITLES.filter(([l]) => l <= L).at(-1)[1]

export const REWARDS = [
  { level: 2, icon: '🎨', name: 'لون حسابك', desc: 'تختار لون دائرتك بنفسك' },
  { level: 3, icon: '🏷️', name: 'لقب جنب اسمك', desc: 'تختار لقب من ألقاب الملخص اللي فزت فيها، ويطلع جنب اسمك' },
  { level: 4, icon: '🥈', name: 'إطار فضي', desc: 'إطار فضي حول صورتك في كل مكان' },
  { level: 5, icon: '📌', name: 'تثبيت كتابة', desc: 'تثبّت كتابة وحدة فوق لوحة الشلة' },
  { level: 6, icon: '😂', name: 'ردود فعل', desc: 'تحط إيموجي على أقيام الشلة وكتاباتهم' },
  { level: 7, icon: '🥇', name: 'إطار ذهبي متحرك', desc: 'إطار ذهبي يلمع حول صورتك' },
  { level: 8, icon: '⚔️', name: 'تحدي رسمي', desc: 'تتحدى لاعب في قيم واحد ضد واحد، وينحفظ في سجل التحديات' },
  { level: 9, icon: '🎯', name: 'اقتراح مميز', desc: 'مرة بالشهر تثبّت لعبة كاقتراح مميز للجلسة الجاية' },
  { level: 10, icon: '🌌', name: 'بروفايل أسطوري', desc: 'خلفية خاصة لصفحتك، واسمك يطلع بلون مميز' },
  { level: 12, icon: '💎', name: 'إطار ماسي', desc: 'أندر إطار في الطاولة' },
  { level: 15, icon: '🏛️', name: 'صانع الجوائز', desc: 'تخترع جائزة جديدة تنضاف لملخص الشهر الجاي' },
]

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎲', name: 'البداية', desc: 'لعبت أول قيم', xp: 20, test: s => s.plays >= 1 },
  { id: 'firstwin', icon: '🏆', name: 'أول انتصار', desc: 'فزت لأول مرة', xp: 20, test: s => s.wins >= 1 },
  { id: 'g5', icon: '📗', name: 'فضولي', desc: 'جربت 5 ألعاب مختلفة', xp: 30, test: s => s.games >= 5, prog: s => [s.games, 5] },
  { id: 'g10', icon: '📘', name: 'مستكشف', desc: 'جربت 10 ألعاب مختلفة', xp: 60, test: s => s.games >= 10, prog: s => [s.games, 10] },
  { id: 'g20', icon: '📚', name: 'موسوعة', desc: 'جربت 20 لعبة مختلفة', xp: 100, test: s => s.games >= 20, prog: s => [s.games, 20] },
  { id: 's5', icon: '📅', name: 'حاضر', desc: 'حضرت 5 جلسات', xp: 30, test: s => s.sessions >= 5, prog: s => [s.sessions, 5] },
  { id: 's15', icon: '🗓️', name: 'ما يفوّت', desc: 'حضرت 15 جلسة', xp: 80, test: s => s.sessions >= 15, prog: s => [s.sessions, 15] },
  { id: 's30', icon: '🏠', name: 'ساكن الطاولة', desc: 'حضرت 30 جلسة', xp: 150, test: s => s.sessions >= 30, prog: s => [s.sessions, 30] },
  { id: 'streak3', icon: '🔥', name: 'على النار', desc: 'فزت 3 أقيام ورا بعض', xp: 50, test: s => s.bestWinStreak >= 3, prog: s => [s.bestWinStreak, 3] },
  { id: 'cats4', icon: '🌈', name: 'متعدد المواهب', desc: 'لعبت من 4 تصانيف مختلفة', xp: 40, test: s => s.cats >= 4, prog: s => [s.cats, 4] },
  { id: 'catwins', icon: '👑', name: 'ملك متنقل', desc: 'فزت في 3 تصانيف مختلفة', xp: 60, test: s => s.winCats >= 3, prog: s => [s.winCats, 3] },
  { id: 'rate10', icon: '⭐', name: 'الناقد', desc: 'قيّمت 10 ألعاب', xp: 30, test: s => s.ratings >= 10, prog: s => [s.ratings, 10] },
  { id: 'comm5', icon: '💬', name: 'صاحب رأي', desc: 'علّقت على 5 ألعاب', xp: 20, test: s => s.comments >= 5, prog: s => [s.comments, 5] },
  { id: 'everyone', icon: '🫂', name: 'صديق الكل', desc: 'لعبت مع كل واحد في الشلة', xp: 40, test: s => s.matesAll, prog: s => [s.mates, s.matesNeeded] },
  { id: 'big', icon: '🏟️', name: 'قيم كبير', desc: 'فزت في قيم فيه 5 لاعبين أو أكثر', xp: 40, test: s => s.bigWin },
]

export function computeLevels(idx) {
  const G = idx.gamesById
  const chrono = [...idx.plays].reverse()
  const sessionDays = [...new Set(chrono.map(p => p.played_on))]
  const out = new Map()
  for (const pl of idx.players) {
    const mine = chrono.filter(p => p.results.some(r => r.player_id === pl.id))
    const myDays = new Set(mine.map(p => p.played_on))
    const seen = new Set(), cats = new Set(), winCats = new Set(), mates = new Set()
    let wins = 0, run = 0, bestWinStreak = 0, bigWin = false
    for (const p of mine) {
      const r = p.results.find(x => x.player_id === pl.id)
      const g = G.get(p.game_id)
      seen.add(p.game_id)
      if (g?.category) cats.add(g.category)
      for (const o of p.results) if (o.player_id !== pl.id) mates.add(o.player_id)
      if (counts(p, g)) {
        if (r.position === 1) { wins++; run++; bestWinStreak = Math.max(bestWinStreak, run); if (g?.category) winCats.add(g.category); if (p.results.length >= 5) bigWin = true } else run = 0
      }
    }
    // جلسات ورا بعض = أيام لعب الشلة المتتالية اللي حضرها
    let srun = 0, streaks = 0
    for (const d of sessionDays) { if (myDays.has(d)) { srun++; if (srun % 3 === 0) streaks++ } else srun = 0 }
    const ratings = idx.ratings.filter(r => r.player_id === pl.id).length
    const comments = (idx.comments || []).filter(c => c.player_id === pl.id).length
    const pickWeeks = new Set((idx.picks || []).filter(p => p.player_id === pl.id).map(p => p.week)).size
    const postsByDay = new Map()
    for (const p of (idx.posts || []).filter(p => p.player_id === pl.id)) { const d = p.created_at.slice(0, 10); postsByDay.set(d, (postsByDay.get(d) || 0) + 1) }
    const posts = [...postsByDay.values()].reduce((s, n) => s + Math.min(n, 3), 0)
    const others = idx.players.filter(o => o.id !== pl.id).length

    const s = {
      plays: mine.length, wins, games: seen.size, sessions: myDays.size, cats: cats.size, winCats: winCats.size,
      bestWinStreak, bigWin, ratings, comments, mates: mates.size, matesNeeded: others, matesAll: others > 0 && mates.size >= others,
    }
    const parts = {
      session: s.sessions * XP.session, play: s.plays * XP.play, newgame: s.games * XP.newgame, rate: ratings * XP.rate,
      comment: comments * XP.comment, win: wins * XP.win, picks: pickWeeks * XP.picks, post: posts * XP.post, streak: streaks * XP.streak,
    }
    const achievements = ACHIEVEMENTS.map(a => ({ ...a, done: !!a.test(s), progress: a.prog ? a.prog(s) : null }))
    const achXp = achievements.filter(a => a.done).reduce((t, a) => t + a.xp, 0)
    const xp = Object.values(parts).reduce((a, b) => a + b, 0) + achXp
    const level = levelFromXp(xp)
    const cur = xpFor(level), next = xpFor(level + 1)
    out.set(pl.id, {
      player: pl, xp, level, title: titleOf(level), parts, achXp, achievements, stats: s,
      into: xp - cur, need: next - cur, progress: (xp - cur) / (next - cur),
      nextReward: REWARDS.find(r => r.level > level) || null,
    })
  }
  return out
}
