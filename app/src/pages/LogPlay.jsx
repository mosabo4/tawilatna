import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { Pawn, TopBar, Cover, Confirm, today, Field, Empty } from '../ui'

export default function LogPlay({ id, presetGame }) {
  const { idx, me, act } = useStore()
  const existing = id ? idx.plays.find(p => p.id === id) : null
  const [gameId, setGameId] = useState(existing?.game_id || presetGame || '')
  const [date, setDate] = useState(existing?.played_on || today())
  const [rows, setRows] = useState(() => existing
    ? existing.results.map(r => ({ player_id: r.player_id, position: r.position, score: r.score ?? '' }))
    : [])
  const [useScores, setUseScores] = useState(() => !!existing?.results.some(r => r.score != null))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const game = idx.gamesById.get(gameId)
  const canEdit = !existing || me?.is_admin || me?.id === existing.created_by
  const filtered = useMemo(() => idx.games.filter(g => g.name.includes(q.trim())), [idx, q])

  if (!me) return <div className="page"><TopBar title="سجّل قيم" /><Empty title="ادخل باسمك أول" text="التسجيل يحتاج رمزك." /></div>
  if (id && !existing) return <div className="page"><TopBar title="تعديل قيم" /><Empty title="هذا القيم غير موجود" /></div>
  if (!canEdit) return <div className="page"><TopBar title="تعديل قيم" /><Empty title="ما تقدر تعدّل هذا القيم" text="التعديل لمن سجّله أو للمسؤول." /></div>

  const toggle = pid => setRows(rs => {
    if (rs.some(r => r.player_id === pid)) {
      const left = rs.filter(r => r.player_id !== pid)
      return left.map(r => ({ ...r, position: Math.min(r.position, left.length) }))
    }
    return [...rs, { player_id: pid, position: rs.length + 1, score: '' }]
  })
  const setPos = (pid, position) => setRows(rs => rs.map(r => (r.player_id === pid ? { ...r, position } : r)))
  const setScore = (pid, score) => setRows(rs => rs.map(r => (r.player_id === pid ? { ...r, score } : r)))
  const sortByScore = () => setRows(rs => {
    const sorted = [...rs].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    let pos = 0, prev = null
    return sorted.map((r, i) => {
      const s = Number(r.score || 0)
      if (s !== prev) { pos = i + 1; prev = s }
      return { ...r, position: pos }
    })
  })
  const ordered = [...rows].sort((a, b) => a.position - b.position)
  const count = game ? rows.length : 0
  const outOfRange = game && rows.length && ((game.min_players && rows.length < game.min_players) || (game.max_players && rows.length > game.max_players))

  const save = async () => {
    if (!game || !rows.length || busy) return
    setBusy(true)
    try {
      const res = await act((p, pin) => api.savePlay(p, pin, {
        id: existing?.id, game_id: gameId, played_on: date, notes: notes.trim(),
        results: rows.map(r => ({ player_id: r.player_id, position: r.position, score: useScores && r.score !== '' ? Number(r.score) : null })),
      }), existing ? 'انحفظ التعديل' : 'انسجل القيم')
      go(`/play/${res.id}`)
    } catch { /* toast shown */ } finally { setBusy(false) }
  }
  const del = async () => {
    try { await act((p, pin) => api.deletePlay(p, pin, existing.id), 'انحذف القيم'); go('/history') } catch { /* toast */ }
  }

  return (
    <div className="page has-action">
      <TopBar title={existing ? 'تعديل قيم' : 'سجّل قيم'} />
      <div className="sheet-stack">
        <section className="paper pad step">
          <h2 className="step-title">وش لعبتوا؟</h2>
          {game ? (
            <div className="chosen-game">
              <Cover game={game} className="xs" />
              <b>{game.name}</b>
              <button className="link-btn" onClick={() => setGameId('')}>غيّر</button>
            </div>
          ) : idx.games.length ? (
            <>
              {idx.games.length > 6 && <input className="input" placeholder="دوّر على لعبة" value={q} onChange={e => setQ(e.target.value)} />}
              <div className="game-picker">
                {filtered.map(g => (
                  <button key={g.id} className="gp" onClick={() => setGameId(g.id)}>
                    <Cover game={g} className="xs" /><span>{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : <p className="muted">ما فيه ألعاب. <a href="#/games/new">أضف لعبة</a> أول.</p>}
        </section>

        <section className="paper pad step">
          <h2 className="step-title">متى؟</h2>
          <input type="date" className="input" value={date} max={today()} onChange={e => setDate(e.target.value)} />
        </section>

        <section className="paper pad step">
          <h2 className="step-title">مين لعب؟</h2>
          <div className="pick-players">
            {idx.players.map(p => {
              const on = rows.some(r => r.player_id === p.id)
              return (
                <button key={p.id} className={`pp ${on ? 'on' : ''}`} style={{ '--c': p.color }} aria-pressed={on} onClick={() => toggle(p.id)}>
                  <Pawn color={on ? p.color : '#C9CCC4'} size={32} />
                  <span>{p.name}</span>
                </button>
              )
            })}
          </div>
          {outOfRange && <p className="warn">هذي اللعبة لـ {game.min_players}{game.max_players && game.max_players !== game.min_players ? `–${game.max_players}` : ''} لاعبين، وأنتم {rows.length}. تقدر تكمل عادي.</p>}
        </section>

        {rows.length > 0 && (
          <section className="paper pad step">
            <div className="step-head">
              <h2 className="step-title">الترتيب</h2>
              <label className="switch">
                <input type="checkbox" checked={useScores} onChange={e => setUseScores(e.target.checked)} />
                <span>سجّل النقاط</span>
              </label>
            </div>
            <p className="hint">اختر مركز كل لاعب. اثنين بنفس المركز يعني تعادل.</p>
            <ul className="rank-rows">
              {ordered.map(r => {
                const p = idx.playersById.get(r.player_id)
                return (
                  <li key={r.player_id} className="rank-row" style={{ '--c': p.color }}>
                    <div className="rr-who"><Pawn color={p.color} size={24} crown={r.position === 1 && rows.length > 1} /><span>{p.name}</span></div>
                    <div className="rr-pos" role="radiogroup" aria-label={`مركز ${p.name}`}>
                      {Array.from({ length: count || rows.length }, (_, i) => i + 1).map(n => (
                        <button key={n} role="radio" aria-checked={r.position === n} className={r.position === n ? 'on' : ''} onClick={() => setPos(r.player_id, n)}>{n}</button>
                      ))}
                    </div>
                    {useScores && (
                      <input className="input score-in" inputMode="numeric" placeholder="نقاط" value={r.score}
                        onChange={e => setScore(r.player_id, e.target.value.replace(/[^\d-]/g, ''))} aria-label={`نقاط ${p.name}`} />
                    )}
                  </li>
                )
              })}
            </ul>
            {useScores && rows.length > 1 && <button className="btn ghost small" onClick={sortByScore}>رتّب حسب النقاط</button>}
          </section>
        )}

        <section className="paper pad step">
          <Field label="ملاحظة (اختياري)">
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: فارس قلب اللعبة في آخر دور" />
          </Field>
        </section>

        {existing && <button className="btn danger-link" onClick={() => setConfirmDel(true)}>احذف هذا القيم</button>}
      </div>

      <div className="action-bar">
        <button className="btn primary wide" disabled={!game || !rows.length || busy} onClick={save}>
          {busy ? 'لحظة...' : existing ? 'احفظ التعديل' : !game ? 'اختر اللعبة' : !rows.length ? 'اختر اللاعبين' : 'سجّل القيم'}
        </button>
      </div>
      {confirmDel && <Confirm danger text="متأكد تبي تحذف هذا القيم؟ بتنحذف نتائجه من الإحصائيات." confirmText="احذف" onConfirm={del} onCancel={() => setConfirmDel(false)} />}
    </div>
  )
}
