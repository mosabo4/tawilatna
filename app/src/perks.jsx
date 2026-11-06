// جوائز الليفلات. الإعدادات تنحفظ في المتصفح لين نربطها بالقاعدة.
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import { api } from './api'
import { computeLevels } from './levels'
import { TITLE_DEFS, computeTitles } from './titles'
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

export const TITLE_STYLES = Object.fromEntries(TITLE_DEFS.map(t => [t.name, { icon: t.icon, from: t.from, to: t.to, ring: t.ring, shine: t.rarity === 'legend' }]))
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
  const { idx, me, act } = useStore()
  const [perks, setPerks] = useState(read)
  useEffect(() => { const on = () => setPerks(read()); window.addEventListener('storage', on); return () => window.removeEventListener('storage', on) }, [])
  const set = v => { const n = { ...read(), ...v }; write(n); setPerks(n) }
  // نقل المشهد القديم المحفوظ في الجهاز إلى القاعدة (مرة وحدة)
  useEffect(() => {
    const p = read()
    if (!me || !idx || !idx.scenes || !p.scene?.target || p.sceneSynced) return
    if ((idx.scenes || []).some(x => x.player_id === me.id)) { set({ sceneSynced: true }); return }
    act((pl, pin) => api.setScene(pl, pin, p.scene.target, p.scene.action || 'punch')).then(() => set({ sceneSynced: true })).catch(() => set({ sceneSynced: true }))
  }, [me?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const levels = useMemo(() => (idx ? computeLevels(idx) : null), [idx])
  const lv = levels && me ? levels.get(me.id) : null
  const myTitles = useMemo(() => (idx && me && levels ? new Set(computeTitles(idx, levels).get(me.id).filter(t => t.done).map(t => t.name)) : new Set()), [idx, me, levels])
  const real = lv?.level || 0
  const test = !!(perks.test && me?.is_admin)
  const L = test ? 99 : real
  const titleOk = t => !!TITLE_STYLES[t] && (test || myTitles.has(t))
  const frameOk = f => { const x = FRAMES.find(y => y.id === f); return !!x && L >= x.level }
  const ch = perks.char || {}
  const charCustom0 = me ? Object.fromEntries(Object.entries(CUSTOM).filter(([k]) => ch[k] && L >= CUSTOM[k].level && !(k === 'hat' && ch[k] === 'crown' && L < 10)).map(([k]) => [k, ch[k]])) : {}
  const charCustom = { ...(charCustom0 || {}) }
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
