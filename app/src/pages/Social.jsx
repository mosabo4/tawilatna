import { useEffect, useState } from 'react'
import { useStore, go } from '../store'
import { api } from '../api'
import { usePerks } from '../perks'
import { IMG_CHARS, imgSrc } from '../characters'
import { levelOfReward } from '../levels'
import { Avatar, Section, Cover, Confirm, fmtDate } from '../ui'
import { useFriday } from './Pick'

export { Friday, FridayButton, useFriday } from './Pick'

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
  const { tally, mine, cands } = useFriday()
  const top = (tally.size ? [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ g: idx.gamesById.get(id), n })) : cands.map(id => ({ g: idx.gamesById.get(id), n: 0 }))).filter(x => x.g)
  return (
    <a className="glass friday-card" href="#/friday" onClick={e => { e.preventDefault(); go('/friday') }}>
      <div className="fc-text">
        <small>الجلسة الجاية</small>
        <strong>{tally.size ? `المتصدرة: ${top[0].g.name}` : 'وش نلعب الجلسة الجاية؟'}</strong>
        <span>{mine.size ? `رتّبت ${mine.size} ألعاب` : 'رتّب الألعاب المرشّحة'}</span>
      </div>
      <div className="fc-covers">{top.map(x => <Cover key={x.g.id} game={x.g} className="xs" />)}</div>
    </a>
  )
}
