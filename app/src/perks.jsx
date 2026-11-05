// جوائز الليفلات (تجربة على الجهاز). الإعدادات تنحفظ في المتصفح لين نربطها بالقاعدة.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { computeLevels } from './levels'

const KEY = 'tw-perks'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }

// ---------- رسومات بكسل (أصلية) للطقطقة ----------
const PIX = {
  cry: { name: 'يبكي', rows: [
    '..YYYY..', '.YYYYYY.', 'YKBYYKBY', 'YBYYYYBY', 'YBYKKYBY', 'YBYKKYBY', '.BYYYYB.', '.B.YY.B.'],
    pal: { Y: '#FFD34D', K: '#3A2600', B: '#5BC8FF' } },
  flag: { name: 'راية بيضاء', rows: [
    'K.......', 'KWWWW...', 'KWWWWWW.', 'KWWWWWW.', 'KWWWW...', 'K.......', 'K.......', 'K.......'],
    pal: { K: '#6B4A2B', W: '#F4F6FF' } },
  snail: { name: 'حلزون', rows: [
    '........', '..OOO...', '.OBBBO..', '.OBOBO.E', '.OBBOO.G', 'GGOOOGGG', 'GGGGGGG.', '........'],
    pal: { O: '#C77A3A', B: '#F2C27A', G: '#8BD66B', E: '#3A2600' } },
  zzz: { name: 'نايم', rows: [
    '....ZZZ.', '......Z.', '..ZZZZ..', 'BBBBB...', 'BKBKB...', 'BBBBB...', 'BBKKB...', '.BBB....'],
    pal: { Z: '#C3B8FF', B: '#FFD34D', K: '#3A2600' } },
  potato: { name: 'بطاطس', rows: [
    '..PPPP..', '.PPPPPP.', 'PPKPPKPP', 'PPPPPPPP', 'PPKKKKPP', 'PPPPPPPP', '.PPPPPP.', '..PPPP..'],
    pal: { P: '#C9A26B', K: '#3A2600' } },
}
export const TEASES = Object.entries(PIX).map(([id, v]) => ({ id, name: v.name }))
export function PixelArt({ id, size = 24 }) {
  const art = PIX[id]; if (!art) return null
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-label={art.name} className="pixel">
      {art.rows.flatMap((row, y) => [...row].map((c, x) => art.pal[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={art.pal[c]} /> : null))}
    </svg>
  )
}

export const PALETTE = ['#D93A3A', '#2F6FDB', '#E9B425', '#2E9E5B', '#8A4FD8', '#EE7A2B', '#1BA6A6', '#D6458F', '#6B7A2E', '#4B4F58', '#00B3FF', '#FF5FA2']

const Ctx = createContext({ active: {}, perks: {}, set: () => {}, level: 0, test: false })

export function PerksProvider({ children }) {
  const { idx, me } = useStore()
  const [perks, setPerks] = useState(read)
  useEffect(() => { const on = () => setPerks(read()); window.addEventListener('storage', on); return () => window.removeEventListener('storage', on) }, [])
  const set = v => { const n = { ...read(), ...v }; write(n); setPerks(n) }
  const real = useMemo(() => (idx && me ? computeLevels(idx).get(me.id)?.level || 1 : 0), [idx, me])
  const test = !!(perks.test && me?.is_admin)
  const L = test ? 99 : real
  const active = me ? {
    color: L >= 2 && perks.color,
    title: L >= 3 && perks.title,
    frame: (perks.frame === 'silver' && L >= 4) || (perks.frame === 'gold' && L >= 7) || (perks.frame === 'diamond' && L >= 12) ? perks.frame : null,
    reacts: L >= 4,
    pin: L >= 5 && perks.pinned,
    tease: L >= 6 && perks.tease?.target && perks.tease.until > Date.now() ? perks.tease : null,
    legend: L >= 10 && perks.legend,
  } : {}
  return <Ctx.Provider value={{ perks, set, active, level: L, realLevel: real, test }}>{children}</Ctx.Provider>
}
export const usePerks = () => useContext(Ctx)
