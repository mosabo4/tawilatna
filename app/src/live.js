// الجلسة الحيّة (تنحفظ على الجهاز)
const KEY = 'tw-live'
export const getLive = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
export const setLive = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* ignore */ } }
const pad = n => String(n).padStart(2, '0')
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
export const livePlays = (idx, live) => idx.plays.filter(p => p.played_on === live.date && (!p.created_at || p.created_at >= live.start))
