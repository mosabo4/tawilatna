import { useEffect, useRef } from 'react'
import { go, useStore } from '../store'
import { Cover, range } from '../ui'
import { launch, shelfMemory } from '../table'

// علبة واقفة على الرف: طولها حسب صعوبة اللعبة (الثقيلة علبتها أكبر)
function Box({ g, dim, onPick, picked }) {
  const w = g.game.weight ?? 2
  const h = Math.round(88 + Math.min(4, Math.max(1, w)) * 12)
  const open = e => {
    e.preventDefault()
    if (onPick) { onPick(g.game); return }
    shelfMemory.y = window.scrollY
    launch(g.game.id, e.currentTarget.querySelector('.box-face'))
    go(`/game/${g.game.id}`)
  }
  return (
    <a href={`#/game/${g.game.id}`} className={`box ${dim ? 'dim' : ''} ${picked ? 'picked' : ''} ${onPick ? 'editing' : ''}`} onClick={open} style={{ '--h': `${h}px` }}
      aria-label={`${g.game.name}${g.game.min_players ? `، ${g.game.min_players} إلى ${g.game.max_players} لاعبين` : ''}`}>
      <span className="box-3d">
        <span className="box-face"><Cover game={g.game} /></span>
        <span className="box-side" />
        <span className="box-top" />
      </span>
      <span className="box-label"><span className="box-name">{g.game.name}</span></span>
      {g.king && <span className="box-king" title={`ملك اللعبة: ${g.king}`}>👑</span>}
      {g.plays.length > 0 && <span className="box-plays" title={`${g.plays.length} قيم`}>{g.plays.length}</span>}
    </a>
  )
}

function Shelf({ c, games, isDim, index, onPick, pickedId }) {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (shelfMemory.shelves[c.id]) el.scrollLeft = shelfMemory.shelves[c.id]
    const on = () => { shelfMemory.shelves[c.id] = el.scrollLeft }
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [c.id])
  const lit = games.filter(g => !isDim(g)).length
  const { idx } = useStore()
  const sa = (idx.actions || []).find(a => a.kind === 'shelf' && a.data?.cat === c.id)
  const shelfName = sa?.data?.name
  return (
    <section className="shelf" id={`shelf-${c.id}`} style={{ '--t': c.tone, '--i': index }} aria-label={c.name}>
      <div className="shelf-sign"><span className="plate"><i className="dot" />{c.name}{shelfName && <em className="shelf-owner">· {shelfName}</em>}<small>{lit === games.length ? games.length : `${lit} من ${games.length}`}</small></span><span className="sign-hint">{c.hint}</span></div>
      <div className="plank" aria-hidden="true" />
      <div className="shelf-row" ref={ref}>
        {games.map(g => <Box key={g.game.id} g={g} dim={isDim(g)} onPick={onPick} picked={pickedId === g.game.id} />)}
      </div>
    </section>
  )
}

export default function Cabinet({ groups, isDim, onPick, pickedId }) {
  useEffect(() => {
    if (shelfMemory.y) requestAnimationFrame(() => window.scrollTo(0, shelfMemory.y))
    const on = () => { if (location.hash.startsWith('#/games')) shelfMemory.y = window.scrollY }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div className="cabinet">
      <div className="cabinet-inner">
        {groups.map(({ c, games }, i) => <Shelf key={c.id} c={c} games={games} isDim={isDim} index={i} onPick={onPick} pickedId={pickedId} />)}
      </div>
    </div>
  )
}

export function CabinetHint({ total, lit, players }) {
  if (!players && lit === total) return null
  return <p className="cab-hint">{lit ? `${lit} لعبة تنفع${players ? ` لـ ${range(players)} لاعبين` : ''}، والباقي مطفي على الرف.` : 'ولا لعبة تطابق. جرّب بحث ثاني.'}</p>
}

