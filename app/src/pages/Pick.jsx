import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { usePerks } from '../perks'
import { cooldownLeft } from '../actions'
import { computeLevels, levelOfReward, REWARDS } from '../levels'
import { Avatar, Cover } from '../ui'
import { hemicycle, expand, PAL, MEDAL } from './RankVote'
import { BUDGET, REDO, BONUS, AGAINST, REDO_NEED, ordOf, roundKey, freshGames, newRoom, nextRoom, vetoRoom, tallyRoom, split } from '../pickLogic'
import PickIntro, { introSeen } from './PickIntro'

const RED = '#8892a6'
const WORD = ['الأولى', 'الثانية', 'الثالثة']
// جوائز النظام الجديد (تنعرض كلها وتنقفل لين يوصل المستوى)
const PERKS = ['tiebreak', 'teach', 'double', 'comeback', 'against', 'veto', 'opener']

// ---- نفس الشكل القديم عشان الرئيسية والمختبر والملخص تظل تشتغل ----
export function useFriday() {
  const { idx, me, data } = useStore()
  const room = data?.pickRoom || null
  const week = roundKey(room) || 'none'
  const picks = useMemo(() => (idx.picks || []).filter(p => p.week === week), [idx, week])
  const byGame = useMemo(() => {
    const m = new Map()
    for (const p of picks) { if (!m.has(p.game_id)) m.set(p.game_id, []); m.get(p.game_id).push(idx.playersById.get(p.player_id)) }
    return m
  }, [picks, idx])
  const tally = useMemo(() => { const m = new Map(); for (const p of picks) m.set(p.game_id, (m.get(p.game_id) || 0) + p.votes); return m }, [picks])
  const mine = useMemo(() => new Map(picks.filter(p => p.player_id === me?.id).map(p => [p.game_id, p.votes])), [picks, me])
  const cands = room?.cands || []
  return { room, week, picks, byGame, tally, mine, cands }
}

// زر صغير في صفحة اللعبة: لو اللعبة مرشّحة للجلسة الجاية يودّيك للتصويت
export function FridayButton({ gameId }) {
  const { cands, mine } = useFriday()
  const { me } = useStore()
  if (!me || !cands.includes(gameId)) return null
  return (
    <div className="friday-btn-wrap">
      <button className={`friday-btn ${mine.has(gameId) ? 'on' : 'big'}`} onClick={() => go('/friday')}>
        <span className="fb-check" aria-hidden="true">{mine.has(gameId) ? '✓' : '🗳️'}</span>
        <span>{mine.has(gameId) ? 'صوّتت لها للجلسة الجاية' : 'مرشّحة للجلسة الجاية، صوّت لها'}</span>
      </button>
    </div>
  )
}

export function Friday() {
  const { idx, me, act, reload, notify, data } = useStore()
  const { can, doAction, undoAction } = usePerks()
  const room = data?.pickRoom || null
  const players = idx.players
  const week = roundKey(room)
  const lvMap = useMemo(() => computeLevels(idx), [idx])
  const lvOf = pid => lvMap.get(pid)?.level || 1
  const hasPerk = (pid, id) => (me && pid === me.id ? can(id) : lvOf(pid) >= levelOfReward(id))
  const fresh = useMemo(() => freshGames(idx), [idx])
  const gname = id => idx.gamesById.get(id)?.name || '؟'
  const [info, setInfo] = useState(false)
  const [intro, setIntro] = useState(() => !!me && !introSeen(me.id))
  const [busy, setBusy] = useState(false)
  const [ask, setAsk] = useState(null)
  const made = useRef(false)

  const safe = async fn => { setBusy(true); try { await fn() } catch (e) { if (e?.code === 'stale') reload() } finally { setBusy(false) } }

  // أول مرة ما فيه غرفة: أول لاعب داخل ينشئها
  useEffect(() => {
    if (me && !room && fresh.length && !made.current) {
      made.current = true
      act((p, pin) => api.setPickRoom(p, pin, 0, newRoom(idx))).catch(() => { made.current = false })
    }
  }, [me, room, fresh.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me && !introSeen(me.id) && !intro) setIntro(true) }, [me]) // eslint-disable-line react-hooks/exhaustive-deps

  const T = useMemo(() => tallyRoom(room, players, hasPerk), [room, players, lvMap, can]) // eslint-disable-line react-hooks/exhaustive-deps
  const acts = (idx.actions || []).filter(a => a.data?.week === week)
  const myAct = kind => (me ? acts.find(a => a.kind === kind && a.player_id === me.id) : null)
  const opener = acts.find(a => a.kind === 'opener' && room?.cands.includes(a.game_id))
  const myB = (me && room?.ballots?.[me.id]) || {}
  const myOrder = ordOf(myB)
  const sp = split(BUDGET, myOrder.length)
  const waiting = players.filter(pl => !ordOf(room?.ballots?.[pl.id]).length)

  const doReshuffle = (note, keep = null) => act((p, pin) => api.setPickRoom(p, pin, room.round, nextRoom(idx, room, note, keep)))
  const sendBallot = b => act((p, pin) => api.setPickBallot(p, pin, room.round, b))
  // نحسب لو إعادة الترشيح بتفوز بعد هذي الورقة
  const submit = order => safe(async () => {
    const nb = { ...myB, order }
    if (!order.length) { nb.double = false; nb.bonus = undefined; nb.against = undefined }
    const ballots = { ...room.ballots, [me.id]: nb }
    const t = tallyRoom({ ...room, ballots }, players, hasPerk)
    if (t.redoWins) {
      const votes = new Map()
      players.forEach(pl => { const b = ballots[pl.id], o = ordOf(b); if (o[0] && o[0] !== REDO && hasPerk(pl.id, 'comeback')) votes.set(o[0], (votes.get(o[0]) || 0) + 1) })
      const keep = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
      await doReshuffle(`🔄 إعادة الترشيح فازت بـ${t.redoPts} من ${t.total} نقطة، هذي ألعاب جديدة${keep ? ` (و${gname(keep)} بقيت بـ«تمسّك»)` : ''}`, keep)
      return
    }
    await sendBallot(nb)
  })
  const tap = id => {
    if (!me || !room) return
    submit(myOrder.includes(id) ? myOrder.filter(x => x !== id) : myOrder.length < 3 ? [...myOrder, id] : myOrder)
  }

  // الجوائز
  const needVoted = () => { if (!myOrder.length) { notify('رتّب اختياراتك أول، وبعدها استخدم جوائزك', 'err'); return false } return true }
  const toggleTeach = id => needVoted() && safe(() => sendBallot({ ...myB, bonus: myB.bonus === id ? undefined : id }))
  const toggleDouble = () => needVoted() && safe(async () => {
    const a = myAct('double')
    if (myB.double) { if (a) await undoAction(a.id); await sendBallot({ ...myB, double: false }); return }
    await doAction('double', { data: { week } }, '✌️ تضاعفت نقاط لعبتك الأولى')
    await sendBallot({ ...myB, double: true })
  })
  const toggleAgainst = id => needVoted() && safe(async () => {
    const a = myAct('against')
    if (myB.against === id) { if (a) await undoAction(a.id); await sendBallot({ ...myB, against: undefined }); return }
    if (myB.against && a) await undoAction(a.id)
    else if (!a && cooldownLeft(idx, me.id, 'against', 30) > 0) return
    await doAction('against', { game: id, data: { week } }, `🧨 نقصت ${AGAINST} نقاط من ${gname(id)}`)
    await sendBallot({ ...myB, against: id })
  })
  const doVeto = id => safe(async () => {
    setAsk(null)
    await doAction('veto', { game: id, data: { week } })
    await act((p, pin) => api.setPickRoom(p, pin, room.round, vetoRoom(idx, room, id, me.name)), '🚫 انشالت وتبدّلت بغيرها')
  })
  const doOpener = id => safe(() => doAction('opener', { game: id, data: { week } }, '🎬 صارت لعبة الافتتاح'))

  if (!fresh.length && !room) return <div className="pad lab-box rv"><p className="hint">كل الألعاب انلعبت مرة على الأقل، ما فيه ألعاب جديدة نرشّحها.</p></div>
  if (!room) return <div className="pad lab-box rv"><p className="hint">{me ? 'نجهّز الألعاب المرشّحة…' : 'ادخل بحسابك عشان تتجهّز الجولة.'}</p></div>

  const col = new Map([...room.cands.map((g, i) => [g, PAL[i % PAL.length]]), [REDO, RED]])
  const cells = []
  T.ranked.forEach(g => { for (let i = 0; i < Math.max(0, T.pts.get(g)); i++) cells.push(col.get(g)) })
  for (let i = 0; i < T.redoPts; i++) cells.push(RED)
  cells.length = Math.min(cells.length, T.total)
  while (cells.length < T.total) cells.push(null)
  const H = hemicycle(T.total || 1)
  const dots = expand(cells)
  const lead = T.ranked[0]
  // ترتيب الليلة: لعبة الافتتاح أول، وبعدها حسب النقاط
  const night = opener ? [opener.game_id, ...T.ranked.filter(g => g !== opener.game_id)] : T.ranked
  const owned = PERKS.map(id => REWARDS.find(r => r.id === id)).filter(Boolean)
  const myLv = me ? lvOf(me.id) : 1
  const vetoLeft = me ? cooldownLeft(idx, me.id, 'veto', 30) : 0
  const openLeft = me ? cooldownLeft(idx, me.id, 'opener', 30) : 0
  const dblLeft = me ? cooldownLeft(idx, me.id, 'double', 30) : 0
  const agLeft = me ? cooldownLeft(idx, me.id, 'against', 30) : 0

  return (
    <div className="pad lab-box rv vt pk">
      {intro && me && <PickIntro playerId={me.id} onClose={() => setIntro(false)} />}
      {room.note && <div className="vt-status"><span>🔄</span><div><b>{room.note}</b></div></div>}

      <section className="rv-hemi glass">
        <div className="rv-top"><b>🎲 ترشيح الجلسة الجاية · جولة {room.round}</b><small>{T.voted ? `${T.voted} من ${players.length} صوّتوا` : 'ما أحد صوّت للحين'}</small></div>
        <div className="rv-svgbox">
          <svg viewBox="0 0 200 106" role="img" aria-label="قوس البرلمان">
            {H.pts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r={H.dot} fill={dots[i] || 'rgba(255,255,255,.16)'} />)}
          </svg>
          <div className="rv-center">{lead ? <><b>{T.tie ? 'تعادل' : gname(lead)}</b><small>👑</small></> : <small>—</small>}</div>
        </div>
        <div className="rk-leg">
          {room.cands.map(id => <span key={id}><i style={{ background: col.get(id) }} /><b>{gname(id)}</b><em>{Math.max(0, T.pts.get(id) || 0)} مقعد</em></span>)}
          <span><i style={{ background: RED }} /><b>إعادة ترشيح</b><em>{T.redoPts} مقعد · لازم {T.redoNeed}</em></span>
        </div>
      </section>

      {night.length > 0 && (
        <section className="pk-night glass">
          <div className="rv-top"><b>🌙 ترتيب لعب الليلة</b><small>{T.tie ? 'تعادل على الصدارة، تنحسم بالأولويات' : 'لين الحين'}</small></div>
          <ol>
            {night.map((g, i) => (
              <li key={g}>
                <Cover game={idx.gamesById.get(g)} className="xs" />
                <span><b>{gname(g)}</b><small>{Math.max(0, T.pts.get(g) || 0)} نقطة · {T.firsts.get(g) || 0} أولى</small></span>
                {opener?.game_id === g && <em className="pk-tag">🎬 تنلعب أول</em>}
                {i === 0 && opener?.game_id !== g && <em className="pk-tag">👑</em>}
              </li>
            ))}
          </ol>
          {opener && me && (opener.player_id === me.id || me.is_admin) && <button type="button" className="link-btn" onClick={() => safe(() => undoAction(opener.id, 'انشالت'))}>شيل لعبة الافتتاح ({idx.playersById.get(opener.player_id)?.name})</button>}
        </section>
      )}

      <section className="rk-ppl glass">
        <div className="rv-top"><b>👥 تصويت العيال</b><small>{waiting.length ? `لسا ما صوّت ${waiting.length}` : 'الكل صوّت'}</small></div>
        {players.map(pl => {
          const b = room.ballots?.[pl.id], o = ordOf(b), s2 = split(BUDGET, o.length)
          return (
            <div key={pl.id} className={`rk-p ${me?.id === pl.id ? 'sel' : ''}`}>
              <Avatar player={pl} size={30} /><b>{pl.name}</b>
              <span className="rk-picks">
                {!o.length && <em>لسا ما صوّت</em>}
                {o.map((g, i) => <em key={g} style={{ '--bc': col.get(g) }}>{MEDAL[i]} {g === REDO ? '🔄 إعادة ترشيح' : gname(g)} · {s2[i]}{i === 0 && b?.double && g !== REDO ? ' ✌️×2' : ''}</em>)}
                {b?.bonus && <em style={{ '--bc': col.get(b.bonus) }}>🎁 {gname(b.bonus)} +{BONUS}</em>}
                {b?.against && <em style={{ '--bc': col.get(b.against) }}>🧨 {gname(b.against)} −{AGAINST}</em>}
              </span>
            </div>
          )
        })}
      </section>

      {me ? (
        <section className="vt-bal glass">
          <div className="vt-bal-top"><b>🗳️ ورقتك</b><small>اضغط ألعابك بالترتيب، الأولى هي الأهم</small></div>
          <div className="rk-cands">
            {[...room.cands, REDO].map(id => {
              const g = idx.gamesById.get(id), i = myOrder.indexOf(id), full = i < 0 && myOrder.length >= 3
              return (
                <button key={id} type="button" disabled={busy} className={`rk-c ${i >= 0 ? 'on' : ''} ${full ? 'off' : ''} ${id === REDO ? 'rd' : ''}`} style={{ '--bc': col.get(id) }} onClick={() => tap(id)}>
                  {id === REDO ? <span className="rk-rdi">🔄</span> : <Cover game={g} className="sm" />}
                  <b>{id === REDO ? 'ما أبغى هذي، رشّحوا غيرها' : g?.name}</b>
                  <small>{i >= 0 ? `${MEDAL[i]} ${WORD[i]} · ${sp[i]} نقطة` : full ? 'اخترت 3' : 'اضغط للاختيار'}</small>
                </button>
              )
            })}
          </div>
          <small className="rv-next">4 خيارات وتختار منها 3 بس. إعادة الترشيح خيار مثل اللعبة، ولو أخذت أكثر من 51% من نقاط العيال تتبدّل الألعاب.</small>
        </section>
      ) : <section className="vt-bal glass"><p className="hint">ادخل بحسابك عشان تصوّت.</p></section>}

      {me && (
        <section className="pk-pw glass">
          <div className="vt-bal-top"><b>🎒 جوائزك في الترشيح</b><small>مستواك {myLv}</small></div>
          {owned.map(r => {
            const on = myLv >= r.level, id = r.id
            const chips = (fn, pick, extra) => room.cands.map(c => (
              <button key={c} type="button" className={`chip ${pick(c) ? 'on' : ''}`} disabled={busy || (extra && extra(c))} onClick={() => fn(c)}>{gname(c)}</button>
            ))
            return (
              <div key={id} className={`pk-perk ${on ? '' : 'lock'}`}>
                <div className="pk-ph"><span>{on ? r.icon : '🔒'}</span><div><b>{r.name}</b><small>{on ? r.desc : `يفتح في مستوى ${r.level}`}</small></div></div>
                {on && id === 'tiebreak' && <small className="pk-on">✅ شغّال تلقائي</small>}
                {on && id === 'comeback' && <small className="pk-on">✅ شغّال تلقائي لو فازت إعادة الترشيح</small>}
                {on && id === 'teach' && <div className="pk-chips"><small>+{BONUS} لـ:</small>{chips(toggleTeach, c => myB.bonus === c)}</div>}
                {on && id === 'double' && (
                  <div className="pk-chips">
                    <button type="button" className={`chip ${myB.double ? 'on' : ''}`} disabled={busy || (!myB.double && dblLeft > 0)} onClick={toggleDouble}>{myB.double ? '✌️ شغّال، إلغاء' : dblLeft > 0 ? `بعد ${dblLeft} يوم` : '✌️ ضاعف الأولى'}</button>
                    {myB.double && <small>تنحرق لو انعادت الجولة</small>}
                  </div>
                )}
                {on && id === 'against' && <div className="pk-chips"><small>−{AGAINST} من:</small>{chips(toggleAgainst, c => myB.against === c, c => myB.against !== c && !myAct('against') && agLeft > 0)}{!myAct('against') && agLeft > 0 && <small>بعد {agLeft} يوم</small>}</div>}
                {on && id === 'veto' && (
                  <div className="pk-chips">
                    {vetoLeft > 0 ? <small>بعد {vetoLeft} يوم</small> : room.cands.map(c => (
                      ask === c
                        ? <button key={c} type="button" className="chip on" disabled={busy} onClick={() => doVeto(c)}>تأكيد شيل {gname(c)}؟</button>
                        : <button key={c} type="button" className="chip" disabled={busy} onClick={() => setAsk(c)}>🚫 {gname(c)}</button>
                    ))}
                  </div>
                )}
                {on && id === 'opener' && (
                  <div className="pk-chips">
                    {opener ? <small>🎬 {gname(opener.game_id)} تنلعب أول</small> : openLeft > 0 ? <small>بعد {openLeft} يوم</small> : <><small>تنلعب أول:</small>{chips(doOpener, () => false)}</>}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      <section className="rv-how glass">
        <button type="button" className="rv-howbtn" onClick={() => setInfo(v => !v)}>❓ كيف تنحسب؟ {info ? '▲' : '▼'}</button>
        {info && (
          <div className="rv-howtxt">
            <p>الألعاب المرشّحة يختارها النظام عشوائي من الألعاب اللي ما لعبها أحد للحين، وتكفي كل العيال ({players.length}). إذا خلصت هذي، ينزل لألعاب تكفي أقل.</p>
            <p>كل لاعب عنده {BUDGET} نقطة بس، ثابتة للكل. تختار حد أقصى 3 من 4 خيارات (الثلاث ألعاب وإعادة الترشيح) وترتّبها: ثلاث ألعاب 6/4/2، لعبتين 8/4، لعبة وحدة {BUDGET}.</p>
            <p>إذا تعادلت لعبتان، تفوز اللي أخذت أولوية أولى من لاعبين أكثر، وبعدها اللي صوّت لها أصحاب «ترجيح التعادل».</p>
            <p>إعادة الترشيح خيار رابع تاخذ نقاط مثل أي لعبة. إذا وصلت {T.redoNeed} من {T.total} (أكثر من {Math.round(REDO_NEED * 100)}%) تتبدّل الألعاب وتتصفّر الأوراق.</p>
          </div>
        )}
        <button type="button" className="link-btn" onClick={() => setIntro(true)}>▶️ شاهد الشرح من جديد</button>
      </section>

      {me?.is_admin && (
        <div className="rv-act">
          {ask === 'admin'
            ? <button type="button" className="btn small primary" disabled={busy} onClick={() => safe(async () => { setAsk(null); await doReshuffle('🎲 المسؤول أعاد الترشيح') })}>تأكيد: تتصفّر الأوراق وتتبدّل الألعاب</button>
            : <button type="button" className="btn small" disabled={busy} onClick={() => setAsk('admin')}>🎲 إعادة ترشيح ألعاب (المسؤول)</button>}
        </div>
      )}
    </div>
  )
}
