import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Cover } from '../ui'
import { setupImages, land, reduceMotion } from '../table'

// الطاولة: العلبة تطير من الرف وتنحط هنا، وبعدها ينفتح اللوح في النص
export default function TableHero({ game }) {
  const imgs = setupImages(game)
  const [pick, setPick] = useState(0)
  const [stage, setStage] = useState('idle') // idle | flying | landing | open
  const [zoom, setZoom] = useState(false)
  const boxRef = useRef()
  const [flight] = useState(() => land(game.id))

  useLayoutEffect(() => {
    const target = boxRef.current
    if (!flight || !target || reduceMotion()) { setStage('open'); return }
    const t = target.getBoundingClientRect()
    const f = flight.rect
    // نسخة طايرة من الغلاف
    const ghost = document.createElement('div')
    ghost.className = 'ghost-box'
    if (flight.src) { const im = document.createElement('img'); im.src = flight.src; im.alt = ''; ghost.appendChild(im) }
    else ghost.textContent = game.name
    Object.assign(ghost.style, { left: `${t.left}px`, top: `${t.top}px`, width: `${t.width}px`, height: `${t.height}px` })
    document.body.appendChild(ghost)
    setStage('flying')
    const dx = f.x - t.left, dy = f.y - t.top, sx = f.w / t.width, sy = f.h / t.height
    const midY = Math.min(dy, 0) / 2 - 70
    const anim = ghost.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(0deg)`, boxShadow: '0 4px 10px rgba(0,0,0,.4)' },
      { transform: `translate(${dx * 0.45}px, ${midY}px) scale(${(sx + 1) / 2 * 1.12}) rotate(-8deg)`, boxShadow: '0 40px 60px rgba(0,0,0,.55)', offset: 0.55 },
      { transform: 'translate(0, 0) scale(1) rotate(-6deg)', boxShadow: '0 10px 18px rgba(0,0,0,.5)' },
    ], { duration: 640, easing: 'cubic-bezier(.35,.6,.25,1)', fill: 'forwards' })
    // اللوح يبدأ ينفتح والعلبة على وشك توصل
    const t1 = setTimeout(() => setStage('landing'), 470)
    anim.onfinish = () => { ghost.remove(); setStage('open') }
    return () => { clearTimeout(t1); anim.cancel(); ghost.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!zoom) return
    const on = e => e.key === 'Escape' && setZoom(false)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [zoom])

  const has = imgs.length > 0
  return (
    <div className={`table-hero stage-${stage}`}>
      <div className="table-scene">
        <div className="table-top" aria-hidden="true" />
        <button className="board" onClick={() => has && setZoom(true)} disabled={!has} aria-label={has ? 'كبّر صورة اللوح' : undefined}>
          {has
            ? <img key={pick} src={imgs[pick]} alt={`${game.name} على الطاولة`} referrerPolicy="no-referrer" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
            : <span className="board-empty"><Cover game={game} /><small>ما عندنا صورة للوح هذي اللعبة</small></span>}
        </button>
        <div className="table-box" ref={boxRef}><Cover game={game} /></div>
      </div>

      {imgs.length > 1 && (
        <div className="board-thumbs" role="tablist" aria-label="صور اللوح">
          {imgs.map((u, i) => (
            <button key={u} role="tab" aria-selected={i === pick} className={i === pick ? 'on' : ''} onClick={() => setPick(i)}>
              <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </button>
          ))}
          <span className="thumbs-note">من BGG</span>
        </div>
      )}

      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setZoom(false)}>
          <img src={imgs[pick]} alt={game.name} referrerPolicy="no-referrer" />
          <button className="lb-close" aria-label="إغلاق">✕</button>
          {imgs.length > 1 && (
            <div className="lb-nav" onClick={e => e.stopPropagation()}>
              <button onClick={() => setPick((pick + 1) % imgs.length)} aria-label="الصورة التالية">›</button>
              <span dir="ltr">{pick + 1} / {imgs.length}</span>
              <button onClick={() => setPick((pick - 1 + imgs.length) % imgs.length)} aria-label="الصورة السابقة">‹</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
