import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { leaderboard } from '../stats'
import { Avatar, Section, Empty, Cover } from '../ui'
import { useFriday } from './Social'
import { computeLevels } from '../levels'
import { Stage, Character } from '../characters'
import { buildEvents, getSeen, timeAgo } from '../events'
import { api } from '../api'
import { getLive, livePlays } from '../live'
import { usePerks } from '../perks'
import { boardSide, goldenAlert, hotSeat } from '../actions'
import { missionOf, todayKey, idxBefore, levelOfReward } from '../levels'

export default function Home() {
  const { idx, me } = useStore()
  const board = useMemo(() => leaderboard(idx), [idx])
  const top3 = board.filter(b => b.plays > 0).slice(0, 3)
  const { byGame, mine, picks } = useFriday()
  const live = getLive()
  const events = useMemo(() => buildEvents(idx).filter(e => !e.post), [idx])
  const seen = getSeen()

  const unrated = useMemo(() => {
    if (!me) return []
    const played = new Set(idx.plays.filter(p => p.results.some(r => r.player_id === me.id)).map(p => p.game_id))
    const rated = new Set(idx.ratings.filter(r => r.player_id === me.id).map(r => r.game_id))
    return [...played].filter(id => !rated.has(id)).map(id => idx.gamesById.get(id)).filter(Boolean)
  }, [idx, me])
  const newPosts = useMemo(() => buildEvents(idx).filter(e => e.post && e.at > seen && e.by !== me?.id).length, [idx, seen, me])
  const { fx, levels } = usePerks()

  if (!idx.games.length) {
    return (
      <div className="page">
        <Empty title="الطاولة فاضية" text="ابدأ بإضافة ألعابك، بعدها تقدرون تسجلون الأقيام وتقيّمونها."
          action={me && <button className="btn primary" onClick={() => go('/games/new')}>أضف أول لعبة</button>} />
      </div>
    )
  }

  const top = [...byGame.entries()].sort((a, b) => b[1].length - a[1].length).map(([id, ps]) => ({ g: idx.gamesById.get(id), n: ps.length })).filter(x => x.g)
  const pickers = [...new Set(picks.map(p => p.player_id))].map(id => idx.playersById.get(id)).filter(Boolean)
  const needs = []
  if (me && unrated.length) needs.push({ icon: '⭐', title: unrated.length === 1 ? `قيّم ${unrated[0].name}` : `قيّم ${unrated.length} ألعاب`, sub: unrated.slice(0, 3).map(g => g.name).join('، '), href: `#/game/${unrated[0].id}`, btn: 'قيّم', hot: true })
  if (me && !mine.size) needs.push({ icon: '🎲', title: 'اختر ألعاب الجلسة', sub: 'وش ودك تلعب المرة الجاية؟', href: '#/friday', btn: 'اختر' })
  if (newPosts) needs.push({ icon: '💬', title: `${newPosts} كتابات جديدة`, sub: 'في لوحة الشلة', href: '#/board', btn: 'افتح' })
  if (me && fx) {
    const nm = id => idx.playersById.get(id)?.name
    for (const c of fx.challenges.filter(c => c.target === me.id && !c.play).slice(0, 2)) needs.push({ icon: '⚔️', title: `${nm(c.player_id)} يتحداك`, sub: c.game_id ? `في ${idx.gamesById.get(c.game_id)?.name}` : 'أول قيم يجمعكم ينحسب', href: `#/player/${c.player_id}`, btn: 'شوف', hot: true })
    for (const m of fx.rematches.filter(m => m.rival === me.id && !m.done).slice(0, 2)) needs.push({ icon: '🔁', title: `${nm(m.player_id)} يطلب ريماتش`, sub: idx.gamesById.get(m.orig?.game_id)?.name || '', href: `#/play/${m.play_id}`, btn: 'شوف', hot: true })
    const lv = levels?.get(me.id)
    const near = lv?.achievements.filter(a => !a.done && a.progress).sort((a, b) => b.progress[0] / b.progress[1] - a.progress[0] / a.progress[1])[0]
    if (near && near.progress[0] / near.progress[1] >= 0.5) needs.push({ icon: near.icon, title: `قرّبت من «${near.name}»`, sub: `${near.desc} · ${Math.min(...near.progress)}/${near.progress[1]}`, href: '#/progress/ach', btn: `+${near.xp} XP` })
  }
  const legends = levels ? [...levels.values()].filter(l => l.level >= 20) : []
  if (me) {
    const m = missionOf(todayKey()); const done = m.test(idx, me.id, todayKey())
    needs.unshift({ icon: '🎯', title: `تحدي اليوم: ${m.text}`, sub: done ? 'خلّصته ✓ ' : 'مهمة اليوم لك وللشلة', href: { rate: '#/me/games', comment: '#/games', post: '#/board', pick: '#/friday', play: '#/live', react: '#/board' }[m.id], btn: done ? '✓ +15' : '+15 XP', hot: !done })
  }
  const nm = id => idx.playersById.get(id)?.name
  const announces = (fx?.challenges || []).filter(c => c.winner && c.play && Date.now() - new Date(c.play.created_at || c.play.played_on).getTime() < 864e5 && (levels?.get(c.winner)?.level || 0) >= levelOfReward('announce'))
  const hs = hotSeat(idx)
  const box = (fx?.boxes || []).find(b => !b.winner)
  const tonight = live ? livePlays(idx, live).length : 0

  return (
    <div className="page stack home">
      {goldenAlert(idx) && <div className="golden-alert"><span>📢</span><p>{goldenAlert(idx).data?.text}<small>— {idx.playersById.get(goldenAlert(idx).player_id)?.name}</small></p></div>}
      {announces.map(c => <div key={c.id} className="announce">📣 <b>{nm(c.winner)}</b> سحق <b>{nm(c.winner === c.player_id ? c.target : c.player_id)}</b> في تحدي رسمي{c.play ? ` (${idx.gamesById.get(c.play.game_id)?.name})` : ''}!</div>)}
      {hs && <div className="announce hot">🔥 الكرسي الساخن: الكل يتحدى <b>{nm(hs.target)}</b> هالأسبوع</div>}
      {box && <div className="announce boxa">💰 في صندوق الشلة <b>{box.amount} XP</b> لأول واحد يفوز!</div>}
      <Scenes />

      {live && boardSide(idx) && <div className="glass board-side">🎯 البورد على اتجاه <b>{idx.playersById.get(boardSide(idx).player_id)?.name}</b> الليلة</div>}
      {live ? (
        <a className="live-card big" href="#/live">
          <div className="row gap center"><span className="pulse" /><b>الجلسة شغّالة</b></div>
          <div className="live-people chars">{live.players.map(id => idx.playersById.get(id)).filter(Boolean).map(p => <Character key={p.id} player={p} size={40} />)}</div>
          <span className="muted small">{tonight} قيم الليلة · اضغط تكمل</span>
        </a>
      ) : (
        <div className="hero-card">
          <small>الجلسة الجاية</small>
          <h2>{top.length ? `الأكثر طلباً: ${top[0].g.name}` : 'وش نلعب؟ 🎲'}</h2>
          <div className="hero-row">
            {pickers.length > 0 && <span className="lr-avs">{pickers.map(p => <Avatar key={p.id} player={p} size={26} />)}</span>}
            <span className="muted small">{pickers.length ? `${pickers.length} اختاروا` : 'ما أحد اختار للحين'}</span>
            <span className="hero-covers">{top.slice(0, 3).map(x => <Cover key={x.g.id} game={x.g} className="xs" />)}</span>
          </div>
          <div className="row gap">
            {me && <button className="btn primary" onClick={() => go('/live')}>▶ ابدأ الجلسة</button>}
            <button className="btn ghost" onClick={() => go('/friday')}>{mine.size ? `اخترت ${mine.size}` : 'اختر ألعابك'}</button>
          </div>
        </div>
      )}

      <MonthStatue />
      {legends.length > 0 && (
        <a className="glass hall" href="#/progress/crew">
          <b>🏛️ قاعة المشاهير</b>
          <div className="hall-row">{legends.map(l => <span key={l.player.id}><Character player={l.player} size={56} /><small>{l.player.name}</small></span>)}</div>
        </a>
      )}

      {needs.length > 0 && (
        <>
          <h2 className="h-sec">يحتاجك</h2>
          <div className="needs">
            {needs.map(n => (
              <a key={n.title} className={`need ${n.hot ? 'hot' : ''}`} href={n.href}>
                <b>{n.icon} {n.title}</b><small>{n.sub}</small><em>{n.btn}</em>
              </a>
            ))}
          </div>
        </>
      )}

      {top3.length > 0 && (
        <a className="glass podium" href="#/rank">
          <div className="pod-head"><b>المتصدرين</b><span className="more">الترتيب كامل ←</span></div>
          <div className="pod-row">
            {[top3[1], top3[0], top3[2]].map((b, k) => b && (
              <div key={b.player.id} className={`pod p${[2, 1, 3][k]}`}>
                <span className="medal">{['🥈', '🥇', '🥉'][k]}</span>
                <Avatar player={b.player} size={[48, 62, 44][k]} />
                <b>{b.player.name}</b>
                <strong>{b.points}%</strong>
                <i className="step" />
              </div>
            ))}
          </div>
        </a>
      )}

      <BoardPeek seen={seen} />

      {events.length > 0 && (
        <Section title="آخر الأحداث" action={<a className="more" href="#/alerts">الكل</a>}>
          <ul className="feed">
            {events.slice(0, 5).map(e => (
              <li key={e.id} className={e.at > seen && e.by !== me?.id ? 'new' : ''}>
                <a href={e.href}>
                  {e.who ? <Avatar player={e.who} size={34} /> : <span className="f-ic">{e.icon}</span>}
                  <span className="f-txt"><b>{e.icon} {e.text}</b><small>{timeAgo(String(e.at))}</small></span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

// مشاهد الشلة: لو أكثر من واحد حاط مشهد، تتبدل كل 6 ثواني ويقدر يضغط على النقاط
function Scenes() {
  const { idx } = useStore()
  const levels = useMemo(() => computeLevels(idx), [idx])
  const list = useMemo(() => (idx.scenes || [])
    .map(s => ({ ...s, a: idx.playersById.get(s.player_id), b: idx.playersById.get(s.target) }))
    .filter(s => s.a && s.b && (s.a.is_admin || (levels.get(s.a.id)?.level || 0) >= 7))
    .sort((x, y) => (y.updated_at || '').localeCompare(x.updated_at || '')), [idx, levels])
  const [i, setI] = useState(0)
  const n = list.length
  useEffect(() => { if (n < 2) return; const t = setInterval(() => setI(v => (v + 1) % n), 6000); return () => clearInterval(t) }, [n, i])
  if (!n) return null
  const cur = list[i % n]
  return (
    <div className="glass stage-card">
      <Stage key={cur.player_id} a={cur.a} b={cur.b} action={cur.action} />
      {n > 1 && <div className="scene-dots">{list.map((s, k) => <button key={s.player_id} className={k === i % n ? 'on' : ''} onClick={() => setI(k)} aria-label={s.a.name} />)}</div>}
    </div>
  )
}

// آخر كتابات اللوحة + كتابة سريعة
function BoardPeek({ seen }) {
  const { idx, me, act } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const posts = [...(idx.posts || [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3)
  if (!posts.length && !me) return null
  const send = async e => {
    e.preventDefault(); if (!text.trim()) return
    setBusy(true)
    try { await act((p, pin) => api.addPost(p, pin, text.trim()), 'انكتبت'); setText('') } catch { /* toast */ } finally { setBusy(false) }
  }
  return (
    <Section title="💬 لوحة الشلة" action={<a className="more" href="#/board">الكل</a>}>
      {posts.length > 0 && (
        <ul className="posts peek">
          {posts.map(p => {
            const who = idx.playersById.get(p.player_id)
            const fresh = p.created_at > seen && p.player_id !== me?.id
            return (
              <li key={p.id} className={`post ${fresh ? 'fresh' : ''}`}>
                <a href="#/board" className="peek-link">
                  <Avatar player={who} size={32} />
                  <div className="post-body">
                    <div className="c-head"><b>{who?.name || '—'}</b><small>{timeAgo(p.created_at)}</small></div>
                    <p>{p.body.length > 140 ? p.body.slice(0, 140) + '…' : p.body}</p>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      )}
      {me && (
        <form className="quick-post" onSubmit={send}>
          <input className="input" maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="اكتب شي للشلة…" />
          <button className="btn primary small" disabled={busy || !text.trim()}>انشر</button>
        </form>
      )}
    </Section>
  )
}

// تمثال الشهر: صاحب أكثر XP في الشهر اللي فات
function MonthStatue() {
  const { idx } = useStore()
  const top = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const end = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const a = computeLevels(idxBefore(idx, end)), b = computeLevels(idxBefore(idx, start))
    const gains = [...a.values()].map(l => ({ p: l.player, g: l.xp - (b.get(l.player.id)?.xp || 0) })).sort((x, y) => y.g - x.g)
    return gains[0]?.g > 0 ? { ...gains[0], month: new Date(start).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long' }) } : null
  }, [idx])
  if (!top) return null
  return (
    <a className="glass statue" href={`#/player/${top.p.id}`}>
      <span className="st-chr"><Character player={top.p} pose="crown" size={70} /></span>
      <span><small>🗿 تمثال شهر {top.month}</small><b>{top.p.name}</b><small>جمع <bdi>{top.g} XP</bdi> في الشهر</small></span>
    </a>
  )
}
