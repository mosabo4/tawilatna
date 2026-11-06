import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { leaderboard } from '../stats'
import { Avatar, Section, Empty, Cover } from '../ui'
import { useFriday } from './Social'
import { computeLevels } from '../levels'
import { Stage } from '../characters'
import { buildEvents, getSeen, timeAgo } from '../events'
import { api } from '../api'
import { getLive, livePlays } from '../live'

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
  const newPosts = events.filter(e => e.post && e.at > seen && e.by !== me?.id).length

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
  const tonight = live ? livePlays(idx, live).length : 0

  return (
    <div className="page stack home">
      <Scenes />

      {live ? (
        <a className="live-card big" href="#/live">
          <div className="row gap center"><span className="pulse" /><b>الجلسة شغّالة</b></div>
          <div className="live-people">{live.players.map(id => idx.playersById.get(id)).filter(Boolean).map(p => <Avatar key={p.id} player={p} size={30} />)}</div>
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
