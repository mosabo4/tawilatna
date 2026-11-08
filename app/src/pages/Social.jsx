import { useEffect, useMemo, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { usePerks } from '../perks'
import { cooldownLeft } from '../actions'
import { levelOfReward } from '../levels'
import { IMG_CHARS, imgSrc } from '../characters'
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
  const { idx, me, act, notify } = useStore()
  const { can } = usePerks()
  const limit = 1 + (can('slot2') ? 1 : 0) + (can('slot3') ? 1 : 0)
  const week = sessionKey(idx)
  const picks = useMemo(() => (idx.picks || []).filter(p => p.week === week), [idx, week])
  const byGame = useMemo(() => {
    const m = new Map()
    for (const p of picks) { if (!m.has(p.game_id)) m.set(p.game_id, []); m.get(p.game_id).push(idx.playersById.get(p.player_id)) }
    return m
  }, [picks, idx])
  const mine = useMemo(() => new Set(picks.filter(p => p.player_id === me?.id).map(p => p.game_id)), [picks, me])
  const [busy, setBusy] = useState(null)
  const full = mine.size >= limit
  const nextLv = limit < 2 ? levelOfReward('slot2') : limit < 3 ? levelOfReward('slot3') : null
  const toggle = async gameId => {
    if (!mine.has(gameId) && full) {
      notify(`حدّك ${limit === 1 ? 'لعبة وحدة' : `${limit} ألعاب`} للتصويت. شيل صوتك من لعبة ثانية${nextLv ? `، أو وصّل مستوى ${nextLv} وتنفتح لك خانة جديدة` : ''}`, 'err')
      return
    }
    setBusy(gameId)
    try { await act((p, pin) => api.toggleFriday(p, pin, week, gameId)) } catch { /* toast */ } finally { setBusy(null) }
  }
  return { week, picks, byGame, mine, toggle, busy, limit, full, nextLv }
}

export function FridayButton({ gameId, big }) {
  const { me } = useStore()
  const { mine, toggle, busy, byGame, full } = useFriday()
  if (!me) return null
  const on = mine.has(gameId)
  const others = (byGame.get(gameId) || []).filter(p => p && p.id !== me.id)
  return (
    <div className="friday-btn-wrap">
      <button className={`friday-btn ${on ? 'on' : ''} ${big && !on && !full ? 'big' : ''} ${full && !on ? 'locked' : ''}`} disabled={busy === gameId} onClick={() => toggle(gameId)} aria-pressed={on}>
        <span className="fb-check" aria-hidden="true">{on ? '✓' : full ? '🔒' : '+'}</span>
        <span>{on ? 'بتجربها الجلسة الجاية' : full ? 'وصلت حد التصويت' : big ? '🎲 أبي أجربها الجلسة الجاية' : 'أبي أجربها الجلسة الجاية'}</span>
      </button>
      {others.length > 0 && <span className="fb-others">{others.map(p => <Avatar key={p.id} player={p} size={22} />)}<small>{others.length === 1 ? `${others[0].name} بعد` : `و${others.length} غيرك`}</small></span>}
    </div>
  )
}

export function Friday() {
  const { idx, me } = useStore()
  const { picks, byGame, mine, toggle, busy, week, limit, full, nextLv } = useFriday()
  const { can, doAction, undoAction } = usePerks()
  const acts = (idx.actions || []).filter(a => a.data?.week === week)
  const vetoes = new Map(acts.filter(a => a.kind === 'veto').map(a => [a.game_id, a]))
  const opener = acts.find(a => a.kind === 'opener')
  const ranked = useMemo(() => [...byGame.entries()]
    .map(([id, ps]) => ({ game: idx.gamesById.get(id), ps: ps.filter(Boolean) }))
    .filter(x => x.game)
    .map(x => ({ ...x, votes: x.ps.length, veto: vetoes.get(x.game.id) }))
    .sort((a, b) => (!!a.veto - !!b.veto) || (opener ? (b.game.id === opener.game_id) - (a.game.id === opener.game_id) : 0) || b.votes - a.votes || a.game.name.localeCompare(b.game.name)), [byGame, idx, vetoes, opener])
  const vetoLeft = me ? cooldownLeft(idx, me.id, 'veto', 30) : 0
  const openLeft = me ? cooldownLeft(idx, me.id, 'opener', 30) : 0
  const [busyA, setBusyA] = useState(false)
  const run = async (...a) => { setBusyA(true); try { await doAction(...a) } catch { /* toast */ } finally { setBusyA(false) } }
  const voters = new Set(picks.map(p => p.player_id))
  const top = Math.max(1, ...ranked.map(r => r.votes))
  const live = ranked.filter(r => !r.veto)
  const leader = live[0]
  const tie = leader && live.filter(r => r.votes === leader.votes).length > 1
  const unplayed = useMemo(() => me ? idx.games.filter(g => !idx.plays.some(pl => pl.game_id === g.id && pl.results.some(r => r.player_id === me.id))).sort(() => 0.5 - Math.random()).slice(0, 10) : [], [idx, me]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = idx.players.length
  const PAL = ['#5B7CFF', '#F2B33D', '#2FB36B', '#E5484D', '#A35BFF', '#2BC4D6', '#FF8A3D', '#E056A0']
  const colorOf = new Map(ranked.map((r, k) => [r.game.id, PAL[k % PAL.length]]))
  const majority = leader && !tie && leader.votes > voters.size / 2
  const silent = idx.players.filter(p => !voters.has(p.id))
  const second = live[1]
  const lead = leader ? leader.votes - (second?.votes || 0) : 0
  const status = !leader ? null
    : tie ? { i: '🤝', t: <>تعادل بين {live.filter(r => r.votes === leader.votes).slice(0, 3).map((r, k) => <span key={r.game.id}>{k > 0 && ' و'}<bdi>{r.game.name}</bdi></span>)}</>, d: 'صوت واحد يحسمها' }
    : lead > silent.length ? { i: '✅', t: <>انحسمت: <bdi>{leader.game.name}</bdi></>, d: 'حتى لو الباقين صوّتوا لغيرها تبقى الأولى' }
    : majority ? { i: '👑', t: <>أغلبية لـ<bdi>{leader.game.name}</bdi></>, d: silent.length ? `بس لسا ${silent.length} ما صوّتوا` : 'الكل صوّت' }
    : { i: '🏁', t: 'السباق مفتوح', d: <><bdi>{leader.game.name}</bdi> تتقدم بـ{lead} {lead === 1 ? 'صوت' : 'أصوات'}{silent.length ? `، و${silent.length} لسا ما صوّتوا` : ''}</> }
  const seats = (() => {
    const rank = new Map(ranked.map((r, k) => [r.game.id, k]))
    const key = pid => { const ks = picks.filter(x => x.player_id === pid).map(x => rank.get(x.game_id)).filter(v => v != null); return ks.length ? Math.min(...ks) : 99 }
    const plist = [...idx.players].sort((a, b) => key(a.id) - key(b.id))
    const n = plist.length
    const rows = n > 8 ? [Math.ceil(n * 0.58), n - Math.ceil(n * 0.58)] : [n]
    const out = []; let k = 0
    rows.forEach((cnt, r) => {
      const rad = rows.length === 1 ? 40 : r === 0 ? 43 : 28
      for (let m = 0; m < cnt; m++) {
        const th = Math.PI * (1 - (cnt === 1 ? 0.5 : m / (cnt - 1)))
        out.push({ p: plist[k++], x: 50 + rad * Math.cos(th) * 1.0, y: 78 - (rows.length === 1 ? 62 : r === 0 ? 62 : 40) * Math.sin(th) })
      }
    })
    return out
  })()

  return (
    <div className="page vt">
      <div className="stack">
        <section className="vt-parl glass">
          <div className="vt-parl-top"><b>🏛️ برلمان العيال</b><small>{voters.size ? `${voters.size} من ${total} صوّتوا` : 'الكراسي فاضية، ابدأ التصويت'}</small></div>
          <div className="vt-hemi">
            {seats.map(({ p, x, y }) => {
              const cols = picks.filter(k => k.player_id === p.id).map(k => colorOf.get(k.game_id)).filter(Boolean)
              const bg = !cols.length ? 'var(--line)' : cols.length === 1 ? cols[0] : `conic-gradient(${cols.map((c, k) => `${c} ${(k / cols.length) * 100}% ${((k + 1) / cols.length) * 100}%`).join(',')})`
              return (
                <span key={p.id} className={`vt-seat ${cols.length ? '' : 'absent'}`} style={{ left: `${x}%`, top: `${y}%`, '--sc': bg }}>
                  <i><Avatar player={p} size={42} /></i><em>{p.name}</em>
                </span>
              )
            })}
            <div className="vt-podium">
              {leader ? <><Cover game={leader.game} className="xs" /><b>{leader.game.name}</b><small>{tie ? '🤝 تعادل' : majority ? '👑 أغلبية' : '🏆 الأكثر أصواتاً'} · {leader.votes}</small></> : <small>ما فيه أصوات</small>}
            </div>
          </div>
          {me && <div className="vt-slots"><span>أصواتك</span>{Array.from({ length: 3 }, (_, k) => <i key={k} className={k < mine.size ? 'used' : k < limit ? 'free' : 'lockd'}>{k < mine.size ? '✓' : k < limit ? '' : '🔒'}</i>)}<small>{mine.size} من {limit}{nextLv ? ` · مستوى ${nextLv} يفتح خانة` : ''}</small></div>}
          {status && <div className={`vt-status ${status.i === '✅' ? 'done' : ''}`}><span>{status.i}</span><div><b>{status.t}</b><small>{status.d}</small></div></div>}
          {ranked.length > 0 && <div className="vt-legend">{live.slice(0, 5).map(r => <span key={r.game.id}><i style={{ background: colorOf.get(r.game.id) }} />{r.game.name}<b>{r.votes}</b></span>)}{live.length > 5 && <span>+{live.length - 5}</span>}</div>}
          {silent.length > 0 && voters.size > 0 && <div className="vt-silent"><small>لسا ما صوّتوا:</small>{silent.map(p => <Avatar key={p.id} player={p} size={26} />)}</div>}
        </section>

        {live.length >= 2 && (
          <section className="vt-h2h glass">
            <h3>⚔️ المنافسة على الصدارة</h3>
            <div className="vt-h2h-row">
              {[live[0], live[1]].map((r, k) => (
                <a key={r.game.id} href={`#/game/${r.game.id}`} className={`vt-fighter ${k === 0 && !tie ? 'lead' : ''}`} style={{ '--bc': colorOf.get(r.game.id) }}>
                  <Cover game={r.game} className="sm" />
                  <b>{r.game.name}</b>
                  <strong>{r.votes}</strong>
                  <small>{k === 0 ? (tie ? 'متعادلة' : 'المتصدرة') : tie ? 'متعادلة' : `متأخرة بـ${lead}`}</small>
                </a>
              ))}
              <span className="vt-vs">VS</span>
            </div>
            {live[2] && <p className="vt-chase">🏃 وراهم: {live.slice(2, 5).map(r => `${r.game.name} (${r.votes})`).join('، ')}</p>}
          </section>
        )}

        {opener && idx.gamesById.get(opener.game_id) && (
          <div className="glass opener">
            <Cover game={idx.gamesById.get(opener.game_id)} className="xs" />
            <span><small>🎬 لعبة الافتتاح</small><b>{idx.gamesById.get(opener.game_id).name}</b><small>اختارها {idx.playersById.get(opener.player_id)?.name}</small></span>
            {me && (opener.player_id === me.id || me.is_admin) && <button className="link-btn" onClick={() => undoAction(opener.id, 'انشالت')}>شيلها</button>}
          </div>
        )}

        {ranked.length > 0 && (
          <ol className="vt-list">
            {ranked.map(({ game, ps, votes, veto }) => {
              const on = mine.has(game.id)
              return (
                <li key={game.id} className={`vt-card ${veto ? 'vetoed' : ''} ${on ? 'mine' : ''}`} style={{ '--w': `${(votes / top) * 100}%`, '--bc': colorOf.get(game.id) || '#666' }}>
                  <a className="vt-main" href={`#/game/${game.id}`}>
                    <span className="vt-rk"><i className="vt-dot" />{veto ? '🚫' : ''}</span>
                    <Cover game={game} className="xs" />
                    <span className="nm"><b>{game.name}</b><small>{veto ? `فيتو من ${idx.playersById.get(veto.player_id)?.name}` : playersText(game)}</small></span>
                    <strong className="vt-n">{votes}</strong>
                  </a>
                  {!veto && <div className="vt-lane" aria-hidden="true"><i style={{ width: `${Math.min(100, (votes / Math.max(1, total)) * 100)}%` }} /><u /></div>}
                  <div className="vt-foot">
                    <span className="vt-who">{ps.map(p => <span key={p.id} className="vt-av" title={p.name}><Avatar player={p} size={30} /><em>{p.name}</em></span>)}</span>
                    {me && !veto && <button className={`vt-join ${on ? 'on' : ''} ${full && !on ? 'full' : ''}`} disabled={busy === game.id} onClick={() => toggle(game.id)} aria-pressed={on}>{on ? '✓ في كتلتك' : full ? '🔒 حدّك وصل' : '🏛️ انضم لكتلتهم'}</button>}
                  </div>
                  {me && !veto && (can('veto') || can('opener')) && (
                    <div className="fr-acts">
                      {can('veto') && <button className="chip" disabled={busyA || vetoLeft > 0} onClick={() => run('veto', { game: game.id, data: { week } }, '🚫 انشالت من الجلسة')}>🚫 فيتو{vetoLeft ? ` (${vetoLeft} يوم)` : ''}</button>}
                      {can('opener') && !opener && <button className="chip" disabled={busyA || openLeft > 0} onClick={() => run('opener', { game: game.id, data: { week } }, '🎬 صارت لعبة الافتتاح')}>🎬 افتتح بها{openLeft ? ` (${openLeft} يوم)` : ''}</button>}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {me ? (
          <Section title="تبي تقترح لعبة جديدة؟" action={<a className="more" href="#/games">الدولاب ←</a>}>
            <p className="hint pad-x">افتح الدولاب، اضغط على اللعبة اللي تبيها واختر «أبي أجربها الجلسة الجاية». وهذي ألعاب ما جربتها للحين:</p>
            <div className="vt-strip">{unplayed.map(g => <a key={g.id} href={`#/game/${g.id}`}><Cover game={g} className="xs" /><small>{g.name}</small></a>)}</div>
            <p className="hint pad-x">🗳️ تصوّت على لعبة وحدة، ومع مستوى {levelOfReward('slot2')} لعبتين، ومع مستوى {levelOfReward('slot3')} ثلاث ألعاب.</p>
            <p className="hint pad-x pad-b">التصويت يتصفّر لحاله أول ما تسجلون أقيام الجلسة.</p>
          </Section>
        ) : <Empty title="ادخل باسمك" text="عشان تصوّت على الألعاب اللي ودك تجربها." />}
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
    <Section title="تعليقات العيال" action={<span className="muted small">{all.length ? `${all.length}` : ''}</span>}>
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

// ---------- لوحة العيال ----------
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
  const { active, look, doAction, undoAction, can } = usePerks()
  const faces = idx.players.filter(p => can('faceSticker', p.id) && IMG_CHARS[(p.realName || p.name).trim()])
  const emo = e => e?.startsWith('face:') ? (() => { const p = idx.playersById.get(e.slice(5)); const ic = p && IMG_CHARS[(p.realName || p.name).trim()]; return ic ? <img className="face-r" src={imgSrc(ic.slug, 'e', 'bust')} alt={p.name} /> : '🙂' })() : e
  const [reactFor, setReactFor] = useState(null)
  const pins = new Set(idx.players.map(p => look(p.id).pin).filter(Boolean))
  const reactsOf = id => (idx.actions || []).filter(a => a.kind === 'react' && a.data?.post === id)
  const react = async (postId, e) => {
    setReactFor(null)
    const mineR = reactsOf(postId).find(a => a.player_id === me.id)
    try { if (mineR) await undoAction(mineR.id); if (!mineR || mineR.data?.e !== e) await doAction('react', { data: { post: postId, e } }) } catch { /* toast */ }
  }
  const posts = [...(idx.posts || [])].sort((a, b) => (pins.has(b.id) - pins.has(a.id)) || b.created_at.localeCompare(a.created_at))
  const myPosts = me ? posts.filter(p => p.player_id === me.id) : []
  const pLimit = 1 + (can('post2') ? 1 : 0) + (can('post3') ? 1 : 0)
  const pFull = myPosts.length >= pLimit
  const nextP = pLimit < 2 ? levelOfReward('post2') : pLimit < 3 ? levelOfReward('post3') : null
  const post = async e => {
    e.preventDefault()
    if (pFull) return
    setBusy(true)
    try { await act((p, pin) => api.addPost(p, pin, text.trim()), 'انكتبت'); setText('') } catch { /* toast */ } finally { setBusy(false) }
  }
  const remove = async () => {
    const id = del; setDel(null)
    try { await act((p, pin) => api.deletePost(p, pin, id), 'انحذفت') } catch { /* toast */ }
  }
  return (
    <div className="page">
      <div className="stack">
        <Section title="اللوحة">
          {me ? (
            <form className="pad form compose" onSubmit={post}>
              <div className="post-slots"><span>كتاباتك على اللوحة</span>{Array.from({ length: 3 }, (_, k) => <i key={k} className={k < myPosts.length ? 'used' : k < pLimit ? 'free' : 'lockd'}>{k < myPosts.length ? '✓' : k < pLimit ? '' : '🔒'}</i>)}<small>{myPosts.length} من {pLimit}{nextP ? ` · مستوى ${nextP} يفتح خانة` : ''}</small></div>
              {pFull && <p className="post-full">✋ وصلت حدّك ({pLimit === 1 ? 'كتابة وحدة' : `${pLimit} كتابات`}). احذف وحدة من كتاباتك تحت عشان تكتب جديدة.</p>}
              <textarea className="input" rows={3} maxLength={1000} disabled={pFull} value={text} onChange={e => setText(e.target.value)} placeholder="اكتب شي يشوفه الكل: موعد، فكرة، تحدّي…" />
              <div className="row gap center"><button className="btn primary small" disabled={busy || pFull || !text.trim()}>انشر</button>{text.length > 800 && <span className="muted small">{text.length}/1000</span>}</div>
            </form>
          ) : <p className="muted pad">ادخل باسمك عشان تكتب.</p>}
          {posts.length ? (
            <ul className="posts">
              {posts.map(p => {
                const who = idx.playersById.get(p.player_id)
                const can = me && (me.id === p.player_id || me.is_admin)
                return (
                  <li key={p.id} className={`post ${me?.id === p.player_id ? 'mine' : ''} ${pins.has(p.id) ? 'pinned' : ''}`}>
                    <Avatar player={who} size={34} />
                    <div className="post-body">
                      <div className="c-head"><b>{who?.name || '—'}</b><small>{when(p.created_at)}</small>{can && <button className="link-btn danger" onClick={() => setDel(p.id)}>احذف</button>}</div>
                      {pins.has(p.id) && <span className="pin-tag">📌 مثبّتة</span>}
                      <p>{p.body}</p>
                      {(() => {
                        const rs = reactsOf(p.id)
                        const groups = [...new Set(rs.map(x => x.data?.e))].map(e => ({ e, who: rs.filter(x => x.data?.e === e) }))
                        if (!groups.length && !active.reacts) return null
                        return (
                          <div className="reacts">
                            {groups.map(g => <button key={g.e} className={`react-on ${g.who.some(x => x.player_id === me?.id) ? 'mine' : ''}`} disabled={!active.reacts} onClick={() => react(p.id, g.e)} title={g.who.map(x => idx.playersById.get(x.player_id)?.name).join('، ')}>{emo(g.e)} <small>{g.who.length}</small></button>)}
                            {active.reacts && (reactFor === p.id
                              ? [...['😂', '🔥', '👏', '😭', '🤡', '💀'], ...faces.map(f => `face:${f.id}`)].map(e => <button key={e} onClick={() => react(p.id, e)}>{emo(e)}</button>)
                              : <button className="react-add" onClick={() => setReactFor(p.id)}>+😀</button>)}
                          </div>
                        )
                      })()}
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
