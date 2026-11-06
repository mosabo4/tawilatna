import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { Avatar, TopBar, Cover, Confirm, today, Field, Empty, playersText } from '../ui'
import { CATEGORIES, catOf } from '../categories'
import { getLive } from '../live'
import { SCORING, scoringOf, isHeavy } from '../scoring'

export default function LogPlay({ id, presetGame, live }) {
  const { idx, me, act } = useStore()
  const existing = id ? idx.plays.find(p => p.id === id) : null
  const [gameId, setGameId] = useState(existing?.game_id || presetGame || '')
  const [date, setDate] = useState(existing?.played_on || today())
  const [rows, setRows] = useState(() => existing
    ? existing.results.map(r => ({ player_id: r.player_id, position: r.position, score: r.score ?? '' }))
    : live ? (getLive()?.players || []).map((pid, i) => ({ player_id: pid, position: i + 1, score: '' })) : [])
  const [useScores, setUseScores] = useState(() => !!existing?.results.some(r => r.score != null))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [exps, setExps] = useState(existing?.expansions || [])
  const [winners, setWinners] = useState(() => existing ? existing.results.filter(r => r.position === 1).map(r => r.player_id) : [])
  const [elim, setElim] = useState(() => existing ? existing.results.filter(r => r.position > 1).sort((a, b) => b.position - a.position).map(r => r.player_id) : [])
  const [coopWin, setCoopWin] = useState(() => (existing ? existing.results.every(r => r.position === 1) : null))
  const [setupBy, setSetupBy] = useState(existing?.setup_by || [])
  const [cleanupBy, setCleanupBy] = useState(existing?.cleanup_by || [])
  const hm = iso => { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  const [startT, setStartT] = useState(hm(existing?.started_at))
  const [endT, setEndT] = useState(hm(existing?.ended_at))
  const [modeOverride, setModeOverride] = useState(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const game = idx.gamesById.get(gameId)
  const mode = modeOverride || scoringOf(game)
  const heavy = isHeavy(game)
  const canEdit = !existing || me?.is_admin || me?.id === existing.created_by
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return idx.games.filter(g => g.name.toLowerCase().includes(t))
  }, [idx, q])
  const grouped = useMemo(() => [...CATEGORIES, { id: 'other' }]
    .map(c => ({ c, games: filtered.filter(g => (catOf(g).id) === c.id) }))
    .filter(x => x.games.length), [filtered])

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

  // نحوّل اختيارات كل نظام لمراكز
  const ids = rows.map(r => r.player_id)
  const computed = (() => {
    if (!rows.length) return null
    if (mode === 'points' || mode === 'low') {
      if (rows.some(r => r.score === '' || r.score == null)) return null
      const sorted = [...rows].sort((a, b) => (mode === 'low' ? 1 : -1) * (Number(a.score) - Number(b.score)))
      let pos = 0, prev = null
      return sorted.map((r, i) => { const v = Number(r.score); if (v !== prev) { pos = i + 1; prev = v } return { player_id: r.player_id, position: pos, score: v } })
    }
    if (mode === 'winner' || mode === 'teams') {
      const w = winners.filter(x => ids.includes(x)); if (!w.length) return null
      return ids.map(id => ({ player_id: id, position: w.includes(id) ? 1 : 2, score: null }))
    }
    if (mode === 'elim') {
      const out = elim.filter(x => ids.includes(x)); if (!out.length || out.length >= ids.length) return null
      return ids.map(id => ({ player_id: id, position: out.includes(id) ? ids.length - out.indexOf(id) : 1, score: null }))
    }
    if (mode === 'coop') {
      if (coopWin == null) return null
      return ids.map(id => ({ player_id: id, position: coopWin ? 1 : 2, score: null }))
    }
    return rows.map(r => ({ player_id: r.player_id, position: r.position, score: useScores && r.score !== '' ? Number(r.score) : null }))
  })()
  const toIso = t => (t ? new Date(`${date}T${t}:00`).toISOString() : null)
  const nowT = () => hm(new Date().toISOString())
  const dur = (() => { if (!startT || !endT) return null; let m = (new Date(`2000-01-01T${endT}`) - new Date(`2000-01-01T${startT}`)) / 60000; if (m < 0) m += 1440; return m })()

  const save = async () => {
    if (!game || !rows.length || !computed || busy) return
    setBusy(true)
    try {
      const res = await act((p, pin) => api.savePlay(p, pin, {
        id: existing?.id, game_id: gameId, played_on: date, notes: notes.trim(),
        results: computed,
        setup_by: setupBy.filter(x => ids.includes(x)), cleanup_by: cleanupBy.filter(x => ids.includes(x)),
        started_at: toIso(startT), ended_at: endT ? (() => { const e = new Date(`${date}T${endT}:00`); if (startT && endT < startT) e.setDate(e.getDate() + 1); return e.toISOString() })() : null,
      }), existing ? 'انحفظ التعديل' : 'انسجل القيم')
      const avail = new Set((idx.expansionsOf?.get(gameId) || []).map(g => g.id))
      const chosen = exps.filter(x => avail.has(x))
      if (chosen.length || existing?.expansions?.length) {
        try { await act((p, pin) => api.setPlayExpansions(p, pin, res.id, chosen)) } catch { /* toast */ }
      }
      go(live ? '/live' : `/play/${res.id}`)
    } catch { /* toast shown */ } finally { setBusy(false) }
  }
  const del = async () => {
    try { await act((p, pin) => api.deletePlay(p, pin, existing.id), 'انحذف القيم'); go('/history') } catch { /* toast */ }
  }

  return (
    <div className="page has-action">
      <TopBar title={existing ? 'تعديل قيم' : 'سجّل قيم'} />
      <div className="stack">
        <section className="glass pad step">
          <h2 className="step-title">وش لعبتوا؟</h2>
          {game ? (
            <div className="chosen-game">
              <Cover game={game} className="xs" />
              <b>{game.name}</b>
              <button className="link-btn" onClick={() => setGameId('')}>غيّر</button>
            </div>
          ) : null}
          {game && (idx.expansionsOf?.get(game.id) || []).length > 0 && (
            <div className="exp-pick">
              <span className="muted small">لعبتوا بإضافة؟</span>
              <div className="chips-wrap">
                {idx.expansionsOf.get(game.id).map(e => {
                  const on = exps.includes(e.id)
                  return <button key={e.id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setExps(x => on ? x.filter(y => y !== e.id) : [...x, e.id])}>{on ? '✓ ' : '+ '}{e.name.replace(/^.*?:\s*/, '')}</button>
                })}
              </div>
            </div>
          )}
          {game ? null : idx.games.length ? (
            <>
              {idx.games.length > 6 && <input className="input" type="search" placeholder="دوّر على لعبة" value={q} onChange={e => setQ(e.target.value)} />}
              <div className="game-picker">
                {grouped.map(({ c, games }) => (
                  <div key={c.id} className="gp-group">
                    <p className="gp-cat">{catOf({ category: c.id }).name}</p>
                    <div className="gp-grid">
                      {games.map(g => (
                        <button key={g.id} className="gp" onClick={() => setGameId(g.id)}>
                          <Cover game={g} className="xs" /><span>{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!grouped.length && <p className="muted">ما لقينا لعبة بهالاسم.</p>}
              </div>
            </>
          ) : <p className="muted">ما فيه ألعاب. <a href="#/games/new">أضف لعبة</a> أول.</p>}
        </section>

        <section className="glass pad step">
          <h2 className="step-title">متى؟</h2>
          <input type="date" className="input" value={date} max={today()} onChange={e => setDate(e.target.value)} />
        </section>

        <section className="glass pad step">
          <h2 className="step-title">مين لعب؟</h2>
          <div className="pick-players">
            {idx.players.map(p => {
              const on = rows.some(r => r.player_id === p.id)
              return (
                <button key={p.id} className={`pp ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(p.id)}>
                  <Avatar player={p} size={38} />
                  <span>{p.name}</span>
                </button>
              )
            })}
          </div>
          {outOfRange && <p className="warn">هذي اللعبة لـ {playersText(game)}، وأنتم {rows.length}. تقدر تكمل عادي.</p>}
        </section>

        {rows.length > 0 && game && (
          <section className="glass pad step">
            <div className="step-head">
              <h2 className="step-title">{SCORING[mode].icon} النتيجة</h2>
              <select className="mode-pick" value={mode} onChange={e => setModeOverride(e.target.value)} aria-label="طريقة الفوز">
                {Object.entries(SCORING).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <p className="hint">{SCORING[mode].hint}</p>

            {(mode === 'points' || mode === 'low') && (
              <ul className="rank-rows">
                {(computed ? computed.map(c => rows.find(r => r.player_id === c.player_id)) : rows).map(r => {
                  const p = idx.playersById.get(r.player_id); const c = computed?.find(x => x.player_id === r.player_id)
                  return (
                    <li key={r.player_id} className="rank-row pts">
                      <span className={`pos-badge p${c?.position || 0}`}>{c ? c.position : '–'}</span>
                      <div className="rr-who"><Avatar player={p} size={26} /><span>{p.name}</span></div>
                      <input className="input score-in" inputMode="numeric" placeholder="نقاط" value={r.score} onChange={e => setScore(r.player_id, e.target.value.replace(/[^\d-]/g, ''))} aria-label={`نقاط ${p.name}`} />
                    </li>
                  )
                })}
              </ul>
            )}

            {(mode === 'winner' || mode === 'teams') && (
              <div className="pick-players">
                {rows.map(r => { const p = idx.playersById.get(r.player_id); const on = winners.includes(r.player_id)
                  return <button key={r.player_id} className={`pp ${on ? 'on win' : ''}`} aria-pressed={on} onClick={() => setWinners(w => (on ? w.filter(x => x !== r.player_id) : mode === 'winner' ? [r.player_id] : [...w, r.player_id]))}><Avatar player={p} size={38} /><span>{on ? '🏆 ' : ''}{p.name}</span></button> })}
              </div>
            )}
            {mode === 'teams' && <p className="hint">اختر كل أعضاء الفريق اللي فاز.</p>}

            {mode === 'elim' && (
              <>
                <div className="pick-players">
                  {rows.map(r => { const p = idx.playersById.get(r.player_id); const i = elim.indexOf(r.player_id)
                    return <button key={r.player_id} className={`pp ${i >= 0 ? 'out' : ''}`} onClick={() => setElim(x => (i >= 0 ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))}><Avatar player={p} size={38} /><span>{i >= 0 ? `💀 طلع ${i + 1}` : p.name}</span></button> })}
                </div>
                {computed && <p className="hint">🏆 الفائز: {computed.filter(c => c.position === 1).map(c => idx.playersById.get(c.player_id)?.name).join(' و')}</p>}
              </>
            )}

            {mode === 'coop' && (
              <div className="row gap">
                <button className={`btn wide ${coopWin === true ? 'primary' : 'ghost'}`} onClick={() => setCoopWin(true)}>🎉 فزنا</button>
                <button className={`btn wide ${coopWin === false ? 'danger' : 'ghost'}`} onClick={() => setCoopWin(false)}>😵 خسرنا</button>
              </div>
            )}

            {mode === 'rank' && (
              <>
                <label className="switch"><input type="checkbox" checked={useScores} onChange={e => setUseScores(e.target.checked)} /><span>سجّل النقاط بعد</span></label>
                <ul className="rank-rows">
                  {ordered.map(r => {
                    const p = idx.playersById.get(r.player_id)
                    return (
                      <li key={r.player_id} className="rank-row">
                        <div className="rr-who"><Avatar player={p} size={26} /><span>{p.name}</span></div>
                        <div className="rr-pos" role="radiogroup" aria-label={`مركز ${p.name}`}>
                          {Array.from({ length: count || rows.length }, (_, i) => i + 1).map(n => (
                            <button key={n} role="radio" aria-checked={r.position === n} className={r.position === n ? 'on' : ''} onClick={() => setPos(r.player_id, n)}>{n}</button>
                          ))}
                        </div>
                        {useScores && <input className="input score-in" inputMode="numeric" placeholder="نقاط" value={r.score} onChange={e => setScore(r.player_id, e.target.value.replace(/[^\d-]/g, ''))} aria-label={`نقاط ${p.name}`} />}
                      </li>
                    )
                  })}
                </ul>
                {useScores && rows.length > 1 && <button className="btn ghost small" onClick={sortByScore}>رتّب حسب النقاط</button>}
              </>
            )}
          </section>
        )}

        {rows.length > 0 && heavy && (
          <section className="glass pad step">
            <h2 className="step-title">🧱 لعبة ثقيلة</h2>
            <p className="hint">اللي يجهّز أو يرتّب ياخذ XP زيادة.</p>
            <span className="sub-label">مين جهّز اللعبة؟ (+20 XP)</span>
            <div className="chips-wrap">{rows.map(r => { const on = setupBy.includes(r.player_id); return <button key={r.player_id} className={`chip ${on ? 'on' : ''}`} onClick={() => setSetupBy(x => (on ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))}>{idx.playersById.get(r.player_id)?.name}</button> })}</div>
            <span className="sub-label">مين ساعد في الترتيب بعدها؟ (+15 XP)</span>
            <div className="chips-wrap">{rows.map(r => { const on = cleanupBy.includes(r.player_id); return <button key={r.player_id} className={`chip ${on ? 'on' : ''}`} onClick={() => setCleanupBy(x => (on ? x.filter(y => y !== r.player_id) : [...x, r.player_id]))}>{idx.playersById.get(r.player_id)?.name}</button> })}</div>
            <span className="sub-label">وقت القيم</span>
            <div className="time-row">
              <label><small>بدأ</small><input type="time" className="input" value={startT} onChange={e => setStartT(e.target.value)} /><button type="button" className="link-btn" onClick={() => setStartT(nowT())}>الحين</button></label>
              <label><small>خلص</small><input type="time" className="input" value={endT} onChange={e => setEndT(e.target.value)} /><button type="button" className="link-btn" onClick={() => setEndT(nowT())}>الحين</button></label>
            </div>
            {dur != null && <p className="hint">⏱️ المدة: {dur >= 60 ? `${Math.floor(dur / 60)} ساعة ${dur % 60 ? `و${dur % 60} دقيقة` : ''}` : `${dur} دقيقة`}</p>}
          </section>
        )}

        <section className="glass pad step">
          <Field label="ملاحظة (اختياري)">
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثلاً: فارس قلب اللعبة في آخر دور" />
          </Field>
        </section>

        {existing && <button className="btn danger-link" onClick={() => setConfirmDel(true)}>احذف هذا القيم</button>}
      </div>

      <div className="action-bar">
        <button className="btn primary wide" disabled={!game || !rows.length || !computed || busy} onClick={save}>
          {busy ? 'لحظة...' : !game ? 'اختر اللعبة' : !rows.length ? 'اختر اللاعبين' : !computed ? ({ points: 'اكتب نقاط الكل', low: 'اكتب نقاط الكل', winner: 'اختر الفائز', teams: 'اختر الفريق الفائز', elim: 'اضغط على اللي طلعوا', coop: 'فزتوا ولا خسرتوا؟' }[mode] || 'كمّل النتيجة') : existing ? 'احفظ التعديل' : 'سجّل القيم'}
        </button>
      </div>
      {confirmDel && <Confirm danger text="متأكد تبي تحذف هذا القيم؟ بتنحذف نتائجه من الإحصائيات." confirmText="احذف" onConfirm={del} onCancel={() => setConfirmDel(false)} />}
    </div>
  )
}
