import { createClient } from '@supabase/supabase-js'
import SEED_GAMES from './seedGames.json'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY

export const DEMO = !URL || !KEY
const sb = DEMO ? null : createClient(URL, KEY, { auth: { persistSession: false } })

export const ERRORS = {
  bad_pin: 'الرمز غير صحيح',
  locked: 'محاولات كثيرة خاطئة. جرّب بعد 10 دقائق',
  closed: 'الموقع مقفل مؤقتاً، نرتّب أشياء وبنفتحه قريب',
  no_player: 'هذا اللاعب غير موجود',
  forbidden: 'هذا الإجراء للمسؤول أو لمن سجّله فقط',
  no_players: 'اختر لاعب واحد على الأقل',
  no_name: 'اكتب اسم اللعبة',
  bad_score: 'التقييم يكون من 1 إلى 10',
  bad_new_pin: 'الرمز لازم يكون من 4 إلى 8 أرقام',
  name_taken: 'هذا الاسم مستخدم',
  not_found: 'العنصر غير موجود، يمكن انحذف',
  dup_game: 'هذي اللعبة موجودة من قبل',
  bad_week: 'التاريخ لازم يكون يوم جمعة',
  too_long: 'النص طويل، اختصره شوي',
  empty: 'اكتب شي أول',
  network: 'ما قدرنا نوصل للخادم. تأكد من الإنترنت وحاول مرة ثانية',
}

export class ApiError extends Error {
  constructor(code) { super(ERRORS[code] || code); this.code = code }
}

// ---------------- Supabase ----------------
async function sbLoad() {
  const q = (t, cols = '*') => sb.from(t).select(cols)
  const [players, games, plays, results, ratings] = await Promise.all([
    q('players', 'id,name,color,is_admin,created_at').order('created_at'),
    q('games').order('name'),
    q('plays').order('played_on', { ascending: false }).order('created_at', { ascending: false }),
    q('play_results'),
    q('ratings'),
  ])
  for (const r of [players, games, plays, results, ratings]) if (r.error) throw new ApiError('network')
  // الجداول الجديدة: لو التحديث ما انشغّل في القاعدة، نكمل بدونها
  const [picks, comments, posts, settings, playExp, expRatings] = await Promise.all([
    q('friday_picks'), q('game_comments'), q('posts').order('created_at', { ascending: false }).limit(200), q('app_settings'),
    q('play_expansions'), q('expansion_ratings'),
  ])
  return {
    players: players.data, games: games.data, plays: plays.data, results: results.data, ratings: ratings.data,
    picks: picks.error ? [] : picks.data, comments: comments.error ? [] : comments.data, posts: posts.error ? [] : posts.data,
    settings: (!settings.error && settings.data?.[0]) || {},
    playExp: playExp.error ? [] : playExp.data, expRatings: expRatings.error ? [] : expRatings.data,
  }
}

async function sbCall(fn, args) {
  const { data, error } = await sb.rpc(fn, args)
  if (error) throw new ApiError(/fetch|network/i.test(error.message || '') ? 'network' : (error.message || 'network'))
  if (data?.error) throw new ApiError(data.error)
  return data
}

// ---------------- Demo (localStorage) ----------------
const DKEY = 'tawilatna-demo-v3'
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
function seedDemo() {
  const names = [['مصعب', '#D93A3A', true], ['هاني', '#2F6FDB'], ['معتز', '#E9B425'], ['فارس', '#2E9E5B'], ['اياد', '#8A4FD8'], ['محمدي', '#EE7A2B']]
  const players = names.map(([name, color, admin], i) => ({ id: uid(), name, color, is_admin: !!admin, pin: '1111', created_at: new Date(2026, 0, 1, 0, i).toISOString() }))
  const games = SEED_GAMES.map(g => ({ ...g, id: uid(), owner_id: players[0].id, added_by: players[0].id, created_at: new Date().toISOString() }))
  const plays = [], results = [], ratings = []
  let seed = 7
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 34; i++) {
    const game = games[Math.floor(rnd() * 18) * 2 % games.length]
    const n = Math.max(game.min_players, Math.min(game.max_players, 2 + Math.floor(rnd() * 5), 6))
    const ps = [...players].sort(() => rnd() - 0.5).slice(0, n)
    const d = new Date(2026, 9, 30); d.setDate(d.getDate() - i * 4 - Math.floor(rnd() * 3))
    const id = uid()
    plays.push({ id, game_id: game.id, played_on: d.toISOString().slice(0, 10), notes: i === 2 ? 'أطول قيم في التاريخ' : null, created_by: ps[0].id, created_at: d.toISOString() })
    ps.forEach((p, k) => results.push({ play_id: id, player_id: p.id, position: k + 1, score: null }))
  }
  players.forEach(p => games.forEach(gm => { if (rnd() > 0.55) ratings.push({ game_id: gm.id, player_id: p.id, score: Math.round((4 + rnd() * 6) * 2) / 2, updated_at: new Date().toISOString() }) }))
  const posts = [
    { id: uid(), player_id: players[1].id, body: 'مين جاي الجمعة؟ أنا جايب Catan 🎲', created_at: new Date(Date.now() - 3600e3 * 5).toISOString() },
    { id: uid(), player_id: players[3].id, body: 'أنا موجود، بس أبي نجرب شي جديد هالمرة', created_at: new Date(Date.now() - 3600e3 * 3).toISOString() },
  ]
  const comments = [{ game_id: games[0].id, player_id: players[2].id, body: 'أحلى لعبة للبداية، قواعدها بسيطة', updated_at: new Date().toISOString() }]
  return { players, games, plays, results, ratings, picks: [], comments, posts }
}
function dGet() {
  try { const s = JSON.parse(localStorage.getItem(DKEY)); if (s) return s } catch { /* ignore */ }
  const s = seedDemo(); dSet(s); return s
}
function dSet(s) { try { localStorage.setItem(DKEY, JSON.stringify(s)) } catch { /* ignore */ } }
function dAuth(s, player, pin) {
  const p = s.players.find(x => x.id === player)
  if (!p) throw new ApiError('no_player')
  if (p.pin !== pin) throw new ApiError('bad_pin')
  if (!p.is_admin && s.settings?.login_locked) throw new ApiError('closed')
  return p
}
const demo = {
  load: async () => { const s = dGet(); return { picks: [], comments: [], posts: [], settings: {}, playExp: [], expRatings: [], ...s, players: s.players.map(({ pin: _pin, ...p }) => p) } },
  login: async (player, pin) => { dAuth(dGet(), player, pin); return { ok: true } },
  setRating: async (player, pin, game, score) => {
    const s = dGet(); dAuth(s, player, pin)
    s.ratings = s.ratings.filter(r => !(r.game_id === game && r.player_id === player))
    if (score != null) s.ratings.push({ game_id: game, player_id: player, score: Math.round(score * 2) / 2, updated_at: new Date().toISOString() })
    dSet(s); return { ok: true }
  },
  savePlay: async (player, pin, play) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    if (!play.results?.length) throw new ApiError('no_players')
    let id = play.id
    if (!id) {
      id = uid(); s.plays.unshift({ id, game_id: play.game_id, played_on: play.played_on, notes: play.notes || null, created_by: player, created_at: new Date().toISOString() })
    } else {
      const p = s.plays.find(x => x.id === id); if (!p) throw new ApiError('not_found')
      if (p.created_by !== player && !me.is_admin) throw new ApiError('forbidden')
      Object.assign(p, { game_id: play.game_id, played_on: play.played_on, notes: play.notes || null })
      s.results = s.results.filter(r => r.play_id !== id)
    }
    play.results.forEach(r => s.results.push({ play_id: id, player_id: r.player_id, position: r.position, score: r.score ?? null }))
    s.plays.sort((a, b) => b.played_on.localeCompare(a.played_on) || b.created_at.localeCompare(a.created_at))
    dSet(s); return { ok: true, id }
  },
  deletePlay: async (player, pin, id) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    const p = s.plays.find(x => x.id === id); if (!p) throw new ApiError('not_found')
    if (p.created_by !== player && !me.is_admin) throw new ApiError('forbidden')
    s.plays = s.plays.filter(x => x.id !== id); s.results = s.results.filter(r => r.play_id !== id)
    dSet(s); return { ok: true }
  },
  saveGame: async (player, pin, game) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    if (!game.name?.trim()) throw new ApiError('no_name')
    const fields = { name: game.name.trim(), image_url: game.image_url || null, min_players: game.min_players || null, max_players: game.max_players || null, play_minutes: game.play_minutes || null, max_minutes: game.max_minutes || null, category: game.category || null, weight: game.weight ?? null, bgg_id: game.bgg_id || null, year: game.year || null, owner_id: game.owner_id || null }
    let id = game.id
    if (!id) { id = uid(); s.games.push({ id, ...fields, owner_id: fields.owner_id || player, added_by: player, created_at: new Date().toISOString() }) }
    else {
      const g = s.games.find(x => x.id === id); if (!g) throw new ApiError('not_found')
      if (g.added_by !== player && !me.is_admin) throw new ApiError('forbidden')
      Object.assign(g, fields)
    }
    s.games.sort((a, b) => a.name.localeCompare(b.name, 'ar')); dSet(s); return { ok: true, id }
  },
  deleteGame: async (player, pin, id) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    if (!me.is_admin) throw new ApiError('forbidden')
    const playIds = new Set(s.plays.filter(p => p.game_id === id).map(p => p.id))
    s.games = s.games.filter(g => g.id !== id); s.plays = s.plays.filter(p => !playIds.has(p.id))
    s.results = s.results.filter(r => !playIds.has(r.play_id)); s.ratings = s.ratings.filter(r => r.game_id !== id)
    dSet(s); return { ok: true }
  },
  toggleFriday: async (player, pin, week, game) => {
    const s = dGet(); dAuth(s, player, pin); s.picks ||= []
    const i = s.picks.findIndex(x => x.week === week && x.game_id === game && x.player_id === player)
    if (i >= 0) s.picks.splice(i, 1); else s.picks.push({ week, game_id: game, player_id: player, created_at: new Date().toISOString() })
    dSet(s); return { ok: true, picked: i < 0 }
  },
  setComment: async (player, pin, game, body) => {
    const s = dGet(); dAuth(s, player, pin); s.comments ||= []
    s.comments = s.comments.filter(c => !(c.game_id === game && c.player_id === player))
    const b = (body || '').trim()
    if (b.length > 500) throw new ApiError('too_long')
    if (b) s.comments.push({ game_id: game, player_id: player, body: b, updated_at: new Date().toISOString() })
    dSet(s); return { ok: true }
  },
  addPost: async (player, pin, body) => {
    const s = dGet(); dAuth(s, player, pin); s.posts ||= []
    const b = (body || '').trim()
    if (!b) throw new ApiError('empty'); if (b.length > 1000) throw new ApiError('too_long')
    s.posts.unshift({ id: uid(), player_id: player, body: b, created_at: new Date().toISOString() })
    dSet(s); return { ok: true }
  },
  deletePost: async (player, pin, id) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    const p = (s.posts || []).find(x => x.id === id); if (!p) throw new ApiError('not_found')
    if (p.player_id !== player && !me.is_admin) throw new ApiError('forbidden')
    s.posts = s.posts.filter(x => x.id !== id); dSet(s); return { ok: true }
  },
  savePlayer: async (player, pin, data) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    if (!me.is_admin) throw new ApiError('forbidden')
    if (data.pin && !/^[0-9]{4,8}$/.test(data.pin)) throw new ApiError('bad_new_pin')
    if (s.players.some(p => p.name === data.name.trim() && p.id !== data.id)) throw new ApiError('name_taken')
    let id = data.id
    if (!id) {
      if (!data.pin) throw new ApiError('bad_new_pin')
      id = uid(); s.players.push({ id, name: data.name.trim(), color: data.color, is_admin: !!data.is_admin, pin: data.pin, created_at: new Date().toISOString() })
    } else {
      const p = s.players.find(x => x.id === id)
      Object.assign(p, { name: data.name.trim(), color: data.color, is_admin: p.id === player ? true : !!data.is_admin }, data.pin ? { pin: data.pin } : {})
    }
    dSet(s); return { ok: true, id }
  },
  setExpRating: async (player, pin, exp, delta) => {
    const s = dGet(); dAuth(s, player, pin); s.expRatings ||= []
    s.expRatings = s.expRatings.filter(r => !(r.expansion_id === exp && r.player_id === player))
    if (delta != null) s.expRatings.push({ expansion_id: exp, player_id: player, delta, updated_at: new Date().toISOString() })
    dSet(s); return { ok: true }
  },
  setPlayExpansions: async (player, pin, play, games) => {
    const s = dGet(); dAuth(s, player, pin); s.playExp = (s.playExp || []).filter(x => x.play_id !== play)
    for (const g of games || []) s.playExp.push({ play_id: play, game_id: g })
    dSet(s); return { ok: true }
  },
  setGameBase: async (player, pin, game, base) => {
    const s = dGet(); dAuth(s, player, pin); const g = s.games.find(x => x.id === game); if (!g) throw new ApiError('not_found')
    g.base_game_id = base || null; dSet(s); return { ok: true }
  },
  setLoginLock: async (player, pin, locked) => {
    const s = dGet(); const me = dAuth(s, player, pin)
    if (!me.is_admin) throw new ApiError('forbidden')
    s.settings = { ...(s.settings || {}), login_locked: locked }; dSet(s); return { ok: true, locked }
  },
  reset: () => { try { localStorage.removeItem(DKEY) } catch { /* ignore */ } },
}

const real = {
  load: sbLoad,
  login: (p, pin) => sbCall('login', { p_player: p, p_pin: pin }),
  setRating: (p, pin, g, score) => sbCall('set_rating', { p_player: p, p_pin: pin, p_game: g, p_score: score }),
  savePlay: (p, pin, play) => sbCall('save_play', { p_player: p, p_pin: pin, p_play: play }),
  deletePlay: (p, pin, id) => sbCall('delete_play', { p_player: p, p_pin: pin, p_play: id }),
  saveGame: (p, pin, game) => sbCall('save_game', { p_player: p, p_pin: pin, p_game: game }),
  deleteGame: (p, pin, id) => sbCall('delete_game', { p_player: p, p_pin: pin, p_game: id }),
  toggleFriday: (p, pin, week, g) => sbCall('toggle_friday', { p_player: p, p_pin: pin, p_week: week, p_game: g }),
  setComment: (p, pin, g, body) => sbCall('set_comment', { p_player: p, p_pin: pin, p_game: g, p_body: body }),
  addPost: (p, pin, body) => sbCall('add_post', { p_player: p, p_pin: pin, p_body: body }),
  deletePost: (p, pin, id) => sbCall('delete_post', { p_player: p, p_pin: pin, p_post: id }),
  savePlayer: (p, pin, d) => sbCall('save_player', { p_player: p, p_pin: pin, p_data: d }),
  setLoginLock: (p, pin, locked) => sbCall('set_login_lock', { p_player: p, p_pin: pin, p_locked: locked }),
  setExpRating: (p, pin, exp, delta) => sbCall('set_exp_rating', { p_player: p, p_pin: pin, p_exp: exp, p_delta: delta }),
  setPlayExpansions: (p, pin, play, games) => sbCall('set_play_expansions', { p_player: p, p_pin: pin, p_play: play, p_games: games }),
  setGameBase: (p, pin, game, base) => sbCall('set_game_base', { p_player: p, p_pin: pin, p_game: game, p_base: base }),
}

export const api = DEMO ? demo : real
