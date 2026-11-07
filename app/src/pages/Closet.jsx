import { useState } from 'react'
import { useStore } from '../store'
import { Section } from '../ui'
import { usePerks } from '../perks'
import { STICKERS, Sticker } from '../stickers'
import { Character, CUSTOM, OPTION_NAMES, IMG_CHARS, imgSrc } from '../characters'

// شخصيتك + تعديلها
export function CharacterEditor() {
  const { me } = useStore()
  const { perks, set, level: L, active } = usePerks()
  const ch = perks.char || {}
  const setCh = (k, v) => set({ char: { ...ch, [k]: v } })
  const ic = IMG_CHARS[(me.realName || me.name).trim()]
  if (me.is_admin) return <AllPoses />
  if (ic) {
    const st = ic.styles[me.char_style] ? me.char_style : ic.def
    const sty = ic.styles[st]
    return (
      <Section title="شخصيتك">
        <div className="pose-strip">{sty.gallery.map(g => <img key={g} src={imgSrc(ic.slug, st, g)} alt="" />)}</div>
        <p className="hint pad-x pad-b">أسلوب رسم الشخصيات يحدده المسؤول للكل.</p>
      </Section>
    )
  }
  return (
    <Section title="شخصيتك">
      <div className="char-edit">
        <div className="char-stage"><Character player={me} custom={active.char} pose="idle" size={130} /></div>
        <div className="char-opts">
          {Object.entries(CUSTOM).map(([k, c]) => {
            const open = L >= c.level
            return (
              <div key={k} className={`copt ${open ? '' : 'locked'}`}>
                <span className="copt-label">{c.label}{!open && <small>🔒 ليفل {c.level}</small>}</span>
                <div className="copt-row">
                  {c.options.map(o => {
                    const lock = !open || (o === 'crown' && L < 10)
                    const on = (ch[k] ?? null) === o
                    return k === 'outfit'
                      ? <button key={String(o)} disabled={lock} className={`sw ${on ? 'on' : ''} ${o ? '' : 'none'}`} style={o ? { background: o } : null} onClick={() => setCh(k, o)} aria-label={o || 'الأصلي'}>{o ? '' : '↺'}</button>
                      : <button key={String(o)} disabled={lock} className={`chip ${on ? 'on' : ''}`} onClick={() => setCh(k, o)}>{o ? OPTION_NAMES[o] : 'الأصلي'}{o === 'crown' && L < 10 ? ' 🔒' : ''}</button>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}

export function TeasePicker({ onPick }) {
  const { idx, me } = useStore()
  const [who, setWho] = useState('')
  const [art, setArt] = useState('cry')
  return (
    <div className="tease-pick">
      <select className="input" value={who} onChange={e => setWho(e.target.value)}>
        <option value="">اختر الضحية 😈</option>
        {idx.players.filter(p => p.id !== me.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="arts">{STICKERS.map(t => <button key={t.id} type="button" className={art === t.id ? 'on' : ''} onClick={() => setArt(t.id)}><Sticker id={t.id} size={34} /><small>{t.name}</small></button>)}</div>
      <button className="btn primary small" disabled={!who} onClick={() => onPick(who, art)}>لزّقه 3 أيام</button>
    </div>
  )
}

// كل دور (متى تظهر الشخصية) والصور اللي تخدمه. الأدوار اللي تشترك بنفس الصورة تنعرض مرة وحدة.
// ready = فيه صورة مخصصة له · borrow = يستعير صورة مؤقتة ويحتاج صورة خاصة · none = ما فيه صورة
const ROLES = [
  { id: 'stand', title: 'الوقفة الأساسية', draw: 'واقف عادي مبتسم، وجهه للكاميرا (ممكن عدة وقفات بنفس الفكرة)', where: ['الرئيسية، بطاقة «أنا»، بطاقات الشلة، صفحة اللاعب', '«مين حاضر الليلة؟» قبل الاختيار'], pose: 'idle', extra: ['front', 'side', 'cross'], extraNote: 'وقفات بديلة جاهزة، ما تطلع للحين', ready: true },
  { id: 'dice', title: 'رمي النرد', draw: 'يرمي النرد بيده', where: ['مشهد «يرمي النرد على»: اللي يرمي'], pose: 'dice', ready: true },
  { id: 'jump', title: 'النطّة', draw: 'يقفز بفرح', where: ['نجم الليلة في ملخص الجلسة', 'وضعية «النطّة» (جائزة وضعية شخصيتك)'], pose: 'jump', ready: true },
  { id: 'face', title: 'وجهه (ملصق)', draw: 'وجهه فقط بتعبير واضح', where: ['ملصق وجهه في ردود اللوحة (ليفل 14)'], files: ['bust'], ready: true },
  { id: 'punch', title: 'الضرب', draw: 'يضرب لكمة للجنب', where: ['مشهد «يضرب» في الرئيسية: اللي يضرب'], pose: 'punch' },
  { id: 'hit', title: 'ينضرب', draw: 'ينضرب، وجهه متألم ويتراجع', where: ['مشهد «يضرب» و«يرمي النرد على»: اللي ينضرب'], pose: 'hit' },
  { id: 'laugh', title: 'الضحك والطقطقة', draw: 'يضحك بصوت ويشاور', where: ['مشهد «يطقطق على»: اللي يطقطق', 'وضعية «الضحك» (جائزة وضعية شخصيتك)'], pose: 'laugh' },
  { id: 'cry', title: 'الحزن / الضحية', draw: 'يبكي أو حزين', where: ['مشهد «يطقطق على»: الضحية', 'بيبي إذا ما فيه صورة بيبي'], pose: 'cry' },
  { id: 'dance', title: 'الرقص', draw: 'يرقص', where: ['مشهد «يرقص مع»', 'وضعية «الرقص» (جائزة وضعية شخصيتك)'], pose: 'dance' },
  { id: 'cheer', title: 'الاحتفال', draw: 'يرفع يديه فرحان / يحتفل', where: ['مشهد «يتحدى»', 'اختياره في «مين حاضر الليلة؟»', 'ملخص الجلسة لما يرتفع ليفله', 'وضعية «الاحتفال»'], pose: 'cheer' },
  { id: 'flag', title: 'الراية', draw: 'يرفع راية', where: ['وضعية «الراية» (جائزة وضعية شخصيتك)'], pose: 'flag' },
  { id: 'crown', title: 'التاج', draw: 'لابس تاج بفخر', where: ['تمثال الشهر في الرئيسية', 'وضعية «التاج»'], pose: 'crown' },
  { id: 'baby', title: 'البيبي', draw: 'بيبي بحفاظة وببرونة', where: ['لما أحد يسوّيه بيبي (طقطقة البيبي)'], pose: 'baby' },
]

function rolesFor(sty) {
  return ROLES.map(r => {
    const raw = r.pose ? sty.poses[r.pose] : null
    const file = r.files ? r.files[0] : Array.isArray(raw) ? raw[0] : raw || null
    const files = r.files || (file ? [file] : [])
    const status = r.ready ? 'ready' : file ? 'borrow' : 'none'
    return { ...r, files: [...files, ...(r.extra || [])], mainCount: files.length, file, status }
  })
}

// للمسؤول: وضعيات كل الشلة
function AllPoses() {
  const { idx } = useStore()
  const players = idx.players.filter(pl => IMG_CHARS[(pl.realName || pl.name).trim()])
  const [pid, setPid] = useState(players[0]?.id)
  const pl = players.find(x => x.id === pid) || players[0]
  if (!pl) return null
  const ic = IMG_CHARS[(pl.realName || pl.name).trim()]
  const sty = ic.styles[ic.def]
  const roles = rolesFor(sty)
  const todo = roles.filter(r => r.status !== 'ready')
  const used = new Set(roles.flatMap(r => r.files.slice(0, r.mainCount)))
  const spare = sty.gallery.filter(g => !used.has(g) && !roles.some(r => r.extra?.includes(g)))
  return (
    <>
      <Section title="المطلوب رسمه" action={<span className="muted small">{todo.length} وضعية</span>}>
        <p className="hint pad-x">نفس القائمة لكل اللاعبين. اللي عليها ⚠️ تستعير صورة مؤقتة، واللي عليها ❌ ما لها صورة أصلاً.</p>
        <ul className="todo-poses">{todo.map(r => <li key={r.id}><span>{r.status === 'none' ? '❌' : '⚠️'}</span><div><b>{r.title}</b><small>{r.draw}</small></div></li>)}</ul>
      </Section>
      <Section title="وضعيات الشخصيات">
        <div className="pad-x title-pick">{players.map(p => <button key={p.id} className={`chip ${pl.id === p.id ? 'on' : ''}`} onClick={() => setPid(p.id)}>{p.name}</button>)}</div>
        <div className="role-list">{roles.map(r => (
          <div key={r.id} className={`role ${r.status}`}>
            <div className="role-imgs">{r.files.length
              ? r.files.map((f, i) => <img key={f} src={imgSrc(ic.slug, ic.def, f)} alt="" loading="lazy" className={i >= r.mainCount ? 'alt' : ''} />)
              : <span className="role-empty">❌</span>}</div>
            <div className="role-body">
              <b>{r.title} <em>{r.status === 'ready' ? '✓ جاهزة' : r.status === 'borrow' ? '⚠️ صورة مستعارة' : '❌ ناقصة'}</em></b>
              <ul>{r.where.map(x => <li key={x}>{x}</li>)}</ul>
              {r.extra && <small>{r.extraNote}</small>}
              {r.status !== 'ready' && <small>المطلوب: {r.draw}</small>}
            </div>
          </div>
        ))}</div>
        {spare.length > 0 && <>
          <p className="hint pad-x">صور احتياط ما تطلع في أي مكان:</p>
          <div className="pose-strip">{spare.map(g => <img key={g} src={imgSrc(ic.slug, ic.def, g)} alt="" />)}</div>
        </>}
      </Section>
    </>
  )
}
