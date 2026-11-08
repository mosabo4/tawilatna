import { useMemo, useState } from 'react'
import { ExpTags } from './Expansions'
import { durationText } from '../scoring'
import { useStore, go } from '../store'
import { Avatar, Empty, Cover, fmtDate, fmtMonth, TopBar } from '../ui'
import { usePerks } from '../perks'
import { cooldownLeft } from '../actions'

export const luckyOf = (idx, playId) => (idx.actions || []).find(a => a.kind === 'lucky' && a.play_id === playId) || null
export function PlayCard({ play, showGame = true, focus }) {
  const { idx } = useStore()
  const lucky = luckyOf(idx, play.id)
  const game = idx.gamesById.get(play.game_id)
  const n = play.results.length
  return (
    <a className="play-card" href={`#/play/${play.id}`}>
      {showGame && game && <Cover game={game} className="xs" />}
      <div className="pc-body">
        <div className="pc-head">
          <b className="pc-game">{showGame ? game?.name : fmtDate(play.played_on)}</b>
          <ExpTags play={play} />
          {showGame && <span className="pc-date">{fmtDate(play.played_on)}</span>}
        </div>
        <ol className="pc-results">
          {play.results.map(r => {
            const p = idx.playersById.get(r.player_id)
            const win = r.position === 1 && n > 1
            return (
              <li key={r.player_id} className={`${win ? 'win' : ''} ${focus && !focus.includes(r.player_id) ? 'dim' : ''}`}>
                <Avatar player={p} size={18} />
                <span className="nm">{r.position}. {p?.name || 'محذوف'}{win && lucky && <em className="lucky">🍀 بالحظ</em>}</span>
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
      <p className="muted small sub-count">{idx.plays.length} قيم مسجّل</p>
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
      {groups.length === 0 && <Empty title="ما فيه أقيام هنا" text={player || game ? 'جرّب تغيّر الفلتر.' : 'سجّل أول قيم من زر الزائد تحت.'} />}
      {groups.map(([k, plays]) => (
        <section key={k} className="glass section">
          <div className="section-head"><h2>{fmtMonth(k + '-01')}</h2><span className="muted small">{plays.length} قيم</span></div>
          <div className="play-list">{plays.map(p => <PlayCard key={p.id} play={p} focus={player ? [player] : undefined} />)}</div>
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
  const lucky = luckyOf(idx, play.id)
  const winners = play.results.filter(r => r.position === 1 && play.results.length > 1).map(r => r.player_id)
  return (
    <div className="page">
      <TopBar title={game?.name} backTo="/history" right={canEdit && <button className="btn small ghost" onClick={() => go(`/log/${play.id}`)}>تعديل</button>} />
      <div className="stack">
        <div className="glass pad">
          <a className="play-game" href={`#/game/${play.game_id}`}>
            {game && <Cover game={game} className="sm" />}
            <div><b>{game?.name}</b><ExpTags play={play} /><span className="muted">{fmtDate(play.played_on)}{creator ? `، سجّله ${creator.name}` : ''}</span></div>
          </a>
          <ol className="final-standings">
            {play.results.map(r => {
              const p = idx.playersById.get(r.player_id)
              return (
                <li key={r.player_id} className={r.position === 1 && play.results.length > 1 ? 'win' : ''}>
                  <span className="pos">{r.position}</span>
                  <Avatar player={p} size={34} />
                  <a href={`#/player/${r.player_id}`} className="nm">{p?.name || 'محذوف'}{r.position === 1 && lucky && <em className="lucky">🍀 بالحظ · {idx.playersById.get(lucky.player_id)?.name}</em>}</a>
                  {r.score != null && <span className="sc">{r.score} نقطة</span>}
                </li>
              )
            })}
          </ol>
          {play.notes && <p className="pc-note big">{play.notes}</p>}
          <Confetti play={play} winners={winners} />
          {(durationText(play) || play.setup_by?.length > 0 || play.cleanup_by?.length > 0) && (
            <div className="play-extra">
              {durationText(play) && <span>⏱️ {durationText(play)}</span>}
              {play.setup_by?.length > 0 && <span>🧱 جهّزها: {play.setup_by.map(x => idx.playersById.get(x)?.name).filter(Boolean).join('، ')}</span>}
              {play.cleanup_by?.length > 0 && <span>🧹 رتّبها: {play.cleanup_by.map(x => idx.playersById.get(x)?.name).filter(Boolean).join('، ')}</span>}
            </div>
          )}
        </div>
        {me && <PlayPowers play={play} winners={winners} lucky={lucky} />}
      </div>
    </div>
  )
}

// احتفال الفوز (مستوى 12)
function Confetti({ winners }) {
  const { idx } = useStore()
  const { look } = usePerks()
  const who = winners.find(w => look(w).celebrate)
  if (!who) return null
  const p = idx.playersById.get(who)
  const bits = Array.from({ length: 26 }, (_, i) => i)
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map(i => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 7) * 0.18}s`, '--c': ['#FFC45C', '#FF5F7A', '#5B7CFF', '#3ED6A0', '#C38BFF'][i % 5] }} />)}
      <span className="cf-name">🎉 {p?.name} فاز!</span>
    </div>
  )
}

// أزرار الجوائز داخل القيم: شكر المجهّز، ريماتش، ماسح الفوز
function PlayPowers({ play, winners, lucky }) {
  const { idx, me } = useStore()
  const { can, doAction } = usePerks()
  const [busy, setBusy] = useState(false)
  const run = async (...a) => { setBusy(true); try { await doAction(...a) } catch { /* toast */ } finally { setBusy(false) } }
  const acts = idx.actions || []
  const inPlay = play.results.some(r => r.player_id === me.id)
  const setup = (play.setup_by || []).filter(x => x !== me.id)
  const luckyLeft = cooldownLeft(idx, me.id, 'lucky', 30)
  const rows = []
  if (setup.length && inPlay && can('thanks')) setup.forEach(t => {
    const tn = idx.playersById.get(t)?.name
    const done = acts.some(a => a.kind === 'thanks' && a.play_id === play.id && a.player_id === me.id && a.target === t)
    rows.push(done ? <span key={'t' + t} className="pp-done">🙏 شكرت {tn}</span>
      : <button key={'t' + t} className="btn ghost small" disabled={busy} onClick={() => run('thanks', { target: t, play: play.id }, `وصل الشكر لـ${tn} 🙏`)}>🙏 اشكر {tn} على التجهيز</button>)
  })
  if (winners.length && !winners.includes(me.id) && !lucky && can('lucky')) rows.push(luckyLeft ? <span key="l" className="pp-done muted">🍀 ماسح الفوز يرجع بعد {luckyLeft} يوم</span>
    : <button key="l" className="btn ghost small" disabled={busy} onClick={() => run('lucky', { target: winners[0], play: play.id }, '🍀 انحط عليه «بالحظ»')}>🍀 فوزه بالحظ</button>)
  const mineR = play.results.find(r => r.player_id === me.id)
  const above = mineR && play.results.find(r => r.position === mineR.position - 1)
  const swapped = acts.some(a => a.kind === 'swap' && a.play_id === play.id)
  if (above && !swapped && can('swap') && mineR.score != null && above.score === mineR.score) {
    const left = cooldownLeft(idx, me.id, 'swap', 30)
    rows.push(left ? <span key="s" className="pp-done muted">🔀 تبديل المركز يرجع بعد {left} يوم</span>
      : <button key="s" className="btn ghost small" disabled={busy} onClick={() => run('swap', { target: above.player_id, play: play.id }, '🔀 أخذت مركزه')}>🔀 خذ مركز {idx.playersById.get(above.player_id)?.name} (متعادلين)</button>)
  }
  return <>
    {rows.length > 0 && <div className="glass play-powers">{rows}</div>}
    <Stories play={play} />
  </>
}

// المذكرات (مستوى 5): قصة القيم
function Stories({ play }) {
  const { idx, me } = useStore()
  const { can, doAction, undoAction } = usePerks()
  const [t, setT] = useState('')
  const list = (idx.actions || []).filter(a => a.kind === 'story' && a.play_id === play.id)
  const inPlay = play.results.some(r => r.player_id === me.id)
  const mine = list.find(a => a.player_id === me.id)
  if (!list.length && !(inPlay && can('story'))) return null
  return (
    <section className="glass stories">
      <b>📜 مذكرات القيم</b>
      {list.map(a => <blockquote key={a.id}>{a.data?.text}<small>— {idx.playersById.get(a.player_id)?.name}{(a.player_id === me.id || me.is_admin) && <button className="link-btn danger" onClick={() => undoAction(a.id, 'انشالت')}>شيل</button>}</small></blockquote>)}
      {inPlay && can('story') && !mine && <div className="form"><textarea className="input" rows={3} maxLength={400} value={t} onChange={e => setT(e.target.value)} placeholder="وش صار في هالقيم؟ اكتب القصة للتاريخ…" /><button className="btn primary small" disabled={!t.trim()} onClick={() => doAction('story', { play: play.id, data: { text: t.trim() } }, '📜 انحفظت في السجل').then(() => setT('')).catch(() => {})}>احفظ القصة</button></div>}
    </section>
  )
}
