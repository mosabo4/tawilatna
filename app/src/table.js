import SETUP from './setupImages.json'

// صور اللوح والتجهيز من معرض BGG (حسب رقم اللعبة)
export function setupImages(game) {
  const list = game?.bgg_id ? SETUP[String(game.bgg_id)] : null
  if (!list) return []
  return list.map(s => 'https://cf.geekdo-images.com/' + s.replace('|', '/fit-in/1024x1024/filters:no_upscale():strip_icc()/'))
}

// "رحلة" العلبة من الرف للطاولة: نحفظ مكانها قبل ما نتنقل
let flight = null
export function launch(gameId, el) {
  const r = el.getBoundingClientRect()
  flight = { gameId, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, src: el.querySelector('img')?.currentSrc || null, at: Date.now() }
}
export function land(gameId) {
  const f = flight
  flight = null
  if (!f || f.gameId !== gameId || Date.now() - f.at > 3000) return null
  return f
}

export const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// نحفظ مكان التمرير في الدولاب عشان لما ترجع تلقى نفسك عند نفس الرف
const scroll = { y: 0, shelves: {} }
export const shelfMemory = scroll
