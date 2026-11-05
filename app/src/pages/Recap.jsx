import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, go } from '../store'
import { buildRecap, monthName, MIN_PLAYS } from '../recap'
import { useFriday } from './Social'
import { Avatar, Cover, fmtDate, fmtScore } from '../ui'

const Pending = ({ text = 'البيانات للحين ما اكتملت' }) => <div className="rc-pending"><span>⏳</span>{text}</div>
const Names = ({ who }) => who.map(p => p.name).join(' و')
const Avs = ({ who, size = 44 }) => <span className="rc-avs">{who.slice(0, 4).map(p => <Avatar key={p.id} player={p} size={size} />)}</span>
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

function Move({ r }) {
  if (r.prev == null) return <span className="rc-move new">جديد</span>
  const d = r.prev - r.rank
  if (!d) return <span className="rc-move same">–</span>
  return <span className={`rc-move ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}</span>
}

function Award({ a }) {
  return (
    <div className={`rc-award ${a.empty ? 'empty' : ''}`}>
      <span className="rc-aw-icon">{a.icon}</span>
      <div className="rc-aw-body">
        <b>{a.title}</b>
        <small>{a.desc}</small>
        {a.empty ? <Pending /> : <div className="rc-aw-who"><Avs who={a.who} size={30} /><span><strong><Names who={a.who} /></strong><em>{a.text}</em></span></div>}
      </div>
    </div>
  )
}

export default function Recap({ month }) {
  const { idx, me } = useStore()
  const r = useMemo(() => buildRecap(idx, month), [idx, month])
  const { byGame } = useFriday()
  const picks = [...byGame.entries()].map(([id, ps]) => ({ g: idx.gamesById.get(id), n: ps.length })).filter(x => x.g).sort((a, b) => b.n - a.n).slice(0, 3)
  const [i, setI] = useState(0)
  const touch = useRef(null)
  const n = r.numbers
  const delta = n.plays - n.prevPlays
  const top3 = r.table.slice(0, 3)

  const slides = [
    <div className="rc-cover" key="cover">
      <small>طاولتنا</small>
      <h1>ملخص<br /><span>{monthName(month)}</span></h1>
      <p>{n.plays ? `${n.plays} قيم · ${n.days} أيام لعب · ${n.games} ألعاب` : 'ما فيه أقيام مسجلة هالشهر للحين'}</p>
      <em>اضغط عشان نبدأ ←</em>
    </div>,

    <div key="numbers">
      <h2>الشهر بالأرقام</h2>
      <div className="rc-nums">
        <div><b>{n.plays}</b><span>قيم</span>{r.prevPlays.length > 0 ? <i className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} عن الشهر اللي قبله</i> : <i>ما فيه شهر قبله للمقارنة</i>}</div>
        <div><b>{n.days}</b><span>أيام لعب</span></div>
        <div><b>{n.hours || '—'}</b><span>ساعة لعب تقريباً</span><i>حسب مدة كل لعبة في BGG</i></div>
        <div><b>{n.games}</b><span>لعبة مختلفة</span></div>
      </div>
      <div className="rc-row">
        <h3>🆕 ألعاب جربناها لأول مرة</h3>
        {n.newGames.length ? <div className="rc-covers">{n.newGames.slice(0, 8).map(g => <span key={g.id}><Cover game={g} className="sm" /><small>{g.name}</small></span>)}</div> : <Pending text="ما جربنا شي جديد هالشهر" />}
      </div>
      {n.busiestDay && <p className="rc-note">📌 أطول جلسة: {fmtDate(n.busiestDay.items[0].d)} لعبنا فيها {n.busiestDay.value} أقيام</p>}
    </div>,

    <div key="podium">
      <h2>منصة التتويج</h2>
      {top3.length ? (
        <div className="rc-podium">
          {[1, 0, 2].map(k => top3[k] && (
            <div key={k} className={`rc-pod p${k + 1}`}>
              <Avatar player={top3[k].player} size={k === 0 ? 84 : 64} />
              <b>{top3[k].player.name}</b>
              <span>{top3[k].points}%</span>
              <div className="rc-step">{k + 1}</div>
            </div>
          ))}
        </div>
      ) : <Pending />}
      <p className="rc-note">المستوى = كم شخص غلب من كل اللي لعب ضدهم هالشهر</p>
    </div>,

    <div key="table">
      <h2>الترتيب الكامل</h2>
      {r.table.length ? (
        <table className="rc-table">
          <thead><tr><th>#</th><th>اللاعب</th><th>المستوى</th><th>غلب</th><th>فاز</th><th>{r.hasPrev ? 'التغيّر' : ''}</th></tr></thead>
          <tbody>
            {r.table.map(t => (
              <tr key={t.player.id}>
                <td>{t.rank}</td>
                <td><span className="rc-p"><Avatar player={t.player} size={26} />{t.player.name}</span></td>
                <td><b>{t.points}%</b></td>
                <td>{Number.isInteger(t.beat) ? t.beat : t.beat.toFixed(1)}/{t.faced}</td>
                <td>{t.wins}/{t.plays}</td>
                <td>{r.hasPrev ? <Move r={t} /> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <Pending />}
      {!r.hasPrev && <p className="rc-note">التغيّر في المراكز يطلع لما يكون فيه شهر قبله نقارن فيه.</p>}
    </div>,

    ...chunk(r.awards, 4).map((part, k) => (
      <div key={'aw' + k}>
        <h2>جوائز الشهر {k > 0 ? <small>({k + 1})</small> : null}</h2>
        <div className="rc-awards">{part.map(a => <Award key={a.id} a={a} />)}</div>
        {k === 0 && <p className="rc-note">الجوائز تحتاج {MIN_PLAYS} أقيام على الأقل عشان ما تطلع بالحظ.</p>}
      </div>
    )),

    <div key="rivals">
      <h2>المواجهات</h2>
      <div className="rc-awards">
        <div className="rc-award"><span className="rc-aw-icon">⚔️</span><div className="rc-aw-body"><b>أحرّ مواجهة</b><small>أقرب ثنائي في النتائج (3 أقيام مع بعض على الأقل)</small>
          {r.rivals.hottest ? <div className="rc-vs"><Avatar player={r.rivals.hottest.a} size={34} /><strong>{r.rivals.hottest.aw} – {r.rivals.hottest.bw}</strong><Avatar player={r.rivals.hottest.b} size={34} /><em>{r.rivals.hottest.a.name} ضد {r.rivals.hottest.b.name} في {r.rivals.hottest.n} أقيام</em></div> : <Pending />}
        </div></div>
        <div className="rc-award"><span className="rc-aw-icon">🦁</span><div className="rc-aw-body"><b>أكبر سيطرة</b><small>واحد خلّص قدّام الثاني أغلب المرات</small>
          {r.rivals.nemesis && r.rivals.nemesis.gap > 0 ? (() => { const v = r.rivals.nemesis; const [w, l, ww, lw] = v.aw >= v.bw ? [v.a, v.b, v.aw, v.bw] : [v.b, v.a, v.bw, v.aw]; return <div className="rc-vs"><Avatar player={w} size={34} /><strong>{ww} – {lw}</strong><Avatar player={l} size={34} /><em>{w.name} خلّص قدّام {l.name} {ww} من {v.n}</em></div> })() : <Pending />}
        </div></div>
        <div className="rc-award"><span className="rc-aw-icon">🤝</span><div className="rc-aw-body"><b>الثنائي اللي ما يتفارق</b><small>أكثر اثنين لعبوا مع بعض</small>
          {r.rivals.duo ? <div className="rc-aw-who"><Avs who={[r.rivals.duo.a, r.rivals.duo.b]} size={30} /><span><strong>{r.rivals.duo.a.name} و{r.rivals.duo.b.name}</strong><em>{r.rivals.duo.n} أقيام مع بعض</em></span></div> : <Pending />}
        </div></div>
      </div>
    </div>,

    <div key="kings">
      <h2>ملوك التصانيف هالشهر</h2>
      <div className="rc-kings">
        {r.kings.map(k => (
          <div key={k.id} style={{ '--t': k.tone }}>
            <span className="k-cat"><i className="dot" />{k.name}</span>
            {k.who.length ? <><Avs who={k.who} size={32} /><b><Names who={k.who} /></b><small>👑 {k.top} فوز من {k.n}</small></> : <Pending text={k.n ? 'ما فيه فائز واضح' : 'ما انلعبت هالشهر'} />}
          </div>
        ))}
      </div>
    </div>,

    <div key="games">
      <h2>ألعاب الشهر</h2>
      <div className="rc-awards">
        <div className="rc-award"><span className="rc-aw-icon">🔁</span><div className="rc-aw-body"><b>لعبة الشهر</b><small>أكثر لعبة انلعبت</small>{r.games.topGame ? <div className="rc-game"><Cover game={r.games.topGame.items[0].game} className="xs" /><strong>{r.games.topGame.items.map(x => x.game.name).join('، ')}</strong><em>{r.games.topGame.value} أقيام</em></div> : <Pending />}</div></div>
        <div className="rc-award"><span className="rc-aw-icon">🎯</span><div className="rc-aw-body"><b>أكثر لعبة مفتوحة</b><small>أكثر لعبة فاز فيها ناس مختلفين</small>{r.games.openGame ? <div className="rc-game"><Cover game={r.games.openGame.items[0].game} className="xs" /><strong>{r.games.openGame.items[0].game.name}</strong><em>{r.games.openGame.value} فائزين مختلفين</em></div> : <Pending />}</div></div>
        <div className="rc-award"><span className="rc-aw-icon">⭐</span><div className="rc-aw-body"><b>أعلى تقييم</b><small>من الألعاب اللي انلعبت هالشهر</small>{r.games.bestRated ? <div className="rc-game"><Cover game={r.games.bestRated.items[0].game} className="xs" /><strong>{r.games.bestRated.items[0].game.name}</strong><em>{fmtScore(r.games.bestRated.value)} من 10</em></div> : <Pending />}</div></div>
        <div className="rc-award"><span className="rc-aw-icon">🌶️</span><div className="rc-aw-body"><b>اللعبة اللي اختلفنا عليها</b><small>أكبر فرق بين أعلى وأقل تقييم</small>{r.games.split ? <div className="rc-game"><Cover game={r.games.split.items[0].game} className="xs" /><strong>{r.games.split.items[0].game.name}</strong><em>فرق {fmtScore(r.games.split.value)} درجات</em></div> : <Pending />}</div></div>
      </div>
    </div>,

    <div key="activity">
      <h2>نشاط الشلة</h2>
      <div className="rc-nums small">
        <div><b>{r.activity.ratings}</b><span>تقييم انضاف</span></div>
        <div><b>{r.activity.posts}</b><span>كتابة في اللوحة</span>{r.activity.poster && <i>أكثرهم: <Names who={r.activity.poster.items.map(x => x.player)} /></i>}</div>
        <div><b>{r.activity.forgotten}</b><span>لعبة ما انلعبت من شهرين</span></div>
      </div>
      <div className="rc-row">
        <h3>📝 تقييمات ناقصة</h3>
        {r.activity.missing.length
          ? <ul className="rc-missing">{r.activity.missing.map(m => <li key={m.player.id}><Avatar player={m.player} size={26} /><span>{m.player.name}</span><b>{m.n} {m.n === 1 ? 'لعبة' : 'ألعاب'}</b></li>)}</ul>
          : <p className="rc-note">الكل قيّم ألعابه 👏</p>}
      </div>
      {r.activity.forgottenSample.length > 0 && (
        <div className="rc-row"><h3>📦 ألعاب تنتظركم</h3><div className="rc-covers">{r.activity.forgottenSample.map(g => <span key={g.id}><Cover game={g} className="sm" /><small>{g.name}</small></span>)}</div></div>
      )}
    </div>,

    <div className="rc-cover end" key="end">
      <h1>نشوفكم<br /><span>الجلسة الجاية</span></h1>
      {picks.length ? <><p>أكثر ألعاب طلبتوها:</p><div className="rc-covers center">{picks.map(x => <span key={x.g.id}><Cover game={x.g} className="sm" /><small>{x.g.name} · {x.n}</small></span>)}</div></> : <p>اختاروا ألعابكم من صفحة «الجلسة» 🎲</p>}
    </div>,
  ]

  const last = slides.length - 1
  const next = () => setI(x => Math.min(last, x + 1))
  const prev = () => setI(x => Math.max(0, x - 1))
  const exit = () => { if (document.fullscreenElement) document.exitFullscreen?.(); go('/me') }

  useEffect(() => {
    const on = e => {
      if (['ArrowLeft', ' ', 'Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); next() }
      else if (['ArrowRight', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev() }
      else if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  if (!me?.is_admin) return <div className="page"><p className="muted pad">هذي الصفحة للمسؤول بس.</p></div>

  return (
    <div className="recap"
      onClick={e => { if (!e.target.closest('button')) next() }}
      onTouchStart={e => { touch.current = e.touches[0].clientX }}
      onTouchEnd={e => { const d = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(d) > 50) { e.preventDefault(); if (d > 0) next(); else prev() } }}
    >
      <div className="rc-progress">{slides.map((_, k) => <span key={k} className={k <= i ? 'on' : ''} />)}</div>
      <button className="rc-exit" onClick={exit} aria-label="اطلع من العرض">✕</button>
      <section className="rc-slide" key={i}>{slides[i]}</section>
      <div className="rc-nav">
        <button onClick={prev} disabled={i === 0} aria-label="السابق">→</button>
        <span>{i + 1} / {slides.length}</span>
        <button onClick={next} disabled={i === last} aria-label="التالي">←</button>
      </div>
    </div>
  )
}
