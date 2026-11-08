// للكمبيوتر: السحب بالماوس وعجلة الماوس على الشرائح الأفقية (بالجوال تشتغل بالسحب العادي)
const xScroller = el => {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 2) {
      const o = getComputedStyle(n).overflowX
      if (o === 'auto' || o === 'scroll') return n
    }
  }
  return null
}
export function enableDragScroll() {
  let st = null
  let moved = false
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    if (e.target.closest('input, textarea, select, [role="slider"], .lg-th, .lg-track')) return
    const el = xScroller(e.target)
    if (el) { st = { el, x: e.clientX, left: el.scrollLeft }; moved = false }
  })
  document.addEventListener('pointermove', e => {
    if (!st) return
    const dx = e.clientX - st.x
    if (Math.abs(dx) > 5) { moved = true; st.el.classList.add('dragging') }
    if (moved) st.el.scrollLeft = st.left - dx
  })
  const end = () => { if (st) { st.el.classList.remove('dragging'); st = null } }
  document.addEventListener('pointerup', end)
  document.addEventListener('pointercancel', end)
  document.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true)
  document.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
    const el = xScroller(e.target)
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const next = el.scrollLeft + (getComputedStyle(el).direction === 'rtl' ? -1 : 1) * e.deltaY
    // نحوّل العجلة لحركة أفقية بس إذا في مجال للتحرك
    if ((e.deltaY > 0 && Math.abs(el.scrollLeft) < max - 1) || (e.deltaY < 0 && Math.abs(el.scrollLeft) > 1)) { el.scrollLeft = next; e.preventDefault() }
  }, { passive: false })
}
