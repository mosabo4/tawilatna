// حسابات ملخص الشهر (للمسؤول وقت العرض). كل شي يتحسب من البيانات الموجودة.
import { standings, counts } from './stats'
import { CATEGORIES } from './categories'

export const MIN_PLAYS = 3 // أقل عدد أقيام عشان يدخل اللاعب في الجوائز
const monthOf = d => d.slice(0, 7)
export function prevMonth(m) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const monthName = m => new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }).format(new Date(m + '-01T00:00:00'))

export function availableMonths(idx) {
  const s = new Set(idx.plays.map(p => monthOf(p.played_on)))
  s.add(new Date().toISOString().slice(0, 7))
  return [...s].sort().reverse()
}

const best = (arr, key, min = 1) => {
  const top = Math.max(-Infinity, ...arr.map(key))
  return top >= min ? { value: top, items: arr.filter(x => key(x) === top) } : null
}

export function buildRecap(idx, month) {
  const P = idx.playersById, G = idx.gamesById
  const inMonth = p => monthOf(p.played_on) === month
  const plays = idx.plays.filter(inMonth).slice().reverse() // من الأقدم للأحدث
  const ranked = plays.filter(p => counts(p, G.get(p.game_id)))
  const prev = prevMonth(month)
  const prevPlays = idx.plays.filter(p => monthOf(p.played_on) === prev)

  // ---------- الأرقام العامة ----------
  const days = [...new Set(plays.map(p => p.played_on))]
  const minutes = plays.reduce((s, p) => s + (G.get(p.game_id)?.play_minutes || 0), 0)
  const gameIds = [...new Set(plays.map(p => p.game_id))]
  const firstEver = new Map()
  for (const p of [...idx.plays].reverse()) if (!firstEver.has(p.game_id)) firstEver.set(p.game_id, p.played_on)
  const newGames = gameIds.filter(id => monthOf(firstEver.get(id)) === month).map(id => G.get(id)).filter(Boolean)
  const busiestDay = best(days.map(d => ({ d, n: plays.filter(p => p.played_on === d).length })), x => x.n, 2)

  // ---------- الترتيب ----------
  const table = standings(idx, inMonth).filter(r => r.plays > 0)
  const prevTable = standings(idx, p => monthOf(p.played_on) === prev).filter(r => r.plays > 0)
  const prevRank = new Map(prevTable.map((r, i) => [r.player.id, i + 1]))
  const tableWithMove = table.map((r, i) => ({ ...r, rank: i + 1, prev: prevRank.get(r.player.id) ?? null }))
  const eligible = tableWithMove.filter(r => r.plays >= MIN_PLAYS)

  // ---------- تفاصيل كل لاعب في الشهر ----------
  const per = new Map(idx.players.map(p => [p.id, { player: p, plays: 0, wins: 0, seconds: 0, lasts: 0, days: new Set(), streak: 0, bestStreak: 0, games: new Map(), scores: [] }]))
  for (const p of ranked) {
    const n = p.results.length
    const lastPos = Math.max(...p.results.map(r => r.position))
    const lastCount = p.results.filter(r => r.position === lastPos).length
    for (const r of p.results) {
      const s = per.get(r.player_id); if (!s) continue
      s.plays++; s.days.add(p.played_on)
      s.games.set(p.game_id, (s.games.get(p.game_id) || 0) + 1)
      if (r.position === 1) { s.wins++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak) } else s.streak = 0
      if (r.position === 2 && n > 2) s.seconds++
      if (r.position === lastPos && lastCount === 1 && n > 2) s.lasts++
      if (r.score != null) s.scores.push({ score: Number(r.score), game: G.get(p.game_id), date: p.played_on })
    }
  }
  const people = [...per.values()].filter(s => s.plays > 0)

  // ---------- الجوائز ----------
  const awards = []
  const add = (id, icon, title, desc, found, text) => awards.push({ id, icon, title, desc, ...(found ? { who: found.items.map(x => x.player), text: text(found) } : { empty: true }) })
  add('mvp', '👑', 'لاعب الشهر', `أعلى مستوى (بشرط ${MIN_PLAYS} أقيام على الأقل)`, best(eligible, r => r.points, 0), f => `مستواه ${f.value}%`)
  add('wins', '🏆', 'ملك الفوز', 'أكثر واحد جاء الأول', best(people, s => s.wins), f => `${f.value} فوز`)
  add('streak', '🔥', 'أطول سلسلة فوز', 'أكثر فوز ورا بعض في الشهر', best(people, s => s.bestStreak, 2), f => `${f.value} فوز ورا بعض`)
  add('second', '🥈', 'ملك المركز الثاني', 'قريب دايم… بس مو الأول', best(people, s => s.seconds, 2), f => `جاء الثاني ${f.value} مرات`)
  add('attend', '📅', 'الأكثر حضوراً', 'حضر أكثر جلسات', best(people.map(s => ({ ...s, d: s.days.size })), s => s.d, 1), f => `حضر ${f.value} من ${days.length} أيام لعب`)
  add('busy', '🎲', 'ما يشبع لعب', 'لعب أكثر عدد أقيام', best(people, s => s.plays, 1), f => `${f.value} قيم`)
  add('last', '🫠', 'صديق المركز الأخير', 'أكثر واحد جاء الأخير لحاله (قيم من 3 وفوق)', best(people, s => s.lasts, 2), f => `${f.value} مرات`)
  add('variety', '🧭', 'المغامر', 'جرّب أكثر ألعاب مختلفة', best(people.map(s => ({ ...s, g: s.games.size })), s => s.g, 2), f => `${f.value} ألعاب مختلفة`)
  const climbers = tableWithMove.filter(r => r.prev).map(r => ({ ...r, up: r.prev - r.rank }))
  add('climb', '📈', 'أكبر صعود', `مقارنة بترتيب ${monthName(prev)}`, prevTable.length ? best(climbers, r => r.up, 1) : null, f => `طلع ${f.value} ${f.value === 1 ? 'مركز' : 'مراكز'}`)
  const topScore = best(people.flatMap(s => s.scores.map(x => ({ ...x, player: s.player }))), x => x.score, 1)
  add('score', '💯', 'أعلى نقاط في قيم', 'أعلى رقم انسجل في نتيجة', topScore, f => `${f.value} نقطة في ${f.items[0].game?.name || ''}`)

  // ---------- المواجهات ----------
  const pairs = new Map()
  for (const p of ranked) {
    for (const a of p.results) for (const b of p.results) {
      if (a.player_id >= b.player_id) continue
      const k = a.player_id + '|' + b.player_id
      const v = pairs.get(k) || { a: P.get(a.player_id), b: P.get(b.player_id), n: 0, aw: 0, bw: 0 }
      v.n++; if (a.position < b.position) v.aw++; else if (b.position < a.position) v.bw++
      pairs.set(k, v)
    }
  }
  const pairList = [...pairs.values()].filter(v => v.a && v.b)
  const rival = pairList.filter(v => v.n >= 3).map(v => ({ ...v, gap: Math.abs(v.aw - v.bw), close: Math.abs(v.aw - v.bw) / v.n }))
  const hottest = rival.length ? rival.sort((x, y) => x.close - y.close || y.n - x.n)[0] : null // أقرب مواجهة
  const nemesis = rival.length ? [...rival].sort((x, y) => y.gap - x.gap || y.n - x.n)[0] : null // أكثر سيطرة
  const duo = pairList.length ? [...pairList].sort((x, y) => y.n - x.n)[0] : null

  // ---------- الألعاب ----------
  const gameRows = gameIds.map(id => {
    const ps = plays.filter(p => p.game_id === id)
    const winners = new Set(ps.flatMap(p => p.results.filter(r => r.position === 1).map(r => r.player_id)))
    const rs = idx.ratings.filter(r => r.game_id === id).map(r => Number(r.score))
    const avg = rs.length ? rs.reduce((s, x) => s + x, 0) / rs.length : null
    const spread = rs.length >= 2 ? Math.max(...rs) - Math.min(...rs) : null
    return { game: G.get(id), n: ps.length, winners: winners.size, avg, spread, rs: rs.length }
  }).filter(x => x.game)
  const topGame = best(gameRows, g => g.n, 1)
  const openGame = best(gameRows.filter(g => g.n >= 2), g => g.winners, 2)
  const bestRated = best(gameRows.filter(g => g.avg != null), g => Math.round(g.avg * 10) / 10, 0)
  const split = best(gameRows.filter(g => g.spread != null), g => g.spread, 3)

  // ---------- ملوك التصانيف هالشهر ----------
  const kings = CATEGORIES.filter(c => c.id !== 'coop').map(c => {
    const rows = standings(idx, (p, g) => inMonth(p) && g?.category === c.id).filter(r => r.plays > 0)
    const top = Math.max(0, ...rows.map(r => r.wins))
    return { ...c, n: ranked.filter(p => G.get(p.game_id)?.category === c.id).length, top, who: top ? rows.filter(r => r.wins === top).map(r => r.player) : [] }
  })

  // ---------- تقييمات ونشاط ----------
  const ratingsThisMonth = idx.ratings.filter(r => r.updated_at && monthOf(r.updated_at) === month)
  const missing = people.map(s => ({ player: s.player, n: [...s.games.keys()].filter(g => !idx.ratings.some(r => r.player_id === s.player.id && r.game_id === g)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n)
  const postsThisMonth = (idx.posts || []).filter(p => monthOf(p.created_at) === month)
  const poster = best(idx.players.map(p => ({ player: p, n: postsThisMonth.filter(x => x.player_id === p.id).length })), x => x.n, 1)
  const forgotten = idx.games.filter(g => {
    const last = idx.plays.find(p => p.game_id === g.id)?.played_on
    return !last || (Date.now() - new Date(last + 'T00:00:00')) / 864e5 > 60
  })

  // ---------- شخصيات الشلة (غير الفوز) ----------
  const mine = (pid, list) => list.filter(p => p.results.some(r => r.player_id === pid))
  const allUntil = idx.plays.filter(p => monthOf(p.played_on) <= month)
  const prof = idx.players.map(pl => {
    const ever = mine(pl.id, allUntil), now = mine(pl.id, plays)
    const firstTime = new Map()
    for (const p of [...ever].reverse()) if (!firstTime.has(p.game_id)) firstTime.set(p.game_id, p.played_on)
    const learned = [...firstTime.entries()].filter(([, d]) => monthOf(d) === month).map(([id]) => G.get(id)).filter(Boolean)
    const ws = now.map(p => G.get(p.game_id)?.weight).filter(w => w != null).map(Number)
    const cats = new Map()
    for (const p of now) { const c = G.get(p.game_id)?.category; if (c) cats.set(c, (cats.get(c) || 0) + 1) }
    const topCat = [...cats.entries()].sort((x, y) => y[1] - x[1])[0]
    const same = new Map()
    for (const p of now) same.set(p.game_id, (same.get(p.game_id) || 0) + 1)
    const fav = [...same.entries()].sort((x, y) => y[1] - x[1])[0]
    const mates = new Set(now.flatMap(p => p.results.map(r => r.player_id)).filter(id => id !== pl.id))
    const myR = idx.ratings.filter(r => r.player_id === pl.id)
    const avgOthers = gid => { const o = idx.ratings.filter(r => r.game_id === gid && r.player_id !== pl.id).map(r => Number(r.score)); return o.length ? o.reduce((x, y) => x + y, 0) / o.length : null }
    const diffs = myR.map(r => { const o = avgOthers(r.game_id); return o == null ? null : Math.abs(Number(r.score) - o) }).filter(x => x != null)
    return {
      player: pl, n: now.length,
      known: firstTime.size, learned, learnedN: learned.length,
      weight: ws.length >= 2 ? Math.round(ws.reduce((x, y) => x + y, 0) / ws.length * 100) / 100 : null,
      cats: cats.size, topCat, topShare: now.length >= 3 && topCat ? Math.round(topCat[1] / now.length * 100) : 0,
      fav, favN: fav?.[1] || 0,
      mates: mates.size,
      minutes: now.reduce((x, p) => x + (G.get(p.game_id)?.play_minutes || 0), 0),
      owned: plays.filter(p => G.get(p.game_id)?.owner_id === pl.id).length,
      ratedN: myR.length,
      avgGiven: myR.length >= 3 ? Math.round(myR.reduce((x, r) => x + Number(r.score), 0) / myR.length * 10) / 10 : null,
      taste: diffs.length >= 3 ? Math.round(diffs.reduce((x, y) => x + y, 0) / diffs.length * 10) / 10 : null,
      comments: (idx.comments || []).filter(c => c.player_id === pl.id && monthOf(c.updated_at) === month).length,
      picks: (idx.picks || []).filter(p => p.player_id === pl.id).length,
    }
  })
  const catName = id => CATEGORIES.find(c => c.id === id)?.name || ''
  const persona = []
  const addP = (id, icon, title, desc, found, text) => persona.push({ id, icon, title, desc, ...(found ? { who: found.items.map(x => x.player), text: text(found) } : { empty: true }) })
  const low = (arr, key) => { const v = arr.filter(x => key(x) != null); if (!v.length) return null; const m = Math.min(...v.map(key)); return { value: m, items: v.filter(x => key(x) === m) } }
  addP('known', '📚', 'موسوعة الألعاب', 'أكثر واحد لعب ألعاب مختلفة من البداية لين هالشهر', best(prof, x => x.known, 1), f => `يعرف ${f.value} ${f.value === 1 ? 'لعبة' : 'ألعاب'}`)
  addP('learned', '🎓', 'المتعلّم', 'أكثر واحد تعلّم ألعاب جديدة عليه هالشهر', best(prof, x => x.learnedN, 1), f => `تعلّم ${f.value}: ${f.items[0].learned.slice(0, 3).map(g => g.name).join('، ')}`)
  addP('heavy', '🧠', 'عقل الاستراتيجية', 'أعلى متوسط صعوبة للألعاب اللي لعبها (حسب BGG)', best(prof.filter(x => x.weight != null), x => x.weight, 0), f => `متوسط الصعوبة ${f.value} من 5`)
  addP('light', '🎈', 'ملك الجلسات الخفيفة', 'أقل متوسط صعوبة، يحب الضحك والسرعة', low(prof.filter(x => x.n >= 2), x => x.weight), f => `متوسط الصعوبة ${f.value} من 5`)
  addP('fan', '💘', 'الوفي', 'أكثر واحد كرر نفس اللعبة', best(prof, x => x.favN, 3), f => `لعب ${G.get(f.items[0].fav[0])?.name} ${f.value} مرات`)
  addP('special', '🎯', 'المتخصص', 'أغلب أقيامه من تصنيف واحد', best(prof, x => x.topShare, 60), f => `${f.value}% من أقيامه ${catName(f.items[0].topCat[0])}`)
  addP('cats', '🌈', 'المتنوّع', 'لعب من أكثر عدد تصانيف', best(prof, x => x.cats, 2), f => `${f.value} تصانيف مختلفة`)
  addP('social', '🫂', 'الاجتماعي', 'لعب مع أكثر عدد من الشلة', best(prof, x => x.mates, 2), f => `لعب مع ${f.value} من الشلة`)
  addP('hours', '⏱️', 'ساكن الطاولة', 'أكثر وقت لعب هالشهر (تقريبي)', best(prof, x => x.minutes, 30), f => `حوالي ${Math.round(f.value / 6) / 10} ساعة`)
  addP('owner', '🗄️', 'صاحب الدولاب', 'ألعابه هي اللي انلعبت أكثر', best(prof, x => x.owned, 1), f => `${f.value} أقيام من ألعابه`)
  addP('critic', '🧐', 'الناقد القاسي', 'أقل متوسط تقييمات (3 تقييمات وفوق)', low(prof, x => x.avgGiven), f => `يعطي ${f.value} من 10 بالمتوسط`)
  addP('generous', '😍', 'الكريم بالتقييم', 'أعلى متوسط تقييمات', best(prof.filter(x => x.avgGiven != null), x => x.avgGiven, 0), f => `يعطي ${f.value} من 10 بالمتوسط`)
  addP('taste', '🎼', 'ذوقه ذوق الشلة', 'تقييماته أقرب شي لتقييمات الباقين', low(prof, x => x.taste), f => `يفرق عنهم ${f.value} درجة بس`)
  addP('rebel', '🦄', 'عكس التيار', 'تقييماته أبعد شي عن الباقين', best(prof.filter(x => x.taste != null), x => x.taste, 0), f => `يفرق عنهم ${f.value} درجة`)
  addP('comment', '💬', 'المعلّق', 'كتب أكثر تعليقات على الألعاب هالشهر', best(prof, x => x.comments, 1), f => `${f.value} تعليقات`)
  addP('eager', '🙋', 'المتحمس', 'اختار أكثر ألعاب للجلسة الجاية', best(prof, x => x.picks, 1), f => `اختار ${f.value} ألعاب`)
  const knowledge = prof.filter(x => x.known > 0).sort((a, b) => b.known - a.known)

  return {
    persona, knowledge,
    month, prev, plays, ranked, prevPlays,
    numbers: { plays: plays.length, days: days.length, hours: Math.round(minutes / 6) / 10, games: gameIds.length, newGames, busiestDay, prevPlays: prevPlays.length },
    table: tableWithMove, hasPrev: prevTable.length > 0,
    awards, rivals: { hottest, nemesis, duo },
    games: { topGame, openGame, bestRated, split, rows: gameRows.sort((a, b) => b.n - a.n) },
    kings,
    activity: { ratings: ratingsThisMonth.length, missing, posts: postsThisMonth.length, poster, forgotten: forgotten.length, forgottenSample: forgotten.slice(0, 6) },
  }
}
