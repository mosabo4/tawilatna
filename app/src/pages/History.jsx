import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { Avatar, Empty, Cover, fmtDate, fmtMonth, TopBar } from '../ui'

export function PlayCard({ play, showGame = true }) {
  const { idx } = useStore()
  const game = idx.gamesById.get(play.game_id)
  const n = play.results.length
  return (
    <a className="play-card" href={`#/play/${play.id}`}>
      {showGame && game && <Cover game={game} className="xs" />}
      <div className="pc-body">
        <div className="pc-head">
          <b className="pc-game">{showGame ? game?.name : fmtDate(play.played_on)}</b>
          {showGame && <span className="pc-date">{fmtDate(play.played_on)}</span>}
        </div>
        <ol className="pc-results">
          {play.results.map(r => {
            const p = idx.playersById.get(r.player_id)
            const win = r.position === 1 && n > 1
            return (
              <li key={r.player_id} className={win ? 'win' : ''}>
                <Avatar player={p} size={18} />
                <span className="nm">{r.position}. {p?.name || 'محذوف'}</span>
                {r.score != null && <span className="sc">{r.score}</span>}
              </li>
            )
          })}
        </ol>
        {play.notes && <p className="pc-note">{play.notes}</p>}
      </div>
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
    <div className="page stack">
      <header className="page-head"><h1>السجل</h1><span className="count">{idx.plays.length} قيم</span></header>
      <div className="filters row gap">
        <select className="input" value={player} onChange={e => setPlayer(e.target.value)} aria-label="فلترة حسب اللاعب">
          <option value="">كل اللاعبين</option>
          {idx.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" value={game} onChange={e => setGame(e.target.value)} aria-label="فلترة حسب اللعبة">
          <option value="">كل الألعاب</option>
          {idx.games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      {groups.length === 0 && <Empty title="ما فيه قيمات هنا" text={player || game ? 'جرّب تغيّر الفلتر.' : 'سجّل أول قيم من زر الزائد تحت.'} />}
      {groups.map(([k, plays]) => (
        <section key={k} className="glass section">
          <div className="section-head"><h2>{fmtMonth(k + '-01')}</h2><span className="muted small">{plays.length} قيم</span></div>
          <div className="play-list">{plays.map(p => <PlayCard key={p.id} play={p} />)}</div>
        </section>
      ))}
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
      <TopBar title={game?.name} backTo="/history" right={canEdit && <button className="btn small ghost" onClick={() => go(`/log/${play.id}`)}>تعديل</button>} />
      <div className="stack">
        <div className="glass pad">
          <a className="play-game" href={`#/game/${play.game_id}`}>
            {game && <Cover game={game} className="sm" />}
            <div><b>{game?.name}</b><span className="muted">{fmtDate(play.played_on)}{creator ? `، سجّله ${creator.name}` : ''}</span></div>
          </a>
          <ol className="final-standings">
            {play.results.map(r => {
              const p = idx.playersById.get(r.player_id)
              return (
                <li key={r.player_id} className={r.position === 1 && play.results.length > 1 ? 'win' : ''}>
                  <span className="pos">{r.position}</span>
                  <Avatar player={p} size={34} />
                  <a href={`#/player/${r.player_id}`} className="nm">{p?.name || 'محذوف'}</a>
                  {r.score != null && <span className="sc">{r.score} نقطة</span>}
                </li>
              )
            })}
          </ol>
          {play.notes && <p className="pc-note big">{play.notes}</p>}
        </div>
      </div>
    </div>
  )
}
