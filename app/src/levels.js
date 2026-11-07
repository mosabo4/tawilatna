// نظام الليفلات: يقيس التفاعل والحضور (مو المهارة). كل شي يتحسب من البيانات المسجلة.
import { counts } from './stats'

export const XP_RULES = [
  { id: 'session', icon: '📅', label: 'حضور جلسة (كل يوم لعب)', xp: 30 },
  { id: 'play', icon: '🎲', label: 'كل قيم تلعبه', xp: 10 },
  { id: 'newgame', icon: '🆕', label: 'لعبة تجربها لأول مرة', xp: 15 },
  { id: 'rate', icon: '⭐', label: 'تقييم لعبة', xp: 5 },
  { id: 'comment', icon: '💬', label: 'تعليق على لعبة', xp: 5 },
  { id: 'win', icon: '🏆', label: 'الفوز في قيم', xp: 5 },
  { id: 'picks', icon: '🙋', label: 'تختار ألعاب للجلسة الجاية (مرة لكل جلسة)', xp: 5 },
  { id: 'post', icon: '📝', label: 'كتابة في اللوحة (3 باليوم بالكثير)', xp: 2 },
  { id: 'streak', icon: '🔥', label: 'كل 3 جلسات ورا بعض', xp: 50 },
  { id: 'setup', icon: '🧱', label: 'تجهيز لعبة ثقيلة', xp: 20 },
  { id: 'cleanup', icon: '🧹', label: 'ترتيب لعبة ثقيلة بعد القيم', xp: 15 },
]
const XP = Object.fromEntries(XP_RULES.map(r => [r.id, r.xp]))

// XP المطلوب للوصول لليفل L (تراكمي): 150، 600، 1350، 2400، 3750...
// جلسة عادية تعطي حوالي 100–150، يعني ليفل 5 يبي قرابة 20 جلسة، وليفل 10 أكثر من 100
export const xpFor = L => 150 * (L - 1) ** 2
export const levelFromXp = xp => { let L = 1; while (xpFor(L + 1) <= xp) L++; return L }

export const TITLES = [
  [1, 'زائر الطاولة'], [3, 'من الشلة'], [5, 'لاعب ثابت'], [8, 'خبير الدولاب'], [10, 'أسطورة الطاولة'],
]
export const titleOf = L => TITLES.filter(([l]) => l <= L).at(-1)[1]

// الجوائز (أكثر من وحدة ممكن تكون في نفس الليفل)
export const REWARDS = [
  { level: 2, icon: '🎨', name: 'الألوان', desc: 'تختار لون حسابك ولون لبس شخصيتك' },
  { level: 3, icon: '🏷️', name: 'لقب جنب اسمك', desc: 'شارة لقب بتصميم خاص تطلع جنب اسمك' },
  { level: 3, icon: '🕶️', name: 'نظارات للشخصية', desc: 'شمسية أو طبية' },
  { level: 4, icon: '🥈', name: 'إطار فضي', desc: 'أول إطار لصورتك' },
  { level: 4, icon: '😂', name: 'ردود فعل', desc: 'إيموجي على كتابات اللوحة' },
  { level: 5, icon: '📌', name: 'تثبيت كتابة', desc: 'كتابة وحدة لك فوق اللوحة' },
  { level: 5, icon: '🎩', name: 'قبعات للشخصية', desc: 'كاوبوي، برنيطة، كاب، شماغ' },
  { level: 5, icon: '💡', name: 'إطار نيون', desc: 'إطار يتوهج ويتنفس' },
  { level: 6, icon: '🔥', name: 'تقييم 11 من 10', desc: 'تعطي لعبة وحدة من كل تصنيف 11 من 10، كأنها المفضلة عندك فيه' },
  { level: 6, icon: '😭', name: 'الطقطقة', desc: 'تلزّق ملصق على صورة واحد من الشلة 3 أيام، مرة بالأسبوع' },
  { level: 6, icon: '🔥', name: 'إطار نار', desc: 'إطار يولّع' },
  { level: 7, icon: '🎭', name: 'مسرح الرئيسية', desc: 'تحط مشهد متحرك في الرئيسية: شخصيتك تضرب أو تطقطق أو ترقص مع واحد من الشلة' },
  { level: 7, icon: '🥇', name: 'إطار ذهبي', desc: 'ذهبي يلف حول صورتك' },
  { level: 8, icon: '⚔️', name: 'تحدي رسمي', desc: 'قيم واحد ضد واحد ينحفظ في سجل التحديات' },
  { level: 8, icon: '✨', name: 'هالة للشخصية', desc: 'نار أو كهرباء أو ذهب حول شخصيتك' },
  { level: 8, icon: '⚡', name: 'إطار كهرباء', desc: 'شرارات حول صورتك' },
  { level: 9, icon: '🎯', name: 'اقتراح مميز', desc: 'مرة بالشهر تثبّت لعبة فوق اختيارات الجلسة' },
  { level: 9, icon: '🌈', name: 'إطار قوس قزح', desc: 'ألوان تدور حول صورتك' },
  { level: 10, icon: '🌌', name: 'بروفايل أسطوري', desc: 'خلفية متحركة لصفحتك واسمك بتدرّج' },
  { level: 10, icon: '👑', name: 'التاج', desc: 'تاج فوق صورتك، وتاج لشخصيتك' },
  { level: 12, icon: '💎', name: 'إطار ماسي', desc: 'أندر إطار في الطاولة' },
  { level: 15, icon: '🏛️', name: 'صانع الجوائز', desc: 'تخترع جائزة تنضاف لملخص الشهر الجاي' },
]

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎲', name: 'البداية', desc: 'لعبت أول قيم', xp: 10, test: s => s.plays >= 1 },
  { id: 'firstwin', icon: '🏆', name: 'أول انتصار', desc: 'فزت لأول مرة', xp: 10, test: s => s.wins >= 1 },
  { id: 'g5', icon: '📗', name: 'فضولي', desc: 'جربت 10 ألعاب مختلفة', xp: 40, test: s => s.games >= 10, prog: s => [s.games, 10] },
  { id: 'g10', icon: '📘', name: 'مستكشف', desc: 'جربت 20 لعبة مختلفة', xp: 80, test: s => s.games >= 20, prog: s => [s.games, 20] },
  { id: 'g20', icon: '📚', name: 'موسوعة', desc: 'جربت 35 لعبة مختلفة', xp: 150, test: s => s.games >= 35, prog: s => [s.games, 35] },
  { id: 's5', icon: '📅', name: 'حاضر', desc: 'حضرت 10 جلسات', xp: 50, test: s => s.sessions >= 10, prog: s => [s.sessions, 10] },
  { id: 's15', icon: '🗓️', name: 'ما يفوّت', desc: 'حضرت 25 جلسة', xp: 120, test: s => s.sessions >= 25, prog: s => [s.sessions, 25] },
  { id: 's30', icon: '🏠', name: 'ساكن الطاولة', desc: 'حضرت 50 جلسة', xp: 250, test: s => s.sessions >= 50, prog: s => [s.sessions, 50] },
  { id: 'streak3', icon: '🔥', name: 'على النار', desc: 'فزت 4 أقيام ورا بعض', xp: 80, test: s => s.bestWinStreak >= 4, prog: s => [s.bestWinStreak, 4] },
  { id: 'cats4', icon: '🌈', name: 'متعدد المواهب', desc: 'لعبت من 5 تصانيف مختلفة', xp: 50, test: s => s.cats >= 5, prog: s => [s.cats, 5] },
  { id: 'catwins', icon: '👑', name: 'ملك متنقل', desc: 'فزت في 4 تصانيف مختلفة', xp: 80, test: s => s.winCats >= 4, prog: s => [s.winCats, 4] },
  { id: 'rate10', icon: '⭐', name: 'الناقد', desc: 'قيّمت 20 لعبة', xp: 40, test: s => s.ratings >= 20, prog: s => [s.ratings, 20] },
  { id: 'comm5', icon: '💬', name: 'صاحب رأي', desc: 'علّقت على 10 ألعاب', xp: 30, test: s => s.comments >= 10, prog: s => [s.comments, 10] },
  { id: 'everyone', icon: '🫂', name: 'صديق الكل', desc: 'لعبت مع كل واحد في الشلة', xp: 30, test: s => s.matesAll, prog: s => [s.mates, s.matesNeeded] },
  { id: 'big', icon: '🏟️', name: 'قيم كبير', desc: 'فزت في قيم فيه 5 لاعبين أو أكثر', xp: 30, test: s => s.bigWin },
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
    const setups = idx.plays.filter(p => (p.setup_by || []).includes(pl.id)).length
    const cleanups = idx.plays.filter(p => (p.cleanup_by || []).includes(pl.id)).length
    const ratings = idx.ratings.filter(r => r.player_id === pl.id).length
    const comments = (idx.comments || []).filter(c => c.player_id === pl.id).length
    const pickWeeks = new Set((idx.picks || []).filter(p => p.player_id === pl.id).map(p => p.week)).size
    const postsByDay = new Map()
    for (const p of (idx.posts || []).filter(p => p.player_id === pl.id)) { const d = p.created_at.slice(0, 10); postsByDay.set(d, (postsByDay.get(d) || 0) + 1) }
    const posts = [...postsByDay.values()].reduce((s, n) => s + Math.min(n, 3), 0)
    const others = idx.players.filter(o => o.id !== pl.id).length

    const s = {
      plays: mine.length, wins, games: seen.size, sessions: myDays.size, cats: cats.size, winCats: winCats.size,
      bestWinStreak, bigWin, ratings, comments, setups, cleanups, mates: mates.size, matesNeeded: others, matesAll: others > 0 && mates.size >= others,
    }
    const parts = {
      session: s.sessions * XP.session, play: s.plays * XP.play, newgame: s.games * XP.newgame, rate: ratings * XP.rate,
      comment: comments * XP.comment, win: wins * XP.win, picks: pickWeeks * XP.picks, post: posts * XP.post, streak: streaks * XP.streak, setup: setups * XP.setup, cleanup: cleanups * XP.cleanup,
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

// نسخة من البيانات قبل وقت معيّن (عشان نحسب كم XP انجمع بعده)
const tsOf = p => p.created_at || `${p.played_on}T12:00:00`
export function idxBefore(idx, iso) {
  return {
    ...idx,
    plays: idx.plays.filter(p => tsOf(p) < iso),
    ratings: idx.ratings.filter(r => !r.updated_at || r.updated_at < iso),
    comments: (idx.comments || []).filter(c => !c.updated_at || c.updated_at < iso),
    posts: (idx.posts || []).filter(p => p.created_at < iso),
    picks: (idx.picks || []).filter(p => !p.created_at || p.created_at < iso),
  }
}

// كم XP أخذ كل لاعب من وقت معيّن، ومن وين
export function xpSince(idx, iso) {
  const now = computeLevels(idx), before = computeLevels(idxBefore(idx, iso))
  const out = new Map()
  for (const [id, a] of now) {
    const b = before.get(id)
    const parts = XP_RULES.map(r => ({ ...r, got: a.parts[r.id] - (b?.parts[r.id] || 0) })).filter(r => r.got > 0)
    const ach = a.achievements.filter(x => x.done && !b?.achievements.find(y => y.id === x.id)?.done)
    out.set(id, { player: a.player, total: a.xp - (b?.xp || 0), parts, ach, from: b?.level || 1, to: a.level })
  }
  return out
}

// سجل الأشياء اللي عطت اللاعب XP (الأحدث أول)
export function xpLog(idx, pid) {
  const G = idx.gamesById
  const ev = []
  const chrono = [...idx.plays].filter(p => p.results.some(r => r.player_id === pid)).sort((a, b) => tsOf(a).localeCompare(tsOf(b)))
  const seenGames = new Set(), seenDays = new Set()
  for (const p of chrono) {
    const at = tsOf(p), g = G.get(p.game_id), name = g?.name || 'لعبة'
    if (!seenDays.has(p.played_on)) { seenDays.add(p.played_on); ev.push({ at, type: 'session', xp: XP.session, text: 'حضر جلسة' }) }
    ev.push({ at, type: 'play', xp: XP.play, text: `لعب ${name}` })
    if (!seenGames.has(p.game_id)) { seenGames.add(p.game_id); ev.push({ at, type: 'newgame', xp: XP.newgame, text: `جرّب ${name} لأول مرة` }) }
    const r = p.results.find(x => x.player_id === pid)
    if (counts(p, g) && r.position === 1) ev.push({ at, type: 'win', xp: XP.win, text: `فاز في ${name}` })
  }
  for (const p of idx.plays) {
    if ((p.setup_by || []).includes(pid)) ev.push({ at: tsOf(p), type: 'setup', xp: XP.setup, text: `جهّز ${G.get(p.game_id)?.name || 'لعبة'}` })
    if ((p.cleanup_by || []).includes(pid)) ev.push({ at: tsOf(p), type: 'cleanup', xp: XP.cleanup, text: `رتّب ${G.get(p.game_id)?.name || 'لعبة'}` })
  }
  for (const r of idx.ratings.filter(x => x.player_id === pid)) ev.push({ at: r.updated_at || '', type: 'rate', xp: XP.rate, text: `قيّم ${G.get(r.game_id)?.name || 'لعبة'}` })
  for (const c of (idx.comments || []).filter(x => x.player_id === pid)) ev.push({ at: c.updated_at || '', type: 'comment', xp: XP.comment, text: `علّق على ${G.get(c.game_id)?.name || 'لعبة'}` })
  const weeks = new Set()
  for (const p of [...(idx.picks || [])].filter(x => x.player_id === pid).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))) {
    if (weeks.has(p.week)) continue; weeks.add(p.week); ev.push({ at: p.created_at || '', type: 'picks', xp: XP.picks, text: 'اختار ألعاب للجلسة' })
  }
  const perDay = new Map()
  for (const p of [...(idx.posts || [])].filter(x => x.player_id === pid).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const d = p.created_at.slice(0, 10); const n = (perDay.get(d) || 0) + 1; perDay.set(d, n)
    if (n <= 3) ev.push({ at: p.created_at, type: 'post', xp: XP.post, text: 'كتب في اللوحة' })
  }
  const icon = Object.fromEntries(XP_RULES.map(r => [r.id, r.icon]))
  return ev.filter(e => e.at).map(e => ({ ...e, icon: icon[e.type] })).sort((a, b) => b.at.localeCompare(a.at))
}
