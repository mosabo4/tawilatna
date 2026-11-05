import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { Avatar, Section, Empty, Cover, Confirm, playersText, fmtDate } from '../ui'

// ---------- الجلسة الجاية ----------
// مفتاح الجلسة: أول جمعة بعد آخر قيم مسجّل (القاعدة تبي تاريخ جمعة). ما يظهر للناس،
// وفايدته إن الاختيارات تتصفّر لحالها أول ما تنسجل أقيام الجلسة.
const pad2 = n => String(n).padStart(2, '0')
export function sessionKey(idx) {
  const last = idx.plays.reduce((m, p) => (p.played_on > m ? p.played_on : m), '2000-01-01')
  const d = new Date(last + 'T00:00:00')
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function useFriday() {
  const { idx, me, act } = useStore()
  const week = sessionKey(idx)
  const picks = useMemo(() => (idx.picks || []).filter(p => p.week === week), [idx, week])
  const byGame = useMemo(() => {
    const m = new Map()
    for (const p of picks) { if (!m.has(p.game_id)) m.set(p.game_id, []); m.get(p.game_id).push(idx.playersById.get(p.player_id)) }
    return m
  }, [picks, idx])
  const mine = useMemo(() => new Set(picks.filter(p => p.player_id === me?.id).map(p => p.game_id)), [picks, me])
  const [busy, setBusy] = useState(null)
  const toggle = async gameId => {
    setBusy(gameId)
    try { await act((p, pin) => api.toggleFriday(p, pin, week, gameId)) } catch { /* toast */ } finally { setBusy(null) }
  }
  return { week, picks, byGame, mine, toggle, busy }
}

export function FridayButton({ gameId }) {
  const { me } = useStore()
  const { mine, toggle, busy, byGame } = useFriday()
  if (!me) return null
  const on = mine.has(gameId)
  const others = (byGame.get(gameId) || []).filter(p => p && p.id !== me.id)
  return (
    <div className="friday-btn-wrap">
      <button className={`friday-btn ${on ? 'on' : ''}`} disabled={busy === gameId} onClick={() => toggle(gameId)} aria-pressed={on}>
        <span className="fb-check" aria-hidden="true">{on ? '✓' : '+'}</span>
        <span>{on ? 'بتجربها الجلسة الجاية' : 'أبي أجربها الجلسة الجاية'}</span>
      </button>
      {others.length > 0 && <span className="fb-others">{others.map(p => <Avatar key={p.id} player={p} size={22} />)}<small>{others.length === 1 ? `${others[0].name} بعد` : `و${others.length} غيرك`}</small></span>}
    </div>
  )
}

export function Friday() {
  const { idx, me } = useStore()
  const { picks, byGame, mine, toggle, busy } = useFriday()
  const [q, setQ] = useState('')
  const ranked = useMemo(() => [...byGame.entries()]
    .map(([id, ps]) => ({ game: idx.gamesById.get(id), ps: ps.filter(Boolean) }))
    .filter(x => x.game)
    .sort((a, b) => b.ps.length - a.ps.length || a.game.name.localeCompare(b.game.name)), [byGame, idx])
  const pickers = new Set(picks.map(p => p.player_id)).size
  const list = idx.games
    .filter(g => !q || g.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (mine.has(b.id) - mine.has(a.id)) || a.name.localeCompare(b.name))

  return (
    <div className="page">
      <header className="page-head"><h1>الجلسة الجاية</h1></header>
      <div className="stack">
        <Section title="وش ودّ الشلة يجربون" action={<span className="muted small">{pickers ? `${pickers} اختاروا` : ''}</span>}>
          {ranked.length ? (
            <ol className="friday-rank">
              {ranked.map(({ game, ps }, i) => (
                <li key={game.id}>
                  <a href={`#/game/${game.id}`}>
                    <span className="rk">{i + 1}</span>
                    <Cover game={game} className="xs" />
                    <span className="nm">{game.name}<small>{playersText(game)}</small></span>
                    <span className="avs">{ps.slice(0, 5).map(p => <Avatar key={p.id} player={p} size={24} />)}</span>
                    <b className="votes">{ps.length}</b>
                  </a>
                </li>
              ))}
            </ol>
          ) : <p className="muted pad">ما أحد اختار شي للحين. {me ? 'ابدأ أنت من تحت.' : ''}</p>}
        </Section>

        {me ? (
          <Section title="اختياراتي" action={<span className="muted small">{mine.size ? `${mine.size} لعبة` : 'اختر اللي ودك فيه'}</span>}>
            <div className="pad-x"><input className="input" type="search" placeholder="دوّر لعبة" value={q} onChange={e => setQ(e.target.value)} /></div>
            <ul className="pick-list">
              {list.map(g => {
                const on = mine.has(g.id)
                return (
                  <li key={g.id}>
                    <button className={on ? 'on' : ''} disabled={busy === g.id} onClick={() => toggle(g.id)} aria-pressed={on}>
                      <Cover game={g} className="xs" />
                      <span className="nm">{g.name}</span>
                      <span className="pk" aria-hidden="true">{on ? '✓' : ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="hint pad-x pad-b">الاختيارات تتصفّر لحالها أول ما تسجلون أقيام الجلسة.</p>
          </Section>
        ) : <Empty title="ادخل باسمك" text="عشان تختار الألعاب اللي ودك تجربها." />}
      </div>
    </div>
  )
}

// ---------- تعليق واحد لكل لاعب على اللعبة ----------
export function GameComments({ gameId }) {
  const { idx, me, act } = useStore()
  const all = (idx.comments || []).filter(c => c.game_id === gameId).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const mine = all.find(c => c.player_id === me?.id)
  const others = all.filter(c => c !== mine)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const start = () => { setText(mine?.body || ''); setEditing(true) }
  const save = async body => {
    setBusy(true)
    try { await act((p, pin) => api.setComment(p, pin, gameId, body), body ? 'انحفظ تعليقك' : 'انمسح تعليقك'); setEditing(false) } catch { /* toast */ } finally { setBusy(false) }
  }
  const row = c => {
    const p = idx.playersById.get(c.player_id)
    return (
      <li key={c.player_id} className="comment">
        <Avatar player={p} size={30} />
        <div><div className="c-head"><b>{p?.name}</b><small>{fmtDate(c.updated_at.slice(0, 10))}</small></div><p>{c.body}</p></div>
      </li>
    )
  }
  return (
    <Section title="تعليقات الشلة" action={<span className="muted small">{all.length ? `${all.length}` : ''}</span>}>
      {me && (editing ? (
        <form className="pad form" onSubmit={e => { e.preventDefault(); save(text.trim()) }}>
          <textarea className="input" rows={3} maxLength={500} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="وش رأيك فيها؟ نصيحة، قاعدة ننساها، أي شي…" />
          <div className="row gap">
            <button className="btn primary small" disabled={busy || !text.trim()}>احفظ</button>
            <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>إلغاء</button>
            <span className="muted small c-count">{text.length}/500</span>
          </div>
        </form>
      ) : mine ? (
        <ul className="comments"><li className="comment mine">
          <Avatar player={me} size={30} />
          <div><div className="c-head"><b>تعليقك</b><small>{fmtDate(mine.updated_at.slice(0, 10))}</small></div><p>{mine.body}</p>
            <div className="row gap c-actions"><button className="link-btn" onClick={start}>عدّل</button><button className="link-btn danger" disabled={busy} onClick={() => save('')}>امسح</button></div></div>
        </li></ul>
      ) : <div className="pad-x pad-b"><button className="btn ghost wide" onClick={start}>اكتب تعليقك</button><p className="hint">كل واحد له تعليق واحد على كل لعبة، يقدر يعدّله متى ما بغى.</p></div>)}
      {others.length > 0 ? <ul className="comments">{others.map(row)}</ul> : !mine && <p className="muted pad-x pad-b small">ما أحد علّق للحين.</p>}
    </Section>
  )
}

// ---------- لوحة الشلة ----------
const timeFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { hour: 'numeric', minute: '2-digit' })
function when(iso) {
  const d = new Date(iso), mins = (Date.now() - d) / 60000
  if (mins < 1) return 'الحين'
  if (mins < 60) return `قبل ${Math.round(mins)} د`
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (d >= today) return `اليوم ${timeFmt.format(d)}`
  if (d >= today - 864e5) return `أمس ${timeFmt.format(d)}`
  return fmtDate(iso.slice(0, 10))
}

export function Board() {
  const { idx, me, act, reload } = useStore()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(null)
  useEffect(() => { const t = setInterval(reload, 30000); return () => clearInterval(t) }, [reload])
  const posts = [...(idx.posts || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const post = async e => {
    e.preventDefault()
    setBusy(true)
    try { await act((p, pin) => api.addPost(p, pin, text.trim()), 'انكتبت'); setText('') } catch { /* toast */ } finally { setBusy(false) }
  }
  const remove = async () => {
    const id = del; setDel(null)
    try { await act((p, pin) => api.deletePost(p, pin, id), 'انحذفت') } catch { /* toast */ }
  }
  return (
    <div className="page">
      <header className="page-head"><h1>الشلة</h1></header>
      <div className="stack">
        <div className="shilla-row">
          {idx.players.map(p => <a key={p.id} href={`#/player/${p.id}`}><Avatar player={p} size={42} /><span>{p.name}</span></a>)}
        </div>
        <div className="row gap quick-links">
          <a className="btn ghost small" href="#/players">الترتيب والإحصائيات</a>
          <a className="btn ghost small" href="#/history">سجل الأقيام</a>
          <a className="btn ghost small" href="#/levels">الليفلات</a>
        </div>

        <Section title="اللوحة">
          {me ? (
            <form className="pad form compose" onSubmit={post}>
              <textarea className="input" rows={3} maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="اكتب شي يشوفه الكل: موعد، فكرة، تحدّي…" />
              <div className="row gap center"><button className="btn primary small" disabled={busy || !text.trim()}>انشر</button>{text.length > 800 && <span className="muted small">{text.length}/1000</span>}</div>
            </form>
          ) : <p className="muted pad">ادخل باسمك عشان تكتب.</p>}
          {posts.length ? (
            <ul className="posts">
              {posts.map(p => {
                const who = idx.playersById.get(p.player_id)
                const can = me && (me.id === p.player_id || me.is_admin)
                return (
                  <li key={p.id} className={`post ${me?.id === p.player_id ? 'mine' : ''}`}>
                    <Avatar player={who} size={34} />
                    <div className="post-body">
                      <div className="c-head"><b>{who?.name || '—'}</b><small>{when(p.created_at)}</small>{can && <button className="link-btn danger" onClick={() => setDel(p.id)}>احذف</button>}</div>
                      <p>{p.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : <p className="muted pad">اللوحة فاضية. أول واحد يكتب!</p>}
        </Section>
      </div>
      {del && <Confirm danger text="تحذف هذي الكتابة؟" confirmText="احذف" onConfirm={remove} onCancel={() => setDel(null)} />}
    </div>
  )
}

export function FridayCard() {
  const { idx } = useStore()
  const { byGame, mine } = useFriday()
  const top = [...byGame.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([id, ps]) => ({ g: idx.gamesById.get(id), n: ps.length })).filter(x => x.g)
  return (
    <a className="glass friday-card" href="#/friday" onClick={e => { e.preventDefault(); go('/friday') }}>
      <div className="fc-text">
        <small>الجلسة الجاية</small>
        <strong>{top.length ? `الأكثر طلباً: ${top[0].g.name}` : 'وش نلعب الجلسة الجاية؟'}</strong>
        <span>{mine.size ? `اخترت ${mine.size} لعبة` : 'اختر الألعاب اللي ودك تجربها'}</span>
      </div>
      <div className="fc-covers">{top.map(x => <Cover key={x.g.id} game={x.g} className="xs" />)}</div>
    </a>
  )
}
