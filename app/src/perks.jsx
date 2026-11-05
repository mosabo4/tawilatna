// جوائز الليفلات. الإعدادات تنحفظ في المتصفح لين نربطها بالقاعدة.
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { computeLevels } from './levels'
import { CUSTOM } from './characters'

const KEY = 'tw-perks'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }

export const PALETTE = ['#D93A3A', '#2F6FDB', '#E9B425', '#2E9E5B', '#8A4FD8', '#EE7A2B', '#1BA6A6', '#D6458F', '#00B3FF', '#FF5FA2', '#6B7A2E', '#4B4F58']

export const FRAMES = [
  { id: 'silver', name: 'فضي', level: 4 },
  { id: 'neon', name: 'نيون', level: 5 },
  { id: 'fire', name: 'نار', level: 6 },
  { id: 'gold', name: 'ذهبي', level: 7 },
  { id: 'electric', name: 'كهرباء', level: 8 },
  { id: 'rainbow', name: 'قوس قزح', level: 9 },
  { id: 'crown', name: 'تاج', level: 10 },
  { id: 'diamond', name: 'ماسي', level: 12 },
]

// الألقاب المتاحة وتصميم شارة كل واحد
export const TITLE_STYLES = {
  'زائر الطاولة': { icon: '🚪', from: '#4B5578', to: '#2E3550', ring: '#8C96BC', min: 1 },
  'من الشلة': { icon: '🤝', from: '#2F6FDB', to: '#5B3FD8', ring: '#9DB4FF', min: 3 },
  'لاعب ثابت': { icon: '🛡️', from: '#1BA6A6', to: '#2E7D4F', ring: '#8FF0D6', min: 5 },
  'خبير الدولاب': { icon: '🗝️', from: '#B8781F', to: '#7A3E12', ring: '#FFD36E', min: 8 },
  'أسطورة الطاولة': { icon: '👑', from: '#C9A227', to: '#8A4FD8', ring: '#FFE59A', min: 10, shine: true },
  'موسوعة': { icon: '📚', from: '#3D4FCF', to: '#1B2A7A', ring: '#AFC0FF', ach: 'g20' },
  'على النار': { icon: '🔥', from: '#FF6A3D', to: '#B5172C', ring: '#FFC08A', ach: 'streak3' },
  'ملك متنقل': { icon: '🌍', from: '#8A4FD8', to: '#D6458F', ring: '#F2B8FF', ach: 'catwins' },
  'ساكن الطاولة': { icon: '🏠', from: '#2E9E5B', to: '#1F5E3A', ring: '#A6F0C2', ach: 's30' },
}
export function TitleBadge({ title, small }) {
  const st = TITLE_STYLES[title]; if (!st) return null
  return (
    <span className={`tbadge ${small ? 'sm' : ''} ${st.shine ? 'shine' : ''}`} style={{ '--f': st.from, '--t': st.to, '--r': st.ring }}>
      <i aria-hidden="true">{st.icon}</i>{title}
    </span>
  )
}

const Ctx = createContext({ active: {}, perks: {}, set: () => {}, level: 0, test: false })

export function PerksProvider({ children }) {
  const { idx, me } = useStore()
  const [perks, setPerks] = useState(read)
  useEffect(() => { const on = () => setPerks(read()); window.addEventListener('storage', on); return () => window.removeEventListener('storage', on) }, [])
  const set = v => { const n = { ...read(), ...v }; write(n); setPerks(n) }
  const lv = useMemo(() => (idx && me ? computeLevels(idx).get(me.id) : null), [idx, me])
  const real = lv?.level || 0
  const test = !!(perks.test && me?.is_admin)
  const L = test ? 99 : real
  const doneAch = new Set(lv ? lv.achievements.filter(a => a.done).map(a => a.id) : [])
  const titleOk = t => { const s = TITLE_STYLES[t]; return !!s && (test || (s.min ? real >= s.min : doneAch.has(s.ach))) }
  const frameOk = f => { const x = FRAMES.find(y => y.id === f); return !!x && L >= x.level }
  const ch = perks.char || {}
  const charCustom = me ? Object.fromEntries(Object.entries(CUSTOM).filter(([k]) => ch[k] && L >= CUSTOM[k].level && !(k === 'hat' && ch[k] === 'crown' && L < 10)).map(([k]) => [k, ch[k]])) : {}
  const active = me ? {
    color: L >= 2 && perks.color,
    title: L >= 3 && perks.title && titleOk(perks.title) ? perks.title : null,
    frame: perks.frame && frameOk(perks.frame) ? perks.frame : null,
    reacts: L >= 4,
    pin: L >= 5 && perks.pinned,
    tease: L >= 6 && perks.tease?.target && perks.tease.until > Date.now() ? perks.tease : null,
    scene: L >= 7 && perks.scene?.target ? perks.scene : null,
    legend: L >= 10 && perks.legend,
    char: charCustom,
  } : { char: {} }
  return <Ctx.Provider value={{ perks, set, active, level: L, realLevel: real, test, titleOk, frameOk }}>{children}</Ctx.Provider>
}
export const usePerks = () => useContext(Ctx)
