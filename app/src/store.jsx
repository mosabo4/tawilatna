import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { buildIndex } from './stats'

const Ctx = createContext(null)
const SKEY = 'tawilatna-session'

function readSession() {
  try { return JSON.parse(localStorage.getItem(SKEY)) } catch { return null }
}
function writeSession(s) {
  try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY) } catch { /* ignore */ }
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [session, setSession] = useState(readSession)
  const [guest, setGuest] = useState(false)
  const [toast, setToast] = useState(null)

  const reload = useCallback(async () => {
    try { setData(await api.load()); setLoadError(null) }
    catch (e) { setLoadError(e.message || 'تعذّر التحميل') }
  }, [])

  useEffect(() => {
    reload()
    const onFocus = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [reload])

  const idx = useMemo(() => (data ? buildIndex(data) : null), [data])
  const me = idx && session ? idx.playersById.get(session.playerId) || null : null

  const notify = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const login = useCallback(async (playerId, pin) => {
    await api.login(playerId, pin)
    const s = { playerId, pin }
    writeSession(s); setSession(s); setGuest(false)
  }, [])
  const logout = useCallback(() => { writeSession(null); setSession(null) }, [])

  // ينفّذ عملية تحتاج رمز، ثم يعيد التحميل. لو الرمز صار غلط (تغيّر) يطلّع المستخدم
  const act = useCallback(async (fn, okText) => {
    if (!session) throw new ApiError('bad_pin')
    try {
      const res = await fn(session.playerId, session.pin)
      await reload()
      if (okText) notify(okText)
      return res
    } catch (e) {
      if (e.code === 'bad_pin') { logout(); notify('انتهت الجلسة، ادخل برمزك مرة ثانية', 'err') }
      else notify(e.message, 'err')
      throw e
    }
  }, [session, reload, notify, logout])

  const updatePin = useCallback(newPin => {
    const s = { ...session, pin: newPin }; writeSession(s); setSession(s)
  }, [session])

  const value = { data, idx, loadError, reload, session, me, guest, setGuest, login, logout, act, notify, toast, updatePin }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

// ---------- راوتر بسيط بالـ hash ----------
export function useRoute() {
  const get = () => (location.hash.replace(/^#/, '') || '/').split('?')[0]
  const [path, setPath] = useState(get)
  useEffect(() => {
    const on = () => { setPath(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path.split('/').filter(Boolean)
}
export const go = to => { location.hash = to }
export const back = fallback => { if (history.length > 1) history.back(); else go(fallback || '/') }
