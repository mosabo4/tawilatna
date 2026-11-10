// الجلسة الحيّة (تنحفظ على الجهاز)
const KEY = 'tw-live'
export const getLive = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
export const setLive = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { /* ignore */ } }
const pad = n => String(n).padStart(2, '0')
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
// كل أقيام اليوم جلسة وحدة: لو خلّصت جلسة وبدأت ثانية بنفس اليوم تنضم لها
export const livePlays = (idx, live) => idx.plays.filter(p => p.played_on === live.date)
export const dayStartIso = date => new Date(`${date}T00:00:00`).toISOString()
const LAST = 'tw-live-last'
export const getLast = () => { try { const v = JSON.parse(localStorage.getItem(LAST)); return v && v.date === todayStr() ? v : null } catch { return null } }
export const setLast = v => { try { localStorage.setItem(LAST, JSON.stringify(v)) } catch { /* ignore */ } }
