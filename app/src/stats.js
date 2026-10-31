// كل الحسابات تتم على الجهاز من البيانات الكاملة (العدد صغير)

export function buildIndex(data) {
  const players = new Map(data.players.map(p => [p.id, p]))
  const games = new Map(data.games.map(g => [g.id, g]))
  const resultsByPlay = new Map()
  for (const r of data.results) {
    if (!resultsByPlay.has(r.play_id)) resultsByPlay.set(r.play_id, [])
    resultsByPlay.get(r.play_id).push(r)
  }
  for (const arr of resultsByPlay.values()) arr.sort((a, b) => a.position - b.position)
  // plays: الأحدث أولاً، ومع كل قيم نتائجه
  const plays = data.plays
    .filter(p => games.has(p.game_id))
    .map(p => ({ ...p, results: resultsByPlay.get(p.id) || [] }))
    .sort((a, b) => b.played_on.localeCompare(a.played_on) || (b.created_at || '').localeCompare(a.created_at || ''))
  return { ...data, playersById: players, gamesById: games, plays }
}

const winnersOf = play => play.results.filter(r => r.position === 1).map(r => r.player_id)

export function playerStats(idx, playerId) {
  const mine = idx.plays.filter(p => p.results.some(r => r.player_id === playerId))
  let wins = 0, podiums = 0, rel = 0
  const perGame = new Map()
  for (const p of mine) {
    const r = p.results.find(x => x.player_id === playerId)
    const n = p.results.length
    const won = r.position === 1
    if (won) wins++
    if (r.position <= 3 && n > 1) podiums++
    // 1 = أول، 0 = آخر
    rel += n > 1 ? (n - r.position) / (n - 1) : 1
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
    currentStreak: current, bestStreak: best,
    games, mostPlayed, bestGame, favorite, ratedCount: myRatings.length,
    lastPlayed: mine[0]?.played_on || null,
    recent: mine.slice(0, 8),
  }
}

export function leaderboard(idx) {
  return idx.players
    .map(p => ({ player: p, ...playerStats(idx, p.id) }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays)
}

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
