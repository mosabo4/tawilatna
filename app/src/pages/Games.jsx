import { useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { gameStats, allGameStats, daysSince, standings, kingOf } from '../stats'
import { StandingRows } from './Ranking'
import { ExpansionsSection } from './Expansions'
import { usePerks } from '../perks'
import { SCORING } from '../scoring'
import { CATEGORIES, catOf, weightLabel } from '../categories'
import { Avatar, Cover, Empty, ScoreBadge, TopBar, Section, PlayerTag, RatingInput, Field, Confirm, Weight, ago, fmtDate, fmtScore, playersText, timeText, range, IconUsers, IconClock } from '../ui'
import { PlayCard } from './History'
import Cabinet, { CabinetHint } from './Cabinet'
import TableHero from './TableHero'
import { FridayButton, GameComments } from './Social'

const SORTS = [
  ['cat', 'التصانيف'],
  ['plays', 'الأكثر لعباً'],
  ['rating', 'الأعلى تقييماً'],
  ['weight', 'الأسهل'],
  ['name', 'الاسم'],
]
const read = (k, d) => { try { return localStorage.getItem(k) || d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

function GameTile({ g }) {
  return (
    <a className={`game-tile ${g.unplayed ? 'unplayed' : ''}`} href={`#/game/${g.game.id}`}>
      <div className="gt-cover"><Cover game={g.game} />{g.unplayed && <i className="box-lock" aria-hidden="true">🔒</i>}</div>
      <div className="gt-body">
        <b className="gt-name">{g.game.name}</b>
        <div className="gt-meta">
          {g.game.min_players && <span><IconUsers />{range(g.game.min_players, g.game.max_players)}</span>}
          {g.game.play_minutes && <span><IconClock />{range(g.game.play_minutes, g.game.max_minutes)}</span>}
          <Weight value={g.game.weight} compact />
        </div>
        <div className="gt-foot">
          <ScoreBadge value={g.avg} />
          <span className="muted">{g.plays.length ? `${g.plays.length} قيم` : 'ما انلعبت'}</span>
        </div>
      </div>
    </a>
  )
}

export default function Games() {
  const { idx, me, act } = useStore()
  const [q, setQ] = useState('')
  const [editShelf, setEditShelf] = useState(false)
  const [picked, setPicked] = useState(null)
  const [moving, setMoving] = useState(false)
  const [view, setView] = useState(() => read('tw-gview', 'shelf'))
  const [cat, setCat] = useState(() => read('tw-gcat', 'all'))
  const [sort, setSort] = useState(() => read('tw-gsort2', 'cat'))
  const [players, setPlayers] = useState(0)
  const setV = v => { setView(v); write('tw-gview', v) }
  const setC = c => { setCat(c); write('tw-gcat', c) }
  const setS = s => { setSort(s); write('tw-gsort2', s) }

  const all = useMemo(() => allGameStats(idx).map(g => ({ ...g, king: kingOf(idx, g.game.id)?.player?.name || null, unplayed: !!me && !g.plays.some(p => p.results.some(r => r.player_id === me.id)) })), [idx, me])
  const counts = useMemo(() => {
    const m = {}
    for (const g of all) { const c = catOf(g.game).id; m[c] = (m[c] || 0) + 1 }
    return m
  }, [all])

  const t = q.trim().toLowerCase()
  const matches = g => (!t || g.game.name.toLowerCase().includes(t)) &&
    (!players || ((g.game.min_players ?? 1) <= players && (g.game.max_players ?? 99) >= players))
  const by = {
    cat: (a, b) => a.game.name.localeCompare(b.game.name),
    plays: (a, b) => b.plays.length - a.plays.length || a.game.name.localeCompare(b.game.name),
    rating: (a, b) => (b.avg ?? -1) - (a.avg ?? -1),
    weight: (a, b) => (a.game.weight ?? 9) - (b.game.weight ?? 9),
    name: (a, b) => a.game.name.localeCompare(b.game.name),
  }[sort]
  const byShelf = (a, b) => (a.game.shelf_order ?? 1e6) - (b.game.shelf_order ?? 1e6)
  const sorted = useMemo(() => [...all].sort((a, b) => (sort === 'cat' ? byShelf(a, b) : 0) || by(a, b)), [all, sort]) // eslint-disable-line react-hooks/exhaustive-deps
  const shelves = useMemo(() => [...CATEGORIES, { id: 'other' }]
    .map(c => ({ c: c.id === 'other' ? catOf({}) : c, games: sorted.filter(g => catOf(g.game).id === c.id) }))
    .filter(x => x.games.length), [sorted])
  const lit = sorted.filter(matches).length

  const list = sorted.filter(g => matches(g) && (cat === 'all' || catOf(g.game).id === cat))
  const grouped = sort === 'cat' && cat === 'all' ? shelves.map(x => ({ ...x, games: x.games.filter(matches) })).filter(x => x.games.length) : null

  const pickCat = id => {
    if (view === 'shelf') {
      const el = document.getElementById(`shelf-${id}`)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' })
    } else setC(id)
  }

  return (
    <div className="page stack">
      <div className="games-bar">
        <span className="muted small">{idx.games.length} لعبة</span>
        {me && <button className="btn small primary" onClick={() => go('/games/new')}>+ أضف لعبة</button>}
      </div>

      {idx.games.length > 0 && (
        <>
          <div className="row gap">
            <input className="input" type="search" placeholder="دوّر على لعبة" value={q} onChange={e => setQ(e.target.value)} />
            <div className="seg-toggle" role="tablist" aria-label="طريقة العرض">
              <button role="tab" aria-selected={view === 'shelf'} className={view === 'shelf' ? 'on' : ''} onClick={() => setV('shelf')} title="الدولاب">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="3" width="17" height="18" rx="2" /><path d="M3.5 9.5h17M3.5 15.5h17M7 6v3M9.5 5v4.5M14 13v2.5M16.5 12v3.5" /></svg>
                <span className="sr">الدولاب</span>
              </button>
              <button role="tab" aria-selected={view === 'grid'} className={view === 'grid' ? 'on' : ''} onClick={() => setV('grid')} title="شبكة">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
                <span className="sr">شبكة</span>
              </button>
            </div>
          </div>
          <div className="chips-scroll" role={view === 'shelf' ? undefined : 'tablist'} aria-label="التصنيف">
            {view === 'grid' && <button role="tab" aria-selected={cat === 'all'} className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setC('all')}>الكل <small>{idx.games.length}</small></button>}
            {CATEGORIES.filter(c => counts[c.id]).map(c => (
              <button key={c.id} className={`chip ${view === 'grid' && cat === c.id ? 'on' : ''}`} style={{ '--t': c.tone }} onClick={() => pickCat(c.id)}>
                <i className="dot" />{c.name} <small>{counts[c.id]}</small>
              </button>
            ))}
          </div>
          <div className="tools-row">
            <label className="mini-select">
              <span>كم لاعب؟</span>
              <select value={players} onChange={e => setPlayers(+e.target.value)}>
                <option value={0}>أي عدد</option>
                {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="mini-select">
              <span>رتّب</span>
              <select value={sort} onChange={e => setS(e.target.value)}>
                {SORTS.map(([k, l]) => <option key={k} value={k}>{k === 'cat' ? 'الأبجدي' : l}</option>)}
              </select>
            </label>
          </div>
        </>
      )}

      {!idx.games.length && <Empty title="الدولاب فاضي" text="أضف ألعابك وبتنصف على الأرفف حسب تصنيفها." action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف لعبة</button>} />}

      {idx.games.length > 0 && view === 'shelf' && (
        <>
          {me?.is_admin && (
            <div className={`shelf-edit-bar ${editShelf ? 'on' : ''}`}>
              <span>{editShelf ? '✏️ وضع ترتيب الدولاب: اضغط على أي لعبة' : '🗄️ تبي ترتب الدولاب؟'}</span>
              <button className={`btn small ${editShelf ? 'primary' : 'ghost'}`} onClick={() => { setEditShelf(!editShelf); setPicked(null) }}>{editShelf ? 'خلصت' : 'رتّب'}</button>
            </div>
          )}
          <CabinetHint total={all.length} lit={lit} players={players} />
          <Cabinet groups={shelves} isDim={g => !matches(g)} onPick={editShelf ? g => setPicked(g) : null} pickedId={picked?.id} />
          {editShelf && picked && (() => {
            const shelf = shelves.find(x => x.games.some(g => g.game.id === picked.id))
            const list = shelf ? shelf.games.map(g => g.game) : [picked]
            const i = list.findIndex(g => g.id === picked.id)
            const apply = async (cat, newList) => {
              setMoving(true)
              try {
                await act(async (p, pin) => {
                  for (let k = 0; k < newList.length; k++) {
                    const g = newList[k]
                    if (g.id === picked.id || g.shelf_order !== k || (g.category || '') !== (cat || '')) await api.moveGame(p, pin, g.id, g.id === picked.id ? cat : g.category, k)
                  }
                }, 'انحفظ ترتيب الدولاب')
              } catch { /* toast */ } finally { setMoving(false) }
            }
            const swap = d => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; apply(picked.category, n) }
            const toShelf = cat => {
              const target = shelves.find(x => x.c.id === cat)
              const n = [...(target ? target.games.map(g => g.game) : []).filter(g => g.id !== picked.id), picked]
              setPicked({ ...picked, category: cat }); apply(cat, n)
            }
            return (
              <div className="shelf-sheet">
                <div className="row gap center"><Cover game={picked} className="xs" /><b className="ss-name">{picked.name}</b><button className="link-btn" onClick={() => setPicked(null)}>✕</button></div>
                <div className="row gap">
                  <button className="btn ghost small" disabled={moving || i <= 0} onClick={() => swap(-1)}>→ قدّمها</button>
                  <button className="btn ghost small" disabled={moving || i >= list.length - 1} onClick={() => swap(1)}>أخّرها ←</button>
                </div>
                <label className="mini-select"><span>انقلها لرف</span>
                  <select value={picked.category || ''} disabled={moving} onChange={e => toShelf(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
            )
          })()}
          <p className="cab-foot">طول العلبة على حسب صعوبة اللعبة، والرقم الصغير عدد مرات ما لعبناها.</p>
        </>
      )}

      {idx.games.length > 0 && view === 'grid' && (
        <>
          {!list.length && <Empty title="ما فيه لعبة تطابق" text="جرّب تغيّر البحث أو عدد اللاعبين أو التصنيف." />}
          {grouped
            ? grouped.map(({ c, games }) => (
              <section key={c.id} className="cat-block" style={{ '--t': c.tone }}>
                <div className="cat-head"><h2><i className="dot" />{c.name}</h2><span>{c.hint}</span></div>
                <div className="game-grid">{games.map(g => <GameTile key={g.game.id} g={g} />)}</div>
              </section>
            ))
            : <div className="game-grid">{list.map(g => <GameTile key={g.game.id} g={g} />)}</div>}
        </>
      )}
    </div>
  )
}

export function GameView({ id }) {
  const { idx, me, act } = useStore()
  const { level } = usePerks()
  const game = idx.gamesById.get(id)
  const st = useMemo(() => (game ? gameStats(idx, id) : null), [idx, id, game])
  const table = useMemo(() => standings(idx, p => p.game_id === id), [idx, id])
  const [saving, setSaving] = useState(false)
  if (!game) return <div className="page"><TopBar title="لعبة" backTo="/games" /><Empty title="هذي اللعبة غير موجودة" text="يمكن انحذفت." /></div>
  const base = game.base_game_id ? idx.gamesById.get(game.base_game_id) : null
  if (base) {
    return (
      <div className="page">
        <TopBar title={game.name} backTo={`/game/${base.id}`} right={me && <button className="btn small ghost" onClick={() => go(`/game/${id}/edit`)}>تعديل</button>} />
        <div className="stack">
          <a className="glass exp-banner" href={`#/game/${base.id}`}><Cover game={game} className="sm" /><span><small>إضافة للعبة</small><b>{base.name}</b><em>تقييمها وأقيامها في صفحة اللعبة الأصلية ←</em></span></a>
        </div>
      </div>
    )
  }

  const iPlayed = !!me && st.plays.some(p => p.results.some(r => r.player_id === me.id))
  const mine = me ? st.ratings.find(r => r.player_id === me.id)?.score ?? null : null
  const owner = idx.playersById.get(game.owner_id)
  const canEdit = me && (me.is_admin || me.id === game.added_by)
  const c = catOf(game)
  const rate = async v => {
    setSaving(true)
    try { await act((p, pin) => api.setRating(p, pin, id, v)) } catch { /* toast */ } finally { setSaving(false) }
  }
  const ratingsSorted = [...st.ratings].sort((a, b) => b.score - a.score)
  const durs = st.plays.filter(p => p.started_at && p.ended_at).map(p => (new Date(p.ended_at) - new Date(p.started_at)) / 60000).filter(m => m > 0)
  const realAvg = durs.length ? (m => (m >= 60 ? `${Math.floor(m / 60)}س ${m % 60}د` : `${m} د`))(Math.round(durs.reduce((x, y) => x + y, 0) / durs.length)) + (durs.length > 1 ? ` (${durs.length} أقيام)` : '') : null
  const otherEleven = me ? idx.ratings.find(r => r.player_id === me.id && Number(r.score) === 11 && r.game_id !== id && (idx.gamesById.get(r.game_id)?.category || '') === (game.category || '')) : null
  const elevenInfo = level < 6 ? { ok: false, why: '🔒 تنفتح في مستوى 6' } : otherEleven ? { ok: false, why: `عطيتها لـ ${idx.gamesById.get(otherEleven.game_id)?.name}` } : { ok: true }

  return (
    <div className="page">
      <TopBar title={game.name} backTo="/games" right={canEdit && <button className="btn small ghost" onClick={() => go(`/game/${id}/edit`)}>تعديل</button>} />
      <div className="stack">
        <TableHero game={game} />
        <div className="game-meta">
          <a className="cat-pill" href="#/games" onClick={() => write('tw-gcat', c.id)} style={{ '--t': c.tone }}><i className="dot" />{c.name}</a>
          <div className="gh-avg"><ScoreBadge value={st.avg} big /><span>{st.ratings.length ? `تقييم العيال من ${st.ratings.length}` : 'ما أحد قيّمها'}<br /><small className="muted">{st.plays.length} قيم، {ago(daysSince(st.lastPlayed))}{owner ? `، لعبة ${owner.name}` : ''}</small></span></div>
        </div>

        {(() => { const k = kingOf(idx, id); return k?.player ? <a className="glass king" href={`#/player/${k.player.id}`}><Avatar player={k.player} size={34} /><span><small>👑 ملك اللعبة</small><b>{k.player.name}</b></span><em>{k.wins} فوز · قدّام الثاني بـ{k.gap}</em></a> : null })()}
        <div className="facts-grid">
          <div><span>اللاعبين</span><b>{playersText(game) || '—'}</b></div>
          <div><span>المدة</span><b>{timeText(game) ? timeText(game).replace(' د', ' دقيقة') : '—'}</b></div>
          <div><span>الصعوبة</span><b>{game.weight != null ? <><Weight value={game.weight} compact /> <small className="muted">{weightLabel(game.weight)}</small></> : '—'}</b></div>
          <div><span>سنة الإصدار</span><b>{game.year || '—'}</b></div>
          <div><span>طريقة الفوز</span><b>{SCORING[game.scoring || 'rank'].icon} {SCORING[game.scoring || 'rank'].name}</b></div>
          {realAvg && <div><span>مدتها عندنا</span><b>⏱️ {realAvg}</b></div>}
        </div>
        <FridayButton gameId={game.id} />
        {game.bgg_id && <a className="bgg-link" href={`https://boardgamegeek.com/boardgame/${game.bgg_id}`} target="_blank" rel="noreferrer">صفحتها في BoardGameGeek ↗</a>}

        {me && !iPlayed && <div className="glass pad lock-rate">🔒 جرّب اللعبة أول وبعدها تقدر تقيّمها</div>}
        {me && iPlayed && (
          <Section title={mine != null ? `تقييمك: ${fmtScore(mine)}` : 'قيّمها'} action={mine != null && <button className="link-btn" disabled={saving} onClick={() => rate(null)}>امسح تقييمي</button>}>
            <div className="pad-x"><RatingInput value={mine} onChange={rate} disabled={saving} eleven={elevenInfo} /></div>
          </Section>
        )}

        <ExpansionsSection game={game} baseAvg={st.avg} />

        <Section title="تقييمات العيال">
          {ratingsSorted.length ? (
            <ul className="bars">
              {ratingsSorted.map(r => {
                const p = idx.playersById.get(r.player_id)
                return (
                  <li key={r.player_id}>
                    <PlayerTag player={p} size={22} />
                    <span className="bar"><span style={{ width: `${r.score * 10}%` }} /></span>
                    <b className="num">{fmtScore(r.score)}</b>
                  </li>
                )
              })}
            </ul>
          ) : <p className="muted pad">كن أول واحد يقيّمها.</p>}
        </Section>

        {table.some(r => r.plays > 0) && (
          <Section title="ترتيب هذي اللعبة" action={<a className="more" href="#/rank">كيف ينحسب؟</a>}>
            <StandingRows rows={table} me={me} compact />
            {st.topScore && <p className="muted pad-x pad-b small">أعلى نقاط: <b>{st.topScore.score}</b> لـ {idx.playersById.get(st.topScore.player_id)?.name} في {fmtDate(st.topScore.played_on)}</p>}
          </Section>
        )}

        <GameComments gameId={game.id} />

        <Section title="الأقيام">
          {st.plays.length
            ? <div className="play-list">{st.plays.slice(0, 20).map(p => <PlayCard key={p.id} play={p} showGame={false} />)}</div>
            : <p className="muted pad">ما انلعبت للحين. أول قيم لها يكون تاريخي.</p>}
        </Section>
      </div>
    </div>
  )
}

export function GameForm({ id }) {
  const { idx, me, act } = useStore()
  const game = id ? idx.gamesById.get(id) : null
  const [f, setF] = useState(() => ({
    name: game?.name || '', image_url: game?.image_url || '', category: game?.category || '',
    min_players: game?.min_players ?? '', max_players: game?.max_players ?? '',
    play_minutes: game?.play_minutes ?? '', max_minutes: game?.max_minutes ?? '',
    weight: game?.weight ?? '', year: game?.year ?? '', bgg_id: game?.bgg_id ?? '',
    owner_id: game?.owner_id || me?.id || '', base: game?.base_game_id || '',
  }))
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = k => e => setF(s => ({ ...s, [k]: e.target.value }))
  const num = (k, len = 3) => e => setF(s => ({ ...s, [k]: e.target.value.replace(/\D/g, '').slice(0, len) }))

  if (!me) return <div className="page"><TopBar title="لعبة" /><Empty title="ادخل باسمك أول" /></div>
  if (id && !game) return <div className="page"><TopBar title="لعبة" /><Empty title="هذي اللعبة غير موجودة" /></div>

  const n = v => (v === '' || v == null ? null : Number(v))
  const save = async e => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await act((p, pin) => api.saveGame(p, pin, {
        id: game?.id, name: f.name, image_url: f.image_url.trim(), category: f.category || null,
        min_players: n(f.min_players), max_players: n(f.max_players),
        play_minutes: n(f.play_minutes), max_minutes: n(f.max_minutes),
        weight: f.weight === '' ? null : Math.min(5, Math.max(1, Number(f.weight))), year: n(f.year), bgg_id: n(f.bgg_id),
        owner_id: f.owner_id || null,
      }), game ? 'انحفظت اللعبة' : 'انضافت اللعبة')
      if ((f.base || null) !== (game?.base_game_id || null)) {
        try { await act((p, pin) => api.setGameBase(p, pin, res.id || game.id, f.base || null)) } catch { /* toast */ }
      }
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
      <form className="stack" onSubmit={save}>
        <div className="glass pad form">
          <div className="form-top">
            <div className="cover-preview"><Cover game={{ name: f.name || 'اسم اللعبة', image_url: f.image_url.trim() || null, category: f.category }} /></div>
            <Field label="اسم اللعبة">
              <input className="input" required value={f.name} onChange={set('name')} placeholder="مثلاً: Catan" autoFocus={!game} />
            </Field>
          </div>
          <Field label="التصنيف">
            <select className="input" value={f.category} onChange={set('category')}>
              <option value="">بدون تصنيف</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="هل هي إضافة؟" hint="لو هي إضافة (Expansion) ما تنلعب لحالها، اختر لعبتها الأصلية. ما بتطلع في الرف لحالها، وتنلعب وتتقيّم مع الأصلية.">
            <select className="input" value={f.base} onChange={set('base')}>
              <option value="">لا، لعبة مستقلة</option>
              {idx.games.filter(g => g.id !== game?.id).sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>إضافة لـ {g.name}</option>)}
            </select>
          </Field>
          <Field label="رابط صورة الغلاف (اختياري)" hint="من BoardGameGeek: افتح صورة اللعبة، اضغط عليها مطوّل وانسخ عنوان الصورة.">
            <input className="input" dir="ltr" inputMode="url" value={f.image_url} onChange={set('image_url')} placeholder="https://..." />
          </Field>
          <div className="row gap">
            <Field label="أقل لاعبين"><input className="input" inputMode="numeric" value={f.min_players} onChange={num('min_players', 2)} placeholder="2" /></Field>
            <Field label="أكثر لاعبين"><input className="input" inputMode="numeric" value={f.max_players} onChange={num('max_players', 2)} placeholder="4" /></Field>
          </div>
          <div className="row gap">
            <Field label="أقل مدة (دقيقة)"><input className="input" inputMode="numeric" value={f.play_minutes} onChange={num('play_minutes')} placeholder="30" /></Field>
            <Field label="أكثر مدة (دقيقة)"><input className="input" inputMode="numeric" value={f.max_minutes} onChange={num('max_minutes')} placeholder="60" /></Field>
          </div>
          <div className="row gap">
            <Field label="الصعوبة (1 إلى 5)" hint={f.weight !== '' ? weightLabel(Number(f.weight)) : 'من BGG'}>
              <input className="input" inputMode="decimal" value={f.weight} onChange={e => setF(s => ({ ...s, weight: e.target.value.replace(/[^\d.]/g, '').slice(0, 4) }))} placeholder="2.3" />
            </Field>
            <Field label="سنة الإصدار"><input className="input" inputMode="numeric" value={f.year} onChange={num('year', 4)} placeholder="2020" /></Field>
            <Field label="رقمها في BGG"><input className="input" inputMode="numeric" value={f.bgg_id} onChange={num('bgg_id', 7)} placeholder="13" /></Field>
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

