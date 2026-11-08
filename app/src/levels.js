// نظام المستويات: يقيس التفاعل والحضور (مو المهارة). كل شي يتحسب من البيانات المسجلة.
import { counts } from './stats'
import { resolveActions } from './actions'
import { winXp } from './winxp'
import { achContext, achStats, evalAchievements } from './achievements'

export const XP_RULES = [
  { id: 'session', icon: '📅', label: 'حضور جلسة (كل يوم لعب)', xp: 30 },
  { id: 'play', icon: '🎲', label: 'كل قيم تلعبه', xp: 10 },
  { id: 'newgame', icon: '🆕', label: 'لعبة تجربها لأول مرة', xp: 40 },
  { id: 'rate', icon: '⭐', label: 'تقييم لعبة', xp: 10 },
  { id: 'comment', icon: '💬', label: 'تعليق على لعبة', xp: 5 },
  { id: 'win', icon: '🏆', label: 'الفوز في قيم (حسب الصعوبة والمدة)', xp: 5, range: '+5 → 40' },
  { id: 'picks', icon: '🙋', label: 'تختار ألعاب للجلسة الجاية (مرة لكل جلسة)', xp: 5 },
  { id: 'post', icon: '📝', label: 'كتابة في اللوحة (3 باليوم بالكثير)', xp: 2 },
  { id: 'streak', icon: '🔥', label: 'كل 3 جلسات ورا بعض', xp: 60 },
  { id: 'setup', icon: '🧱', label: 'تجهيز لعبة ثقيلة', xp: 20 },
  { id: 'cleanup', icon: '🧹', label: 'ترتيب لعبة ثقيلة بعد القيم', xp: 15 },
  { id: 'thanks', icon: '🙏', label: 'أحد يشكرك على التجهيز', xp: 20 },
  { id: 'thankGive', icon: '🤝', label: 'تشكر اللي جهّز اللعبة (مستوى 3)', xp: 10 },
  { id: 'predict', icon: '🔮', label: 'توقّع صحيح للفايز (مستوى 8، ويصير +30 من مستوى 15)', xp: 15 },
  { id: 'fullhouse', icon: '👨‍👩‍👦', label: 'جلسة حضرتها العيال كاملة', xp: 20 },
  { id: 'gift', icon: '🎁', label: 'هدية من واحد من العيال', xp: 50 },
  { id: 'lucky', icon: '🍀', label: 'فوز انحط عليه «بالحظ»: ينقص نص XP القيم', xp: 0 },
  { id: 'luckbox', icon: '🎁', label: 'صندوق الحظ (مستوى 4)', xp: 0 },
  { id: 'risk', icon: '⚡', label: 'Double or Nothing: +300 لو فزت، -50 لو خسرت (مستوى 11)', xp: 0 },
  { id: 'godfather', icon: '🤝', label: 'العرّاب: +20 لك، والتلميذ نص XP أقيامك (مستوى 16)', xp: 0 },
  { id: 'box', icon: '💰', label: 'صندوق العيال: تحطه أو تكسبه (مستوى 18)', xp: 0 },
  { id: 'guarantee', icon: '🛟', label: 'ضمان الخاسر: آخر واحد في الجلسة ياخذ +20', xp: 0 },
]
const XP = Object.fromEntries(XP_RULES.map(r => [r.id, r.xp]))

// XP المطلوب للوصول للمستوى L (تراكمي): 300، 720، 1440، 2400، 3600...
export const xpFor = L => (L <= 1 ? 0 : L === 2 ? 300 : Math.round((150 * (L - 1) ** 2 + 150 * (L - 1)) * 0.8 / 10) * 10)
export const levelFromXp = xp => { let L = 1; while (xpFor(L + 1) <= xp) L++; return L }

export const TITLES = [
  [1, 'زائر الطاولة'], [3, 'من العيال'], [5, 'لاعب ثابت'], [8, 'خبير الدولاب'], [10, 'أسطورة الطاولة'],
]
export const titleOf = L => TITLES.filter(([l]) => l <= L).at(-1)[1]

// الجوائز (أكثر من وحدة ممكن تكون في نفس اللمستوى)
export const REWARDS = [
  { level: 2, id: 'color', icon: '🎨', name: 'لون حسابك', desc: 'لون يطلع لك في صورتك وبطاقتك، والكل يشوفه' },
  { level: 2, id: 'reacts', icon: '😂', name: 'ردود فعل', desc: 'إيموجي على كتابات اللوحة' },
  { level: 3, id: 'title', icon: '🏷️', name: 'لقب جنب اسمك', desc: 'تحط جنب اسمك واحد من الألقاب اللي فتحتها' },
  { level: 3, id: 'thanks', icon: '🙏', name: 'شكر المجهّز', desc: 'تشكر اللي جهّز اللعبة الثقيلة: هو ياخذ +20 XP وأنت +10' },
  { level: 3, id: 'story', icon: '📜', name: 'المذكرات', desc: 'تكتب قصة قيم مميز وتنحفظ في سجل العيال' },
  { level: 4, id: 'f-silver', icon: '🥈', name: 'إطار فضي', desc: 'أول إطار لصورتك' },
  { level: 4, id: 'luckbox', icon: '🎁', name: 'صندوق الحظ', desc: 'مرة بالأسبوع تفتح صندوق فيه XP عشوائي' },
  { level: 4, id: 'pin', icon: '📌', name: 'تثبيت كتابة', desc: 'كتابة وحدة لك فوق اللوحة' },
  { level: 5, id: 'vote2', icon: '🗳️', name: 'صوت مضاعف', desc: 'اختياراتك للجلسة الجاية تنحسب صوتين' },
  { level: 6, id: 'tease', icon: '😭', name: 'الطقطقة', desc: 'ملصق على صورة واحد من العيال 3 أيام، مرة بالأسبوع' },
  { level: 6, id: 'eleven', icon: '🔥', name: 'تقييم 11 من 10', desc: 'لعبة وحدة من كل تصنيف تعطيها 11' },
  { level: 6, id: 'pose', icon: '🕺', name: 'وضعية شخصيتك', desc: 'تختار وش وضعية شخصيتك اللي تطلع للكل' },
  { level: 7, id: 'scene', icon: '🎭', name: 'مشهد الرئيسية', desc: 'مشهد متحرك بينك وبين واحد من العيال في الرئيسية' },
  { level: 7, id: 'firstturn', icon: '⏭️', name: 'تجاوز الدور', desc: 'تختار مين يبدأ اللعب في قيم واحد، مرة بالأسبوع' },
  { level: 8, id: 'predict', icon: '🔮', name: 'التوقعات', desc: 'تتوقع الفايز قبل القيم، وإذا صح تاخذ +15 XP' },
  { level: 8, id: 'teampick', icon: '🤜', name: 'اختيار الفريق', desc: 'في الألعاب الجماعية تختار شريكك، مرة بالأسبوع' },
  { level: 8, id: 'weakness', icon: '🎯', name: 'نقطة ضعف الخصم', desc: 'تشوف في صفحة أي لاعب أكثر لعبة يخسر فيها' },
  { level: 9, id: 'baby', icon: '👶', name: 'طقطقة البيبي', desc: 'شخصية واحد تصير بيبي يبكي يوم كامل، مرة بالأسبوع' },
  { level: 9, id: 'f-fire', icon: '🔥', name: 'إطار نار', desc: 'إطار يولّع' },
  { level: 9, id: 'caption', icon: '💬', name: 'التعليق الإجباري', desc: 'جملة تطلع تحت اسم واحد في الترتيب يوم كامل، مرة بالأسبوع' },
  { level: 10, id: 'challenge', icon: '⚔️', name: 'تحدي رسمي', desc: 'تتحدى واحد، وأول قيم بينكم ينحسب في سجل التحديات' },
  { level: 10, id: 'f-gold', icon: '🥇', name: 'إطار ذهبي', desc: 'ذهبي يلف حول صورتك' },
  { level: 10, id: 'nameFx', icon: '🌈', name: 'اسم ملوّن متحرك', desc: 'اسمك بتدرّج ألوان يتحرك في كل مكان' },
  { level: 11, id: 'retitle', icon: '🏷️', name: 'تغيير لقب صاحبك', desc: 'تكتب لقب لواحد من العيال يطلع للكل يوم كامل، مرة بالأسبوع' },
  { level: 11, id: 'flag', icon: '🏳️', name: 'راية الهزيمة', desc: 'اللي تفوز عليه في تحدي رسمي تطلع على صورته راية بيضاء لين يفوز عليك' },
  { level: 11, id: 'risk', icon: '⚡', name: 'Double or Nothing', desc: 'تخاطر على قيم: لو فزت +300 XP، لو خسرت -50' },
  { level: 12, id: 'bg', icon: '🖼️', name: 'خلفية بطاقتك', desc: 'خلفية خاصة لبطاقتك' },
  { level: 12, id: 'celebrate', icon: '🎉', name: 'احتفال الفوز', desc: 'ورق ملوّن يتطاير مع اسمك في صفحة كل قيم تفوزه' },
  { level: 12, id: 'gift', icon: '🎁', name: 'إهداء XP', desc: 'تهدي واحد من العيال 50 XP بدون ما تخسر شي، مرة بالأسبوع' },
  { level: 13, id: 'announce', icon: '📣', name: 'إعلان الهزيمة', desc: 'لما تفوز في تحدي رسمي يطلع إعلان للكل في الرئيسية' },
  { level: 13, id: 'report', icon: '🔒', name: 'تقريرك الخاص', desc: 'إحصائيات مخفية لك بس: مين تغلبه أكثر ومين يغلبك' },
  { level: 13, id: 'nick', icon: '🎭', name: 'اسم مستعار', desc: 'تغيّر اسم واحد في التطبيق ساعتين، مرة بالأسبوع' },
  { level: 14, id: 'veto', icon: '🚫', name: 'الفيتو', desc: 'تشيل لعبة من اختيارات الجلسة الجاية، مرة بالشهر' },
  { level: 14, id: 'guarantee', icon: '🛟', name: 'ضمان الخاسر', desc: 'تفعّله لجلسة: آخر واحد فيها ياخذ +20 XP، مرة بالشهر' },
  { level: 14, id: 'faceSticker', icon: '😜', name: 'ملصق وجهك', desc: 'وجهك يصير ردّ فعل تستخدمه العيال في اللوحة' },
  { level: 15, id: 'lucky', icon: '🍀', name: 'ماسح الفوز', desc: 'تحط «بالحظ 🍀» على فوز واحد: الفوز ينحسب بس ياخذ نص الـXP، مرة بالشهر' },
  { level: 15, id: 'predict2', icon: '🔮', name: 'التوقع المضاعف', desc: 'توقعك الصحيح يعطيك +30 بدال +15' },
  { level: 15, id: 'swap', icon: '🔀', name: 'تبديل المركز', desc: 'إذا تعادلت بالنقاط مع اللي قدّامك تاخذ مركزه، مرة بالشهر' },
  { level: 16, id: 'godfather', icon: '🤝', name: 'العرّاب', desc: 'تختار لاعب أقل منك بمستويين: جلستكم الجاية ياخذ نص XP أقيامك بدون ما تنقص أنت شي، وأنت +20' },
  { level: 16, id: 'gold', icon: '🃏', name: 'الكرت الذهبي', desc: 'بطاقتك تصير كرت لاعب ذهبي' },
  { level: 16, id: 'f-diamond', icon: '💎', name: 'إطار ماسي', desc: 'أندر إطار في الطاولة' },
  { level: 17, id: 'hotseat', icon: '🔥', name: 'الكرسي الساخن', desc: 'تختار واحد لازم الكل يتحداه الجلسة الجاية، مرة بالشهر' },
  { level: 17, id: 'frame2', icon: '🎨', name: 'إطار بألوانك', desc: 'إطار بلونين تختارهم أنت' },
  { level: 17, id: 'opener', icon: '🎬', name: 'لعبة الافتتاح', desc: 'تحدد أول لعبة في الجلسة الجاية، مرة بالشهر' },
  { level: 18, id: 'box', icon: '💰', name: 'صندوق العيال', desc: 'تحط من XP حقك في صندوق، وأول واحد يفوز ياخذه، مرة بالأسبوع' },
  { level: 18, id: 'customTitle', icon: '✍️', name: 'لقب تكتبه بنفسك', desc: 'لقبك أنت تختار كلامه' },
  { level: 18, id: 'legendPage', icon: '🏛️', name: 'صفحة الأسطورة', desc: 'قسم في صفحتك فيه أعظم انتصاراتك' },
  { level: 19, id: 'alert', icon: '📢', name: 'التنبيه الذهبي', desc: 'تنبيه يطلع للكل في أعلى الرئيسية يوم كامل، مرة بالأسبوع' },
  { level: 19, id: 'immune', icon: '🛡️', name: 'الحصانة', desc: 'محد يقدر يطقطق عليك أسبوع كامل، مرة بالشهر' },
  { level: 20, id: 'hall', icon: '🏛️', name: 'قاعة المشاهير', desc: 'صورتك تنحط في الرئيسية كأسطورة' },
  { level: 20, id: 'award', icon: '🛠️', name: 'صانع الجوائز', desc: 'تخترع جائزة تنضاف لقائمة جوائز العيال' },
]
export const levelOfReward = id => REWARDS.find(r => r.id === id)?.level ?? 99


export function computeLevels(idx) {
  const G = idx.gamesById
  const rx = resolveActions(idx)
  const ax = rx.xp
  const pre = []
  const chrono = [...idx.plays].reverse()
  const sessionDays = [...new Set(chrono.map(p => p.played_on))]
  // أيام حضرها كل العيال
  const fullDays = sessionDays.filter(d => { const who = new Set(chrono.filter(p => p.played_on === d).flatMap(p => p.results.map(r => r.player_id))); return idx.players.length > 1 && idx.players.every(pl => who.has(pl.id)) })
  const out = new Map()
  for (const pl of idx.players) {
    const mine = chrono.filter(p => p.results.some(r => r.player_id === pl.id))
    const myDays = new Set(mine.map(p => p.played_on))
    const seen = new Set(), cats = new Set(), winCats = new Set(), mates = new Set()
    let wins = 0, winPts = 0, run = 0, bestWinStreak = 0, bigWin = false
    for (const p of mine) {
      const r = p.results.find(x => x.player_id === pl.id)
      const g = G.get(p.game_id)
      seen.add(p.game_id)
      if (g?.category) cats.add(g.category)
      for (const o of p.results) if (o.player_id !== pl.id) mates.add(o.player_id)
      if (counts(p, g)) {
        if (r.position === 1) { wins++; winPts += winXp(p, g); run++; bestWinStreak = Math.max(bestWinStreak, run); if (g?.category) winCats.add(g.category); if (p.results.length >= 5) bigWin = true } else run = 0
      }
    }
    // جلسات ورا بعض = أيام لعب العيال المتتالية اللي حضرها
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
      comment: comments * XP.comment, win: winPts, picks: pickWeeks * XP.picks, post: posts * XP.post, streak: streaks * XP.streak, setup: setups * XP.setup, cleanup: cleanups * XP.cleanup,
      thanks: ax.get(pl.id)?.thanks || 0, thankGive: ax.get(pl.id)?.thankGive || 0, predict: ax.get(pl.id)?.predict || 0,
      gift: ax.get(pl.id)?.gift || 0, lucky: ax.get(pl.id)?.lucky || 0, luckbox: ax.get(pl.id)?.luckbox || 0, risk: ax.get(pl.id)?.risk || 0,
      godfather: ax.get(pl.id)?.godfather || 0, box: ax.get(pl.id)?.box || 0, guarantee: ax.get(pl.id)?.guarantee || 0, fullhouse: fullDays.filter(d => myDays.has(d)).length * XP.fullhouse,
    }
    pre.push({ pl, s, parts, base: Math.max(0, Object.values(parts).reduce((a, b) => a + b, 0)) })
  }
  // الإنجازات (تحتاج مستويات الكل بدون الإنجازات عشان «العرّاب الناجح»)
  const ctx = achContext(idx, rx)
  const baseLv = new Map(pre.map(x => [x.pl.id, levelFromXp(x.base)]))
  for (const { pl, s, parts, base } of pre) {
    const achievements = evalAchievements(ctx, achStats(idx, pl, ctx, { ...s, levelOf: pid => baseLv.get(pid) || 1 }))
    const achXp = achievements.reduce((t, a) => t + a.xp, 0)
    const xp = Math.max(0, base + achXp)
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
    actions: (idx.actions || []).filter(a => a.created_at < iso),
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
    if (counts(p, g) && r.position === 1) ev.push({ at, type: 'win', xp: winXp(p, g), text: `فاز في ${name}` })
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

