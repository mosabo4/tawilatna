import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { Pawn, Empty, fmtDate, fmtMonth, TopBar } from '../ui'

export function PlayCard({ play, showGame = true }) {
  const { idx } = useStore()
  const game = idx.gamesById.get(play.game_id)
  const n = play.results.length
  return (
    <a className="play-card" href={`#/play/${play.id}`}>
      <div className="pc-head">
        {showGame ? <b className="pc-game">{game?.name}</b> : <b className="pc-game">{fmtDate(play.played_on)}</b>}
        {showGame && <span className="muted pc-date">{fmtDate(play.played_on)}</span>}
      </div>
      <ol className="pc-results">
        {play.results.map(r => {
          const p = idx.playersById.get(r.player_id)
          return (
            <li key={r.player_id} className={r.position === 1 ? 'win' : ''}>
              <span className="pos">{r.position}</span>
              <Pawn color={p?.color} size={18} crown={r.position === 1 && n > 1} />
              <span className="nm">{p?.name || 'محذوف'}</span>
              {r.score != null && <span className="sc">{r.score}</span>}
            </li>
          )
        })}
      </ol>
      {play.notes && <p className="pc-note">{play.notes}</p>}
    </a>
  )
}

export default function History() {
  const { idx } = useStore()
  const [player, setPlayer] = useState('')
  const [game, setGame] = useState('')
  const list = useMemo(() => idx.plays.filter(p =>
    (!player || p.results.some(r => r.player_id === player)) && (!game || p.game_id === game)), [idx, player, game])
  const groups = useMemo(() => {
    const m = new Map()
    for (const p of list) {
      const k = p.played_on.slice(0, 7)
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(p)
    }
    return [...m.entries()]
  }, [list])

  return (
    <div className="page">
      <header className="topbar"><h1>السجل</h1></header>
      <div className="filters">
        <select value={player} onChange={e => setPlayer(e.target.value)} aria-label="فلترة حسب اللاعب">
          <option value="">كل اللاعبين</option>
          {idx.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={game} onChange={e => setGame(e.target.value)} aria-label="فلترة حسب اللعبة">
          <option value="">كل الألعاب</option>
          {idx.games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="sheet-stack">
        {groups.length === 0 && <Empty title="ما فيه قيمات هنا" text={player || game ? 'جرّب تغيّر الفلتر.' : 'سجّل أول قيم من زر الزائد تحت.'} />}
        {groups.map(([k, plays]) => (
          <section key={k} className="month">
            <h2 className="month-title">{fmtMonth(k + '-01')} <span>{plays.length} قيم</span></h2>
            <div className="play-list">{plays.map(p => <PlayCard key={p.id} play={p} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function PlayView({ id }) {
  const { idx, me } = useStore()
  const play = idx.plays.find(p => p.id === id)
  if (!play) return <div className="page"><TopBar title="قيم" backTo="/history" /><Empty title="هذا القيم غير موجود" text="يمكن انحذف." /></div>
  const game = idx.gamesById.get(play.game_id)
  const creator = idx.playersById.get(play.created_by)
  const canEdit = me && (me.is_admin || me.id === play.created_by)
  return (
    <div className="page">
      <TopBar title={game?.name} backTo="/history" right={canEdit && <button className="btn small ghost-light" onClick={() => go(`/log/${play.id}`)}>تعديل</button>} />
      <div className="sheet-stack">
        <div className="paper pad">
          <p className="muted">{fmtDate(play.played_on)}{creator ? `، سجّله ${creator.name}` : ''}</p>
          <ol className="final-standings">
            {play.results.map(r => {
              const p = idx.playersById.get(r.player_id)
              return (
                <li key={r.player_id} className={r.position === 1 ? 'win' : ''}>
                  <span className="pos">{r.position}</span>
                  <Pawn color={p?.color} size={30} crown={r.position === 1 && play.results.length > 1} />
                  <a href={`#/player/${r.player_id}`} className="nm">{p?.name || 'محذوف'}</a>
                  {r.score != null && <span className="sc">{r.score} نقطة</span>}
                </li>
              )
            })}
          </ol>
          {play.notes && <p className="pc-note big">{play.notes}</p>}
          <a className="more" href={`#/game/${play.game_id}`}>صفحة اللعبة</a>
        </div>
      </div>
    </div>
  )
}
