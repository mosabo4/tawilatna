import { scoringOf } from './scoring'
// كل الحسابات تتم على الجهاز من البيانات الكاملة (العدد صغير)

// الإضافات المعروفة (احتياط لين يشتغل تحديث القاعدة)
const EXP_FALLBACK = {
  'Catan: 5–6 Player Extension': 'Catan', 'Catan: Cities & Knights': 'Catan',
  'Clank! Adventuring Party': 'Clank!: A Deck-Building Adventure', 'Coup: Reformation': 'Coup',
}
const CAT_FIX = { 'The Vale of Eternity': 'family', '7 Wonders': 'family' }
export function buildIndex(data) {
  // اسم مستعار (ليفل 13): ساعتين، الاسم الأصلي يبقى في realName
  const nicks = new Map()
  for (const x of data.actions || []) if (x.kind === 'nick' && x.target && x.data?.name && Date.now() - new Date(x.created_at).getTime() < 2 * 3600e3 && !nicks.has(x.target)) nicks.set(x.target, x.data.name)
  data = { ...data, players: data.players.map(p => (nicks.has(p.id) ? { ...p, realName: p.name, name: nicks.get(p.id) } : p)) }
  const players = new Map(data.players.map(p => [p.id, p]))
  const byName = new Map(data.games.map(g => [g.name, g]))
  const allGames = data.games.map(g => {
    const base = g.base_game_id !== undefined && g.base_game_id !== null ? g.base_game_id : (EXP_FALLBACK[g.name] ? byName.get(EXP_FALLBACK[g.name])?.id || null : null)
    return { ...g, base_game_id: base, scoring: scoringOf(g), category: (g.shelf_order === undefined && CAT_FIX[g.name]) || g.category }
  })
  const games = new Map(allGames.map(g => [g.id, g]))
  const expansionsOf = new Map()
  for (const g of allGames) if (g.base_game_id && games.has(g.base_game_id)) {
    if (!expansionsOf.has(g.base_game_id)) expansionsOf.set(g.base_game_id, [])
    expansionsOf.get(g.base_game_id).push(g)
  }
  const expOfPlay = new Map()
  for (const pe of data.playExp || []) { if (!expOfPlay.has(pe.play_id)) expOfPlay.set(pe.play_id, []); expOfPlay.get(pe.play_id).push(pe.game_id) }
  const resultsByPlay = new Map()
  for (const r of data.results) {
    if (!resultsByPlay.has(r.play_id)) resultsByPlay.set(r.play_id, [])
    resultsByPlay.get(r.play_id).push(r)
  }
  // تبديل المركز (ليفل 15): ياخذ مركز اللي قدّامه في قيم متعادل بالنقاط
  for (const x of data.actions || []) if (x.kind === 'swap' && x.play_id && x.target) {
    const arr = resultsByPlay.get(x.play_id); if (!arr) continue
    const i = arr.findIndex(r => r.player_id === x.player_id), j = arr.findIndex(r => r.player_id === x.target)
    if (i < 0 || j < 0) continue
    const a2 = { ...arr[i], position: arr[j].position }, b2 = { ...arr[j], position: arr[i].position }
    arr[i] = a2; arr[j] = b2
  }
  for (const arr of resultsByPlay.values()) arr.sort((a, b) => a.position - b.position)
  // plays: الأحدث أولاً، ومع كل قيم نتائجه
  const plays = data.plays
    .filter(p => games.has(p.game_id))
    .map(p => {
      const g = games.get(p.game_id)
      const exps = [...new Set([...(expOfPlay.get(p.id) || []), ...(g.base_game_id ? [g.id] : [])])]
      return { ...p, game_id: g.base_game_id && games.has(g.base_game_id) ? g.base_game_id : p.game_id, expansions: exps, results: resultsByPlay.get(p.id) || [] }
    })
    .sort((a, b) => b.played_on.localeCompare(a.played_on) || (b.created_at || '').localeCompare(a.created_at || ''))
  const baseGames = allGames.filter(g => !(g.base_game_id && games.has(g.base_game_id)))
  return { ...data, games: baseGames, allGames, expansionsOf, playersById: players, gamesById: games, plays }
}

// ---------- الترتيب ----------
// كل قيم: نقطة عن كل لاعب خلّصت قدّامه، ونص نقطة لو تعادلتوا.
// المستوى = نقاطك ÷ كل اللي لعبت ضدهم (نسبة مئوية). الألعاب التعاونية ما تدخل.
export const levelOf = (beat, faced) => (faced ? Math.round((beat / faced) * 100) : null)
export const counts = (play, game) => play.results.length > 1 && game?.category !== 'coop' && game?.scoring !== 'coop'

export function standings(idx, filter = () => true) {
  const m = new Map(idx.players.map(p => [p.id, { player: p, plays: 0, wins: 0, beat: 0, faced: 0 }]))
  for (const p of idx.plays) {
    const g = idx.gamesById.get(p.game_id)
    if (!counts(p, g) || !filter(p, g)) continue
    for (const r of p.results) {
      const s = m.get(r.player_id); if (!s) continue
      s.plays++; if (r.position === 1) s.wins++
      for (const o of p.results) if (o !== r) { s.faced++; s.beat += o.position > r.position ? 1 : o.position === r.position ? 0.5 : 0 }
    }
  }
  return [...m.values()]
    .map(s => ({ ...s, points: levelOf(s.beat, s.faced), raw: s.faced ? s.beat / s.faced : null }))
    .sort((a, b) => (b.plays > 0) - (a.plays > 0) || (b.points ?? 0) - (a.points ?? 0) || b.wins - a.wins || b.plays - a.plays)
}

const winnersOf = play => play.results.filter(r => r.position === 1).map(r => r.player_id)

export function playerStats(idx, playerId) {
  const mine = idx.plays.filter(p => p.results.some(r => r.player_id === playerId))
  let wins = 0, podiums = 0, rel = 0, beat = 0, faced = 0
  const perGame = new Map()
  for (const p of mine) {
    const r = p.results.find(x => x.player_id === playerId)
    const n = p.results.length
    const won = r.position === 1
    if (won) wins++
    if (r.position <= 3 && n > 1) podiums++
    if (n > 1) {
      let b = 0
      for (const o of p.results) if (o !== r) b += o.position > r.position ? 1 : o.position === r.position ? 0.5 : 0
      rel += b / (n - 1)
      if (counts(p, idx.gamesById.get(p.game_id))) { beat += b; faced += n - 1 }
    } else rel += 0.5
    const g = perGame.get(p.game_id) || { plays: 0, wins: 0 }
    g.plays++; if (won) g.wins++
    perGame.set(p.game_id, g)
  }
  // سلسلة الفوز الحالية وأطول سلسلة (بترتيب زمني)
  let current = 0, best = 0, run = 0
  const chrono = [...mine].reverse()
  for (const p of chrono) {
    if (winnersOf(p).includes(playerId)) { run++; best = Math.max(best, run) } else run = 0
  }
  current = run
  const games = [...perGame.entries()].map(([gid, v]) => ({ game: idx.gamesById.get(gid), ...v }))
  const mostPlayed = [...games].sort((a, b) => b.plays - a.plays)[0]
  const bestGame = [...games].filter(g => g.wins > 0).sort((a, b) => b.wins - a.wins || (b.wins / b.plays) - (a.wins / a.plays))[0]
  const myRatings = idx.ratings.filter(r => r.player_id === playerId).sort((a, b) => b.score - a.score)
  const favorite = myRatings[0] ? { game: idx.gamesById.get(myRatings[0].game_id), score: myRatings[0].score } : null
  return {
    plays: mine.length, wins, podiums,
    winRate: mine.length ? wins / mine.length : 0,
    avgFinish: mine.length ? rel / mine.length : 0,
    points: levelOf(beat, faced), beat, faced,
    currentStreak: current, bestStreak: best,
    games, mostPlayed, bestGame, favorite, ratedCount: myRatings.length,
    lastPlayed: mine[0]?.played_on || null,
    recent: mine.slice(0, 8),
  }
}

export const leaderboard = idx => standings(idx)

export function gameStats(idx, gameId) {
  const plays = idx.plays.filter(p => p.game_id === gameId)
  const ratings = idx.ratings.filter(r => r.game_id === gameId)
  const avg = ratings.length ? ratings.reduce((s, r) => s + Number(r.score), 0) / ratings.length : null
  const wins = new Map()
  let topScore = null
  for (const p of plays) {
    for (const w of winnersOf(p)) wins.set(w, (wins.get(w) || 0) + 1)
    for (const r of p.results) if (r.score != null && (!topScore || r.score > topScore.score)) topScore = { score: r.score, player_id: r.player_id, played_on: p.played_on }
  }
  const appearances = new Map()
  for (const p of plays) for (const r of p.results) appearances.set(r.player_id, (appearances.get(r.player_id) || 0) + 1)
  const champions = [...wins.entries()].map(([id, w]) => ({ player: idx.playersById.get(id), wins: w, plays: appearances.get(id) || 0 }))
    .filter(x => x.player).sort((a, b) => b.wins - a.wins)
  return { plays, ratings, avg, champions, topScore, lastPlayed: plays[0]?.played_on || null }
}

export function allGameStats(idx) {
  return idx.games.map(g => ({ game: g, ...gameStats(idx, g.id) }))
}

export function versus(idx, a, b) {
  let aAhead = 0, bAhead = 0, tie = 0
  const shared = []
  for (const p of idx.plays) {
    const ra = p.results.find(r => r.player_id === a)
    const rb = p.results.find(r => r.player_id === b)
    if (!ra || !rb) continue
    shared.push(p)
    if (ra.position < rb.position) aAhead++
    else if (rb.position < ra.position) bAhead++
    else tie++
  }
  return { shared, aAhead, bAhead, tie }
}

export function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((now - d) / 86400000)
}

// ملك اللعبة: أكثر واحد فاز فيها (3 فوز على الأقل، ولازم يكون قدّام الثاني)
export function kingOf(idx, gameId) {
  const w = new Map()
  for (const p of idx.plays) if (p.game_id === gameId && p.results.length > 1) for (const r of p.results) if (r.position === 1) w.set(r.player_id, (w.get(r.player_id) || 0) + 1)
  const s = [...w.entries()].sort((a, b) => b[1] - a[1])
  if (!s.length || s[0][1] < 3 || (s[1] && s[1][1] === s[0][1])) return null
  return { player: idx.playersById.get(s[0][0]), wins: s[0][1], gap: s[0][1] - (s[1]?.[1] || 0) }
}
