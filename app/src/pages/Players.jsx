import { useMemo, useState } from 'react'
import { cooldownLeft, isImmune } from '../actions'
import { STICKERS, Sticker } from '../stickers'
import { useStore, go } from '../store'
import { playerStats, versus } from '../stats'
import { Avatar, Donut, TopBar, Section, Empty, Cover, fmtDate, fmtScore, ScoreBadge } from '../ui'
import { PlayCard } from './History'
import { useLevels, LevelPill } from './Levels'
import { usePerks, TitleBadge } from '../perks'
import { Character } from '../characters'
import { xpLog, XP_RULES, levelOfReward } from '../levels'
import { timeAgo } from '../events'

export function PlayerView({ id }) {
  const { idx, me, logout } = useStore()
  const player = idx.playersById.get(id)
  const st = useMemo(() => (player ? playerStats(idx, id) : null), [idx, id, player])
  const levels = useLevels()
  const { look } = usePerks()
  const lk = look(id)
  const mine = me?.id === id
  if (!player) return <div className="page"><TopBar title="لاعب" backTo="/players" /><Empty title="هذا اللاعب غير موجود" /></div>
  const ratings = idx.ratings.filter(r => r.player_id === id).sort((x, y) => y.score - x.score)
  const records = [...st.games].sort((x, y) => y.plays - x.plays)
  const others = idx.players.filter(p => p.id !== id)
  const lv = levels.get(id)
  const xlog = xpLog(idx, id)

  return (
    <div className="page">
      <TopBar title={player.name} backTo="/rank" right={me?.id === id && <button className="btn small ghost" onClick={() => go('/me')}>حسابي</button>} />
      <div className="stack">
        <div className={`glass lead ${lk.gold ? 'gold-card' : ''}`} style={lk.bg ? { background: lk.bg.css } : null}>
          <Donut value={(st.points ?? 0) / 100}><Avatar player={player} size={56} /></Donut>
          <div className="lead-info">
            {lk.title ? <TitleBadge title={lk.title} kind={lk.titleKind} small /> : <small>المستوى</small>}
            <strong className={lk.nameFx ? 'name-fx' : ''}>{player.name}</strong>
            <p>{st.plays ? `المستوى ${st.points ?? '—'} · فاز ${st.wins} من ${st.plays} قيم` : 'ما لعب للحين'}</p>
          </div>
        </div>
        {lv && (
          <a className="glass lv-home" href={mine ? "#/progress" : "#/progress/crew"}>
            <span className="lv-main">
              <span className="lv-top"><b>ليفل {lv.level} · {lv.title}</b><small>{lv.xp} XP</small></span>
              <span className="lv-bar"><span style={{ width: `${Math.max(3, lv.progress * 100)}%`, '--c': player.color }} /></span>
              <small className="lv-hint">🏅 {lv.achievements.filter(a => a.done).length} من {lv.achievements.length} إنجاز</small>
            </span>
          </a>
        )}
        {!mine && me && <PlayerPowers target={player} />}
        <Challenges pid={id} />
        {!mine && me && <Weakness pid={id} />}
        {(levels.get(id)?.level || 0) >= levelOfReward('legendPage') && <LegendWins pid={id} />}
        <YearMedals pid={id} />
        <div className="row3">
          <div><b>{st.wins}</b><span>فوز</span></div>
          <div><b>{st.plays}</b><span>قيم</span></div>
          <div><b>{st.points ?? '—'}</b><span>المستوى</span></div>
        </div>
        {lv && <XpBreakdown lv={lv} log={xlog} />}
      </div>

      <div className="stack">
        <div className="glass facts">
          <dl>
            <div><dt>ملعبه</dt><dd>{st.bestGame ? <a href={`#/game/${st.bestGame.game.id}`}>{st.bestGame.game.name} ({st.bestGame.wins} فوز)</a> : '—'}</dd></div>
            <div><dt>أكثر لعبة لعبها</dt><dd>{st.mostPlayed ? <a href={`#/game/${st.mostPlayed.game.id}`}>{st.mostPlayed.game.name}</a> : '—'}</dd></div>
            <div><dt>لعبته المفضلة</dt><dd>{st.favorite ? <a href={`#/game/${st.favorite.game.id}`}>{st.favorite.game.name} ({fmtScore(st.favorite.score)})</a> : '—'}</dd></div>
            <div><dt>آخر قيم</dt><dd>{st.lastPlayed ? fmtDate(st.lastPlayed) : '—'}</dd></div>
          </dl>
        </div>

        {others.length > 0 && (
          <Section title="قارنه مع">
            <div className="chips pad-x pad-b">
              {others.map(o => <a key={o.id} className="chip" href={`#/vs/${id}/${o.id}`}><Avatar player={o} size={20} />{o.name}</a>)}
            </div>
          </Section>
        )}

        {records.length > 0 && (
          <Section title="سجله في كل لعبة">
            <table className="table">
              <thead><tr><th>اللعبة</th><th>قيم</th><th>فوز</th><th>تقييمه</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.game.id} onClick={() => go(`/game/${r.game.id}`)}>
                    <td>{r.game.name}</td>
                    <td className="num">{r.plays}</td>
                    <td className="num strong">{r.wins}</td>
                    <td className="num">{fmtScore(ratings.find(x => x.game_id === r.game.id)?.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {ratings.length > 0 && (
          <Section title={`تقييماته (${ratings.length})`}>
            <ul className="link-list">
              {ratings.map(r => {
                const g = idx.gamesById.get(r.game_id)
                return g && <li key={r.game_id}><a href={`#/game/${g.id}`}><span className="nm">{g.name}</span><ScoreBadge value={r.score} /></a></li>
              })}
            </ul>
          </Section>
        )}

        <Section title="آخر أقيامه">
          {st.recent.length
            ? <div className="play-list">{st.recent.map(p => <PlayCard key={p.id} play={p} />)}</div>
            : <Empty title="ما لعب للحين" />}
        </Section>
        {me?.id === id && <button className="btn danger-link" onClick={logout}>اطلع من الحساب</button>}
      </div>
    </div>
  )
}

export function VersusView({ a, b }) {
  const { idx } = useStore()
  const pa = idx.playersById.get(a), pb = idx.playersById.get(b)
  const v = useMemo(() => (pa && pb ? versus(idx, a, b) : null), [idx, a, b, pa, pb])
  if (!pa || !pb) return <div className="page"><TopBar title="مقارنة" backTo="/players" /><Empty title="اختر لاعبين موجودين" /></div>
  const total = v.aAhead + v.bAhead + v.tie
  return (
    <div className="page">
      <TopBar title="مين يغلب مين" backTo="/players" />
      <div className="glass vs-hero">
        <a className="vs-side" href={`#/player/${a}`}>
          <Avatar player={pa} size={64} ring={v.aAhead > v.bAhead} />
          <span>{pa.name}</span>
          <b>{v.aAhead}</b>
        </a>
        <span className="vs-mid">ضد</span>
        <a className="vs-side" href={`#/player/${b}`}>
          <Avatar player={pb} size={64} ring={v.bAhead > v.aAhead} />
          <span>{pb.name}</span>
          <b>{v.bAhead}</b>
        </a>
      </div>
      {total > 0 && (
        <div className="vs-bar" aria-hidden="true">
          <span className="a" style={{ flex: v.aAhead }} />
          {v.tie > 0 && <span className="t" style={{ flex: v.tie }} />}
          <span className="b" style={{ flex: v.bAhead }} />
        </div>
      )}
      <p className="vs-sub">{total ? `لعبوا مع بعض ${total} قيم${v.tie ? `، وتعادلوا ${v.tie}` : ''}. الرقم يعني كم مرة خلّص قدّام الثاني.` : 'ما لعبوا مع بعض للحين.'}</p>
      <div className="stack">
        {v.shared.length > 0 && <Section title="أقيامهم مع بعض"><div className="play-list">{v.shared.slice(0, 30).map(p => <PlayCard key={p.id} play={p} focus={[a, b]} />)}</div></Section>}
      </div>
    </div>
  )
}

// قائمة الشلة بشخصياتهم
export default function PlayersList() {
  const { idx, me } = useStore()
  const { look } = usePerks()
  const levels = useLevels()
  const list = [...idx.players].sort((a, b) => (levels.get(b.id)?.xp || 0) - (levels.get(a.id)?.xp || 0))
  return (
    <div className="page">
      <div className="stack">
        <div className="crew">
          {list.map(p => {
            const lv = levels.get(p.id)
            const lk = look(p.id)
            return (
              <a key={p.id} className={`glass crew-card ${lk.gold ? 'gold-card' : ''} ${p.id === me?.id ? 'is-me' : ''}`} href={`#/player/${p.id}`} style={{ '--c': lk.color || p.color, ...(lk.bg ? { background: lk.bg.css } : {}) }}>
                <span className="crew-char"><Character player={p} size={92} /></span>
                <b className={lk.nameFx ? 'name-fx' : ''}>{p.name}</b>
                {lk.title ? <TitleBadge title={lk.title} kind={lk.titleKind} small /> : <small>{lv?.title}</small>}
                {lv && <span className="crew-lv"><LevelPill level={lv.level} /> ليفل</span>}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ألعابي (لصفحة حسابي)
export function MyGames() {
  const { idx, me } = useStore()
  const games = useMemo(() => {
    const m = new Map()
    for (const p of idx.plays) if (p.results.some(r => r.player_id === me.id)) m.set(p.game_id, (m.get(p.game_id) || 0) + 1)
    const rated = new Map(idx.ratings.filter(r => r.player_id === me.id).map(r => [r.game_id, r.score]))
    return [...m.entries()].map(([id, n]) => ({ game: idx.gamesById.get(id), n, score: rated.get(id) }))
      .filter(x => x.game).sort((a, b) => (a.score != null) - (b.score != null) || b.n - a.n)
  }, [idx, me])
  if (!games.length) return null
  return (
    <Section title="ألعابك" action={<span className="muted small">{games.length} لعبة</span>}>
      <div className="mini-games my-games">
        {games.map(x => (
          <a key={x.game.id} className="mini-game" href={`#/game/${x.game.id}`}>
            <Cover game={x.game} className="sm" />
            <span className="mg-name">{x.game.name}</span>
            {x.score != null ? <ScoreBadge value={x.score} /> : <span className="rate-tag">قيّمها</span>}
            <small className="muted">{x.n === 1 ? 'مرة' : `${x.n} مرات`}</small>
          </a>
        ))}
      </div>
    </Section>
  )
}

// من وين جاه الـXP + آخر الأشياء اللي عطته
function XpBreakdown({ lv, log }) {
  const [more, setMore] = useState(false)
  const rows = [...XP_RULES.map(r => ({ icon: r.icon, label: r.label.replace(/ \(.*\)$/, ''), xp: lv.parts[r.id] || 0 })), { icon: '🏅', label: 'الإنجازات', xp: lv.achXp }].filter(r => r.xp > 0).sort((a, b) => b.xp - a.xp)
  const max = rows[0]?.xp || 1
  const shown = log.slice(0, more ? 30 : 8)
  return (
    <Section title={`⚡ من وين جاه الـXP`} action={<span className="muted small">{lv.xp} XP</span>}>
      <ul className="xp-src">
        {rows.map(r => (
          <li key={r.label}><span className="xs-ic">{r.icon}</span><span className="xs-main"><span className="xs-top"><b>{r.label}</b><em>{r.xp}</em></span><span className="xs-bar"><i style={{ width: `${Math.max(3, (r.xp / max) * 100)}%` }} /></span></span></li>
        ))}
      </ul>
      {log.length > 0 && <>
        <h3 className="xs-h">آخر XP</h3>
        <ul className="xp-log">
          {shown.map((e, i) => <li key={i}><span>{e.icon}</span><span className="xl-t">{e.text}<small>{timeAgo(e.at)}</small></span><b>+{e.xp}</b></li>)}
        </ul>
        {log.length > 8 && <button className="link-btn pad-x pad-b" onClick={() => setMore(m => !m)}>{more ? 'أقل' : 'شوف أكثر'}</button>}
      </>}
    </Section>
  )
}

// أشياء تسويها مع لاعب ثاني من صفحته (حسب ليفلك)
function PlayerPowers({ target }) {
  const { idx, me } = useStore()
  const { can, doAction, levels } = usePerks()
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [txt, setTxt] = useState('')
  const [art, setArt] = useState('cry')
  const [game, setGame] = useState('')
  const run = async (...a) => { setBusy(true); try { await doAction(...a); setOpen(null); setTxt('') } catch { /* toast */ } finally { setBusy(false) } }
  const cd = (k, d) => cooldownLeft(idx, me.id, k, d)
  const immune = isImmune(idx, target.id)
  const items = [
    { id: 'challenge', icon: '⚔️', label: 'تحدّاه', left: 0 },
    { id: 'gift', icon: '🎁', label: 'أهدِه 50 XP', left: cd('gift', 7) },
    { id: 'tease', icon: '😭', label: 'ملصق', left: cd('tease', 7) },
    { id: 'baby', icon: '👶', label: 'بيبي', left: cd('baby', 7) },
    { id: 'retitle', icon: '🏷️', label: 'غيّر لقبه', left: cd('retitle', 7) },
    { id: 'caption', icon: '💬', label: 'تعليق إجباري', left: cd('caption', 7) },
    { id: 'nick', icon: '🎭', label: 'اسم مستعار', left: cd('nick', 7) },
    { id: 'godfather', icon: '🤝', label: 'كن عرّابه', left: cd('godfather', 30) },
  ].filter(x => can(x.id) && !(immune && ['tease', 'baby', 'retitle', 'caption', 'nick'].includes(x.id)) && (x.id !== 'godfather' || (levels?.get(target.id)?.level || 1) <= (levels?.get(me.id)?.level || 1) - 2))
  if (!items.length) return null
  return (
    <div className="glass ppow">
      {immune && <p className="hint">🛡️ {target.name} محصّن هالأسبوع، محد يقدر يطقطق عليه.</p>}
      <div className="ppow-row">
        {items.map(x => <button key={x.id} className={`chip ${open === x.id ? 'on' : ''}`} disabled={x.left > 0} onClick={() => setOpen(open === x.id ? null : x.id)}>{x.icon} {x.label}{x.left ? ` · ${x.left} يوم` : ''}</button>)}
      </div>
      {open === 'challenge' && <div className="ppow-body">
        <select className="input" value={game} onChange={e => setGame(e.target.value)}><option value="">أي لعبة</option>{[...idx.games].sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <button className="btn primary small" disabled={busy} onClick={() => run('challenge', { target: target.id, game: game || null }, `⚔️ تحدّيت ${target.name}`)}>أرسل التحدي</button>
        <p className="hint">أول قيم يجمعكم خلال أسبوعين ينحسب.</p>
      </div>}
      {open === 'caption' && <div className="ppow-body">
        <input className="input" maxLength={50} value={txt} onChange={e => setTxt(e.target.value)} placeholder="جملة تطلع تحت اسمه في الترتيب يوم كامل" />
        <button className="btn primary small" disabled={busy || !txt.trim()} onClick={() => run('caption', { target: target.id, data: { text: txt.trim() } }, '💬 انكتبت تحت اسمه')}>ثبّت</button>
      </div>}
      {open === 'nick' && <div className="ppow-body">
        <input className="input" maxLength={16} value={txt} onChange={e => setTxt(e.target.value)} placeholder="اسمه الجديد لمدة ساعتين" />
        <button className="btn primary small" disabled={busy || !txt.trim()} onClick={() => run('nick', { target: target.id, data: { name: txt.trim() } }, '🎭 تغيّر اسمه ساعتين')}>غيّر</button>
      </div>}
      {open === 'godfather' && <div className="ppow-body">
        <p>الجلسة الجاية اللي تحضرونها مع بعض: {target.name} ياخذ نص الـXP اللي تكسبه من أقيامك، وأنت تاخذ +20.</p>
        <button className="btn primary small" disabled={busy} onClick={() => run('godfather', { target: target.id }, `🤝 صرت عرّاب ${target.name}`)}>تمام</button>
      </div>}
      {open === 'gift' && <div className="ppow-body">
        <p>{target.name} ياخذ 50 XP هدية منك، وأنت ما تخسر شي.</p>
        <button className="btn primary small" disabled={busy} onClick={() => run('gift', { target: target.id }, `🎁 وصلت الهدية لـ${target.name}`)}>أرسل الهدية</button>
      </div>}
      {open === 'tease' && <div className="ppow-body">
        <div className="arts">{STICKERS.map(t => <button key={t.id} type="button" className={art === t.id ? 'on' : ''} onClick={() => setArt(t.id)}><Sticker id={t.id} size={30} /></button>)}</div>
        <button className="btn primary small" disabled={busy} onClick={() => run('tease', { target: target.id, data: { art } }, '😈 انلزق 3 أيام')}>لزّقه 3 أيام</button>
      </div>}
      {open === 'baby' && <div className="ppow-body">
        <p>{target.name} بيصير بيبي يبكي 🍼 في كل التطبيق يوم كامل.</p>
        <button className="btn primary small" disabled={busy} onClick={() => run('baby', { target: target.id }, '👶 صار بيبي')}>سوّه بيبي</button>
      </div>}
      {open === 'retitle' && <div className="ppow-body">
        <input className="input" maxLength={22} value={txt} onChange={e => setTxt(e.target.value)} placeholder="اللقب الجديد (يوم كامل)" />
        <button className="btn primary small" disabled={busy || !txt.trim()} onClick={() => run('retitle', { target: target.id, data: { title: txt.trim() } }, '🏷️ تغيّر لقبه')}>غيّر</button>
      </div>}
    </div>
  )
}

// سجل التحديات الرسمية
function Challenges({ pid }) {
  const { idx } = useStore()
  const { fx } = usePerks()
  const list = (fx?.challenges || []).filter(c => c.player_id === pid || c.target === pid)
  if (!list.length) return null
  const nm = id => idx.playersById.get(id)?.name
  const won = list.filter(c => c.winner === pid).length, lost = list.filter(c => c.winner && c.winner !== pid).length
  return (
    <Section title="⚔️ التحديات الرسمية" action={<span className="muted small">{won} فوز · {lost} خسارة</span>}>
      <ul className="chal">
        {list.slice(0, 8).map(c => (
          <li key={c.id}>
            <span className="ch-vs"><b>{nm(c.player_id)}</b> ⚔️ <b>{nm(c.target)}</b>{c.game_id && <small> · {idx.gamesById.get(c.game_id)?.name}</small>}</span>
            {c.play ? (c.winner ? <em className={c.winner === pid ? 'w' : 'l'}>🏆 {nm(c.winner)}</em> : <em>تعادل</em>) : <em className="p">⏳ ينتظر</em>}
          </li>
        ))}
      </ul>
    </Section>
  )
}

// نقطة ضعف الخصم (ليفل 10)
function Weakness({ pid }) {
  const { idx } = useStore()
  const { can } = usePerks()
  if (!can('weakness')) return null
  const by = new Map()
  for (const p of idx.plays) {
    const g = idx.gamesById.get(p.game_id); const r = p.results.find(x => x.player_id === pid)
    if (!r || p.results.length < 2) continue
    const s = by.get(p.game_id) || { g, n: 0, w: 0 }; s.n++; if (r.position === 1) s.w++; by.set(p.game_id, s)
  }
  const w = [...by.values()].filter(x => x.n >= 2).sort((a, b) => a.w / a.n - b.w / b.n || b.n - a.n)[0]
  if (!w) return null
  return <div className="glass weak">🎯 <span>نقطة ضعفه: <b>{w.g?.name}</b> · فاز {w.w} من {w.n}</span></div>
}

// صفحة الأسطورة (ليفل 18): أعظم الانتصارات
function LegendWins({ pid }) {
  const { idx } = useStore()
  const { levels } = usePerks()
  const wins = idx.plays.filter(p => p.results.length > 1 && p.results.some(r => r.player_id === pid && r.position === 1)).map(p => {
    const g = idx.gamesById.get(p.game_id)
    const rivals = p.results.filter(r => r.player_id !== pid)
    const lvSum = rivals.reduce((t, r) => t + (levels?.get(r.player_id)?.level || 1), 0)
    return { p, g, score: rivals.length * 10 + (g?.weight || 1.5) * 8 + lvSum * 2 }
  }).sort((a, b) => b.score - a.score).slice(0, 5)
  if (!wins.length) return null
  return (
    <Section title="🏛️ أعظم الانتصارات">
      <ol className="legend-wins">{wins.map(w => <li key={w.p.id}><a href={`#/play/${w.p.id}`}><Cover game={w.g} className="xs" /><span><b>{w.g?.name}</b><small>فاز على {w.p.results.length - 1} · {fmtDate(w.p.played_on)}</small></span></a></li>)}</ol>
    </Section>
  )
}

// أوسمة السنة: تتوزع آخر السنة
export function yearAwards(idx, year) {
  const ps = idx.plays.filter(p => p.played_on.startsWith(String(year)) && p.results.length > 1)
  if (!ps.length) return []
  const m = new Map(idx.players.map(p => [p.id, { wins: 0, plays: 0, days: new Set(), games: new Set() }]))
  for (const p of ps) for (const r of p.results) { const s = m.get(r.player_id); if (!s) continue; s.plays++; if (r.position === 1) s.wins++; s.days.add(p.played_on); s.games.add(p.game_id) }
  const top = f => [...m.entries()].sort((a, b) => f(b[1]) - f(a[1]))[0]
  return [
    { icon: '🏆', name: 'بطل السنة', who: top(s => s.wins)[0], v: `${top(s => s.wins)[1].wins} فوز` },
    { icon: '📅', name: 'ما يغيب', who: top(s => s.days.size)[0], v: `${top(s => s.days.size)[1].days.size} جلسة` },
    { icon: '📚', name: 'المستكشف', who: top(s => s.games.size)[0], v: `${top(s => s.games.size)[1].games.size} لعبة` },
    { icon: '🎲', name: 'مدمن اللعب', who: top(s => s.plays)[0], v: `${top(s => s.plays)[1].plays} قيم` },
  ]
}
function YearMedals({ pid }) {
  const { idx } = useStore()
  const now = new Date(), y = now.getFullYear()
  const years = [...new Set(idx.plays.map(p => +p.played_on.slice(0, 4)))].filter(x => x < y)
  const mine = years.flatMap(yr => yearAwards(idx, yr).filter(a => a.who === pid).map(a => ({ ...a, yr })))
  const cur = yearAwards(idx, y).filter(a => a.who === pid)
  if (!mine.length && !cur.length) return null
  return (
    <Section title="🎖️ أوسمة السنة">
      <div className="medals">
        {mine.map(a => <span key={a.yr + a.name} className="medal-b"><i>{a.icon}</i><b>{a.name} {a.yr}</b><small>{a.v}</small></span>)}
        {cur.map(a => <span key={'c' + a.name} className="medal-b soon"><i>{a.icon}</i><b>{a.name} {y}</b><small>متصدّر الحين · تتوزع 31 ديسمبر</small></span>)}
      </div>
    </Section>
  )
}
