import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { gameStats, allGameStats, daysSince } from '../stats'
import { Cover, Empty, ScoreBadge, TopBar, Section, PlayerTag, RatingInput, Field, Confirm, ago, fmtDate, fmtScore } from '../ui'
import { PlayCard } from './History'

const SORTS = [
  ['plays', 'الأكثر لعباً'],
  ['rating', 'الأعلى تقييماً'],
  ['recent', 'آخر ما لعبنا'],
  ['name', 'الاسم'],
]

export default function Games() {
  const { idx, me } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(() => { try { return localStorage.getItem('tw-gsort') || 'plays' } catch { return 'plays' } })
  const setS = s => { setSort(s); try { localStorage.setItem('tw-gsort', s) } catch { /* ignore */ } }
  const list = useMemo(() => {
    const all = allGameStats(idx).filter(g => g.game.name.includes(q.trim()))
    const by = {
      plays: (a, b) => b.plays.length - a.plays.length,
      rating: (a, b) => (b.avg ?? -1) - (a.avg ?? -1),
      recent: (a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''),
      name: (a, b) => a.game.name.localeCompare(b.game.name, 'ar'),
    }[sort]
    return all.sort(by)
  }, [idx, q, sort])

  return (
    <div className="page">
      <header className="topbar">
        <h1>الألعاب <span className="count">{idx.games.length}</span></h1>
        {me && <button className="btn small gold" onClick={() => go('/games/new')}>أضف لعبة</button>}
      </header>
      {idx.games.length > 0 && (
        <div className="filters">
          <input className="input on-felt" type="search" placeholder="دوّر على لعبة" value={q} onChange={e => setQ(e.target.value)} />
          <div className="seg" role="tablist">
            {SORTS.map(([k, l]) => <button key={k} role="tab" aria-selected={sort === k} className={sort === k ? 'on' : ''} onClick={() => setS(k)}>{l}</button>)}
          </div>
        </div>
      )}
      <div className="sheet-stack">
        {!idx.games.length && <Empty title="ما فيه ألعاب للحين" text="أضف ألعابك عشان تبدأون تسجلون وتقيّمون." action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف لعبة</button>} />}
        {idx.games.length > 0 && !list.length && <Empty title={`ما لقينا "${q}"`} text="تأكد من الاسم أو أضفها كلعبة جديدة." />}
        <div className="game-grid">
          {list.map(g => (
            <a key={g.game.id} className="game-tile" href={`#/game/${g.game.id}`}>
              <Cover game={g.game} />
              <div className="gt-body">
                <b className="gt-name">{g.game.name}</b>
                <div className="gt-meta">
                  <ScoreBadge value={g.avg} />
                  <span className="muted">{g.plays.length ? `${g.plays.length} قيم` : 'ما انلعبت'}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GameView({ id }) {
  const { idx, me, act } = useStore()
  const game = idx.gamesById.get(id)
  const st = useMemo(() => (game ? gameStats(idx, id) : null), [idx, id, game])
  const [saving, setSaving] = useState(false)
  if (!game) return <div className="page"><TopBar title="لعبة" backTo="/games" /><Empty title="هذي اللعبة غير موجودة" text="يمكن انحذفت." /></div>

  const mine = me ? st.ratings.find(r => r.player_id === me.id)?.score ?? null : null
  const owner = idx.playersById.get(game.owner_id)
  const canEdit = me && (me.is_admin || me.id === game.added_by)
  const rate = async v => {
    setSaving(true)
    try { await act((p, pin) => api.setRating(p, pin, id, v)) } catch { /* toast */ } finally { setSaving(false) }
  }
  const ratingsSorted = [...st.ratings].sort((a, b) => b.score - a.score)
  const playerRange = game.min_players ? (game.max_players && game.max_players !== game.min_players ? `${game.min_players}–${game.max_players} لاعبين` : `${game.min_players} لاعبين`) : null

  return (
    <div className="page has-action">
      <TopBar title={game.name} backTo="/games" right={canEdit && <button className="btn small ghost-light" onClick={() => go(`/game/${id}/edit`)}>تعديل</button>} />
      <div className="game-hero">
        <Cover game={game} className="lg" />
        <div className="gh-info">
          <div className="gh-avg"><ScoreBadge value={st.avg} big /><span>{st.ratings.length ? `من ${st.ratings.length} تقييم` : 'ما أحد قيّمها'}</span></div>
          <ul className="gh-facts">
            <li><b>{st.plays.length}</b> قيم</li>
            <li>{ago(daysSince(st.lastPlayed))}</li>
            {playerRange && <li>{playerRange}</li>}
            {game.play_minutes && <li>{game.play_minutes} دقيقة</li>}
            {owner && <li>لعبة {owner.name}</li>}
          </ul>
        </div>
      </div>

      <div className="sheet-stack">
        {me && (
          <Section title={mine != null ? `تقييمك: ${fmtScore(mine)}` : 'قيّمها'} action={mine != null && <button className="link-btn" disabled={saving} onClick={() => rate(null)}>امسح تقييمي</button>}>
            <div className="pad-x"><RatingInput value={mine} onChange={rate} disabled={saving} /></div>
          </Section>
        )}

        <Section title="تقييمات الشلة">
          {ratingsSorted.length ? (
            <ul className="bars">
              {ratingsSorted.map(r => {
                const p = idx.playersById.get(r.player_id)
                return (
                  <li key={r.player_id}>
                    <PlayerTag player={p} size={18} />
                    <span className="bar"><span style={{ width: `${r.score * 10}%`, background: p?.color }} /></span>
                    <b className="num">{fmtScore(r.score)}</b>
                  </li>
                )
              })}
            </ul>
          ) : <p className="muted pad">كن أول واحد يقيّمها.</p>}
        </Section>

        {st.champions.length > 0 && (
          <Section title="مين يكسب فيها">
            <ul className="bars">
              {st.champions.map(c => (
                <li key={c.player.id}>
                  <PlayerTag player={c.player} size={18} />
                  <span className="bar"><span style={{ width: `${(c.wins / st.champions[0].wins) * 100}%`, background: c.player.color }} /></span>
                  <b className="num">{c.wins}<small> من {c.plays}</small></b>
                </li>
              ))}
            </ul>
            {st.topScore && <p className="muted pad-x record">أعلى نقاط: <b>{st.topScore.score}</b> لـ {idx.playersById.get(st.topScore.player_id)?.name} في {fmtDate(st.topScore.played_on)}</p>}
          </Section>
        )}

        <Section title="القيمات">
          {st.plays.length
            ? <div className="play-list">{st.plays.slice(0, 20).map(p => <PlayCard key={p.id} play={p} showGame={false} />)}</div>
            : <Empty title="ما انلعبت للحين" text="أول قيم لها يكون تاريخي." />}
        </Section>
      </div>
      {me && <div className="action-bar"><button className="btn primary wide" onClick={() => go(`/log?game=${id}`)}>سجّل قيم لهذي اللعبة</button></div>}
    </div>
  )
}

export function GameForm({ id }) {
  const { idx, me, act } = useStore()
  const game = id ? idx.gamesById.get(id) : null
  const [f, setF] = useState(() => ({
    name: game?.name || '', image_url: game?.image_url || '',
    min_players: game?.min_players ?? '', max_players: game?.max_players ?? '',
    play_minutes: game?.play_minutes ?? '', owner_id: game?.owner_id || me?.id || '',
  }))
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }))
  const num = k => e => setF(s => ({ ...s, [k]: e.target.value.replace(/\D/g, '').slice(0, 3) }))

  if (!me) return <div className="page"><TopBar title="لعبة" /><Empty title="ادخل باسمك أول" /></div>
  if (id && !game) return <div className="page"><TopBar title="لعبة" /><Empty title="هذي اللعبة غير موجودة" /></div>

  const save = async e => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await act((p, pin) => api.saveGame(p, pin, {
        id: game?.id, name: f.name, image_url: f.image_url.trim(),
        min_players: f.min_players ? Number(f.min_players) : null,
        max_players: f.max_players ? Number(f.max_players) : null,
        play_minutes: f.play_minutes ? Number(f.play_minutes) : null,
        owner_id: f.owner_id || null,
      }), game ? 'انحفظت اللعبة' : 'انضافت اللعبة')
      if (game) history.back(); else location.replace(`#/game/${res.id}`)
    } catch { /* toast */ } finally { setBusy(false) }
  }
  const del = async () => {
    try { await act((p, pin) => api.deleteGame(p, pin, game.id), 'انحذفت اللعبة'); go('/games') } catch { /* toast */ }
  }
  const plays = game ? idx.plays.filter(p => p.game_id === game.id).length : 0

  return (
    <div className="page">
      <TopBar title={game ? 'تعديل لعبة' : 'لعبة جديدة'} backTo="/games" />
      <form className="sheet-stack" onSubmit={save}>
        <div className="paper pad form">
          <Field label="اسم اللعبة">
            <input className="input" required value={f.name} onChange={set('name')} placeholder="مثلاً: كاتان" autoFocus={!game} />
          </Field>
          <Field label="رابط صورة الغلاف (اختياري)" hint="افتح صورة اللعبة في جوجل أو BoardGameGeek، اضغط عليها مطوّل وانسخ عنوان الصورة.">
            <input className="input" dir="ltr" inputMode="url" value={f.image_url} onChange={set('image_url')} placeholder="https://..." />
          </Field>
          <div className="cover-preview"><Cover game={{ name: f.name || 'اسم اللعبة', image_url: f.image_url.trim() || null }} /></div>
          <div className="row gap">
            <Field label="أقل عدد"><input className="input" inputMode="numeric" value={f.min_players} onChange={num('min_players')} placeholder="2" /></Field>
            <Field label="أكثر عدد"><input className="input" inputMode="numeric" value={f.max_players} onChange={num('max_players')} placeholder="4" /></Field>
            <Field label="المدة بالدقائق"><input className="input" inputMode="numeric" value={f.play_minutes} onChange={num('play_minutes')} placeholder="45" /></Field>
          </div>
          <Field label="اللعبة حقّت مين؟">
            <select className="input" value={f.owner_id} onChange={set('owner_id')}>
              <option value="">ما نحدد</option>
              {idx.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <button className="btn primary wide" disabled={busy || !f.name.trim()}>{busy ? 'لحظة...' : game ? 'احفظ' : 'أضف اللعبة'}</button>
        </div>
        {game && me.is_admin && <button type="button" className="btn danger-link" onClick={() => setConfirmDel(true)}>احذف اللعبة</button>}
      </form>
      {confirmDel && <Confirm danger text={plays ? `بتنحذف "${game.name}" ومعها ${plays} قيم وكل تقييماتها. متأكد؟` : `تبي تحذف "${game.name}"؟`} confirmText="احذف" onConfirm={del} onCancel={() => setConfirmDel(false)} />}
    </div>
  )
}
