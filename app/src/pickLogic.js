const SHARES = { 1: [1], 2: [2 / 3, 1 / 3], 3: [1 / 2, 1 / 3, 1 / 6] }
// قسمة الرصيد على الأولويات بأعداد صحيحة مجموعها = الرصيد (لعبة 12، لعبتين 8/4، ثلاث 6/4/2)
export function split(budget, n) {
  const sh = SHARES[n] || []
  const raw = sh.map(x => x * budget), fl = raw.map(Math.floor)
  let left = budget - fl.reduce((a, b) => a + b, 0)
  raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { fl[i]++; left-- } })
  return fl
}

// نظام ترشيح الجلسة الجاية: النظام يرشّح 3 ألعاب ما جرّبها أحد، وكل لاعب يوزّع 12 نقطة على أولوياته
// (من 4 خيارات: الثلاث ألعاب + إعادة الترشيح). حالة الغرفة مشتركة: { round, cands, seen, ballots, note }
export const BUDGET = 12
export const REDO_NEED = 0.51
export const REDO = 'redo'
export const BONUS = 2      // جائزة «هدية نقاط»
export const AGAINST = 3    // جائزة «نقاط سالبة»
export const ordOf = b => (b ? (b.redo ? [REDO] : b.order || []) : [])
export const roundKey = room => (room ? `r${room.round}` : null)

// أوراق الغرفة بشكل أصوات قديمة (week/game_id/player_id/votes) عشان الإنجازات والـXP والرئيسية تظل تشتغل
export function roomToPicks(room) {
  if (!room?.round) return []
  const out = []
  for (const [pid, b] of Object.entries(room.ballots || {})) {
    const o = ordOf(b), sp = split(BUDGET, o.length)
    o.forEach((g, i) => { if (g !== REDO) out.push({ week: roundKey(room), game_id: g, player_id: pid, votes: Math.max(1, sp[i]), created_at: b.at || null }) })
  }
  return out
}

// ألعاب ما لعبها أحد وتكفي t لاعبين
const fits = (g, t) => (!g.min_players || g.min_players <= t) && (g.max_players ? g.max_players >= t : t <= 2)
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
export const freshGames = idx => { const played = new Set(idx.plays.map(p => p.game_id)); return idx.games.filter(g => !played.has(g.id)) }
// نبدأ بالألعاب اللي تكفي كل العيال، ولو خلصت ننزل لأقل عدد، والجديدة (ما طلعت قبل) قبل اللي طلعت
export function drawCands(idx, seen = [], ban = [], count = 3) {
  const fresh = freshGames(idx), n = idx.players.length, out = []
  for (let t = n; t >= 2 && out.length < count; t--) {
    const pool = fresh.filter(g => fits(g, t) && !ban.includes(g.id) && !out.includes(g.id))
    for (const g of [...shuffle(pool.filter(x => !seen.includes(x.id))), ...shuffle(pool.filter(x => seen.includes(x.id)))]) { if (out.length < count) out.push(g.id) }
  }
  return out
}
export const newRoom = (idx, round = 1, note = '') => ({ round, cands: drawCands(idx), seen: [], ballots: {}, note })
// جولة جديدة: ألعاب جديدة وأوراق فاضية. keep = لعبة تبقى (جائزة تمسّك)
export function nextRoom(idx, room, note = '', keep = null) {
  const seen = [...new Set([...(room.seen || []), ...room.cands])]
  const ban = room.cands.filter(c => c !== keep)
  const cands = keep ? [keep, ...drawCands(idx, seen, [...ban, keep], 2)] : drawCands(idx, seen, ban)
  return { round: room.round + 1, cands, seen, ballots: {}, note }
}
// فيتو: لعبة وحدة تتبدّل بغيرها وتنشال من الأوراق
export function vetoRoom(idx, room, game, by) {
  const seen = [...new Set([...(room.seen || []), ...room.cands])]
  const [fresh] = drawCands(idx, seen, room.cands, 1)
  const cands = room.cands.map(c => (c === game ? fresh || null : c)).filter(Boolean)
  const ballots = {}
  for (const [pid, b] of Object.entries(room.ballots || {})) {
    const order = (b.order || []).filter(x => x !== game)
    if (!order.length) continue
    ballots[pid] = { ...b, order, bonus: b.bonus === game ? undefined : b.bonus, against: b.against === game ? undefined : b.against }
  }
  return { ...room, cands, seen, ballots, note: `🚫 ${by} شال لعبة بالفيتو وتبدّلت بغيرها` }
}

// الحساب: نقاط كل لعبة + مرات الأولى + أفضلية ترجيح التعادل + نقاط إعادة الترشيح
export function tallyRoom(room, players, hasPerk = () => false) {
  const pts = new Map(), firsts = new Map(), edge = new Map()
  const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v)
  let voted = 0
  const cands = room?.cands || []
  for (const pl of players) {
    const b = room?.ballots?.[pl.id], o = ordOf(b)
    if (!o.length) continue
    voted++
    const sp = split(BUDGET, o.length)
    o.forEach((g, i) => {
      add(pts, g, i === 0 && b.double && g !== REDO ? sp[i] * 2 : sp[i])
      if (i === 0) { add(firsts, g, 1); if (hasPerk(pl.id, 'tiebreak')) add(edge, g, 1) }
    })
    if (b.bonus && cands.includes(b.bonus)) add(pts, b.bonus, BONUS)
    if (b.against && cands.includes(b.against)) add(pts, b.against, -AGAINST)
  }
  const total = players.length * BUDGET
  const redoPts = pts.get(REDO) || 0
  const redoNeed = Math.floor(REDO_NEED * total) + 1
  const key = g => [pts.get(g) || 0, firsts.get(g) || 0, edge.get(g) || 0]
  const ranked = cands.filter(g => pts.has(g)).sort((a, b) => { const x = key(a), y = key(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2] })
  const tie = ranked.length > 1 && key(ranked[0]).join() === key(ranked[1]).join()
  return { pts, firsts, edge, ranked, tie, redoPts, redoNeed, total, voted, redoWins: redoPts > REDO_NEED * total }
}
