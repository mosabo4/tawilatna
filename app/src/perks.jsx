// جوائز المستويات: تنحفظ في القاعدة ويشوفها الكل (وضع التجربة بس يبقى على الجهاز)
/* eslint-disable react/prop-types */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './store'
import { api } from './api'
import { computeLevels, levelOfReward } from './levels'
import { TITLE_DEFS, computeTitles } from './titles'
import { resolveActions, activeEffects, flagsOn } from './actions'
import { SECRET_BADGES } from './achievements'

const KEY = 'tw-perks'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }

export const PALETTE = ['#D93A3A', '#2F6FDB', '#E9B425', '#2E9E5B', '#8A4FD8', '#EE7A2B', '#1BA6A6', '#D6458F', '#00B3FF', '#FF5FA2', '#6B7A2E', '#4B4F58']
export const FRAMES = [
  { id: 'silver', name: 'فضي', level: 4 },
  { id: 'fire', name: 'نار', level: 9 },
  { id: 'gold', name: 'ذهبي', level: 10 },
  { id: 'diamond', name: 'ماسي', level: 16 },
]
export const BGS = [
  { id: 'table', name: 'طاولة لعب', css: 'radial-gradient(120% 90% at 80% 20%, #6b3f1d 0%, #3a2312 45%, #1b120a 100%)' },
  { id: 'space', name: 'فضاء', css: 'radial-gradient(2px 2px at 20% 30%, #fff8, transparent), radial-gradient(1.5px 1.5px at 70% 60%, #fff6, transparent), radial-gradient(1px 1px at 40% 80%, #fff7, transparent), radial-gradient(120% 90% at 70% 10%, #3b1f7a, #120a2e 60%, #05030f)' },
  { id: 'desert', name: 'صحراء', css: 'linear-gradient(180deg, #f0a35b 0%, #d9773b 45%, #8a3f1f 100%)' },
  { id: 'pitch', name: 'ملعب', css: 'repeating-linear-gradient(90deg, #1f7a3a 0 28px, #22863f 28px 56px)' },
  { id: 'neon', name: 'نيون', css: 'linear-gradient(135deg, #ff2fa0 0%, #6a2cff 50%, #00d4ff 100%)' },
]
const SHARED = ['color', 'title', 'frame', 'pinned', 'bg', 'celebrate', 'gold', 'customTitle', 'nameFx', 'pose', 'fc1', 'fc2', 'badge']

export const TITLE_STYLES = Object.fromEntries(TITLE_DEFS.map(t => [t.name, { icon: t.icon, from: t.from, to: t.to, ring: t.ring, shine: t.rarity === 'legend' }]))
export function TitleBadge({ title, small, kind }) {
  if (!title) return null
  const st = TITLE_STYLES[title]
  if (!st || kind === 'custom' || kind === 'retitle') {
    const c = kind === 'retitle' ? { f: '#7a1f3d', t: '#c2185b', r: '#ff8fb1', i: '😈' } : { f: '#3a2c6b', t: '#6b4dd8', r: '#c3b5ff', i: '✍️' }
    return <span className={`tbadge ${small ? 'sm' : ''}`} style={{ '--f': c.f, '--t': c.t, '--r': c.r }}><i aria-hidden="true">{c.i}</i>{title}</span>
  }
  return (
    <span className={`tbadge ${small ? 'sm' : ''} ${st.shine ? 'shine' : ''}`} style={{ '--f': st.from, '--t': st.to, '--r': st.ring }}>
      <i aria-hidden="true">{st.icon}</i>{title}
    </span>
  )
}

const Ctx = createContext({ active: {}, perks: {}, set: () => {}, level: 0, test: false, look: () => ({}), can: () => false, fx: null })

export function PerksProvider({ children }) {
  const { idx, me, act } = useStore()
  const [local, setLocal] = useState(read)
  const [pending, setPending] = useState(null)
  const timer = useRef(null)
  useEffect(() => { const on = () => setLocal(read()); window.addEventListener('storage', on); return () => window.removeEventListener('storage', on) }, [])

  const dbReady = !!(idx && idx.perksDb)
  const rowOf = useCallback(pid => (idx?.perksDb || []).find(x => x.player_id === pid)?.data || null, [idx])
  const myDb = me ? rowOf(me.id) : null
  const mine = pending || (dbReady ? (myDb || {}) : local)
  const perks = { ...mine, test: local.test }

  // نقل الإعدادات القديمة من الجهاز للقاعدة مرة وحدة
  useEffect(() => {
    if (!me || !dbReady || myDb || local.migrated) return
    const data = Object.fromEntries(SHARED.filter(k => local[k] != null).map(k => [k, local[k]]))
    const n = { ...read(), migrated: true }; write(n); setLocal(n)
    if (Object.keys(data).length) act((p, pin) => api.setPerks(p, pin, data)).catch(() => {})
  }, [me?.id, dbReady]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = v => {
    if ('test' in v) { const n = { ...read(), test: v.test }; write(n); setLocal(n) }
    const shared = Object.fromEntries(Object.entries(v).filter(([k]) => SHARED.includes(k)))
    if (!Object.keys(shared).length || !me) return
    const next = Object.fromEntries(Object.entries({ ...mine, ...shared }).filter(([k, x]) => SHARED.includes(k) && x != null && x !== false && x !== ''))
    if (!dbReady) { const n = { ...read(), ...shared }; write(n); setLocal(n); return }
    setPending(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { act((p, pin) => api.setPerks(p, pin, next)).catch(() => {}).finally(() => setPending(null)) }, 700)
  }

  const levels = useMemo(() => (idx ? computeLevels(idx) : null), [idx])
  const titlesMap = useMemo(() => (idx && levels ? computeTitles(idx, levels) : new Map()), [idx, levels])
  // آخر قيم انتهى ونقاطه فيه بالسالب (شعار «سالب» يوم كامل)
  const negMap = useMemo(() => {
    const m = new Map()
    for (const p of idx?.plays || []) {
      const t = new Date(p.ended_at || p.created_at || `${p.played_on}T23:59:59`).getTime()
      for (const r of p.results) if (r.score != null && r.score < 0 && !(m.get(r.player_id) >= t)) m.set(r.player_id, t)
    }
    return m
  }, [idx?.plays])
  const fx = useMemo(() => { if (!idx) return null; const r = resolveActions(idx); return { ...r, effects: activeEffects(idx), flags: flagsOn(r.challenges) } }, [idx])
  const real = (levels && me && levels.get(me.id)?.level) || 0
  const test = !!(local.test && me?.is_admin)
  const L = test ? 99 : real
  const lvOf = pid => (me && pid === me.id ? L : levels?.get(pid)?.level || 0)
  const can = (id, pid = me?.id) => !!pid && lvOf(pid) >= levelOfReward(id)
  const titleOk = (t, pid = me?.id) => !!TITLE_STYLES[t] && ((pid === me?.id && test) || !!titlesMap.get(pid)?.find(x => x.name === t && x.done))

  // شكل أي لاعب كما يشوفه الكل
  const look = pid => {
    if (!pid) return {}
    const d = (me && pid === me.id) ? mine : (dbReady ? rowOf(pid) || {} : {})
    const ok = id => lvOf(pid) >= levelOfReward(id)
    const fr = FRAMES.find(f => f.id === d.frame)
    const eff = fx?.effects.get(pid) || { teases: [], baby: null, retitle: null, caption: null, immune: null }
    const flaggers = (fx?.flags.get(pid) || []).filter(w => lvOf(w) >= levelOfReward('flag'))
    let title = null, titleKind = 'std'
    if (eff.retitle) { title = eff.retitle.data?.title; titleKind = 'retitle' }
    else if (ok('customTitle') && d.customTitle) { title = d.customTitle; titleKind = 'custom' }
    else if (ok('title') && d.title && titleOk(d.title, pid)) title = d.title
    return {
      color: ok('color') ? d.color || null : null,
      title, titleKind,
      frame: d.frame === 'custom' && ok('frame2') && d.fc1 ? 'custom' : fr && lvOf(pid) >= fr.level ? fr.id : null,
      fc: [d.fc1, d.fc2 || d.fc1],
      badge: d.badge && SECRET_BADGES[d.badge] && (pid === me?.id && test || levels?.get(pid)?.achievements.find(a => a.id === d.badge)?.done) ? SECRET_BADGES[d.badge] : null,
      neg: negMap.has(pid) && Date.now() - negMap.get(pid) < 864e5,
      nameFx: ok('nameFx') && !!d.nameFx, pose: ok('pose') ? d.pose || null : null,
      caption: eff.caption, immune: eff.immune, flag: flaggers.length ? flaggers : null,
      pin: ok('pin') ? d.pinned || null : null,
      bg: ok('bg') ? BGS.find(b => b.id === d.bg) || null : null,
      celebrate: ok('celebrate') && !!d.celebrate,
      gold: ok('gold') && !!d.gold,
      teases: eff.teases, baby: eff.baby, retitle: eff.retitle,
    }
  }
  const myLook = me ? look(me.id) : {}
  const saved = me ? (idx?.scenes || []).find(x => x.player_id === me.id) : null
  const active = me ? { ...myLook, reacts: L >= 4, scene: L >= 7 && saved ? { target: saved.target, action: saved.action } : null, char: {} } : { char: {} }
  const frameOk = f => { const x = FRAMES.find(y => y.id === f); return !!x && L >= x.level }
  const doAction = (kind, { target, game, play, data } = {}, okText) => act((p, pin) => api.addAction(p, pin, kind, target, game, play, data || {}), okText)
  const undoAction = (id, okText) => act((p, pin) => api.deleteAction(p, pin, id), okText)

  return <Ctx.Provider value={{ perks, set, active, level: L, realLevel: real, test, titleOk, frameOk, look, can, fx, levels, doAction, undoAction, dbReady }}>{children}</Ctx.Provider>
}
export const usePerks = () => useContext(Ctx)

// شعارات جنب الاسم: الشعار السري + «سالب» لو آخر قيم نقاطه فيه بالسالب (يوم كامل)
export const NameTags = ({ lk }) => <>{lk?.badge && <i className="nm-badge">{lk.badge.icon}</i>}{lk?.neg && <i className="nm-neg" title="نقاطه بالسالب">سالب</i>}</>
