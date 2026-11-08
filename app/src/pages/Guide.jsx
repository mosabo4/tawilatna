// عرض «شرح»: يشرح للشلة نظام الموقع (نفس شكل ملخص الشهر)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, go } from '../store'
import { Avatar } from '../ui'
import { Character } from '../characters'
import { XP_RULES, REWARDS, xpFor } from '../levels'
import { useLevels } from './Levels'
import { TIER, SECRET_BADGES } from '../achievements'
import { RARITY, TITLE_DEFS } from '../titles'

const Card = ({ icon, title, children }) => <div className="gd-card"><span className="gd-ic">{icon}</span><div><b>{title}</b><small>{children}</small></div></div>

export default function Guide() {
  const { idx, me } = useStore()
  const levels = useLevels()
  const [i, setI] = useState(0)
  const touch = useRef(null)
  const crew = useMemo(() => [...levels.values()].sort((a, b) => b.xp - a.xp), [levels])
  const someone = crew[0]?.player
  const victim = crew.at(-1)?.player
  const rules = XP_RULES.filter(r => r.xp > 0 && !['thankGive'].includes(r.id))
  const pick = ids => ids.map(id => REWARDS.find(r => r.id === id)).filter(Boolean)
  const titleEx = ['sultan', 'general', 'wolf', 'teacher', 's67', 'runnerup'].map(id => TITLE_DEFS.find(t => t.id === id)).filter(Boolean)

  const slides = [
    <div className="rc-cover end" key="cover">
      <small>طاولتنا</small>
      <h1>شرح<br /><span>الموقع الجديد</span></h1>
      <div className="gd-crew">{crew.map(l => <Character key={l.player.id} player={l.player} pose="cheer" size={90} />)}</div>
      <p>كل اللي تحتاج تعرفه: النقاط، الليفلات، الجوائز، الإنجازات، والألقاب</p>
      <em>اضغط عشان نبدأ ←</em>
    </div>,

    <div key="nav">
      <h2>التطبيق بخمس أزرار</h2>
      <div className="gd-grid">
        <Card icon="🏠" title="الرئيسية">وش يحتاجك، المتصدرين، اللوحة، وآخر الأحداث</Card>
        <Card icon="🎲" title="الألعاب">الدولاب كامل، تقييم كل لعبة، وملك كل لعبة</Card>
        <Card icon="➕" title="سجّل قيم">بعد كل قيم: اللعبة، مين لعب، والنتيجة</Card>
        <Card icon="👥" title="الشلة">الترتيب، اللاعبين، لوحة الكلام، وسجل الأقيام</Card>
        <Card icon="👤" title="أنا">بطاقتك، ليفلك، جوائزك، وشكلك عند الشلة</Card>
        <Card icon="▶" title="الجلسة الحيّة">تبدأها أول الجلسة، وآخرها يطلع ملخص الليلة</Card>
      </div>
    </div>,

    <div key="log">
      <h2>تسجيل القيم <small>كل شي يبدأ من هنا</small></h2>
      <ol className="gd-steps">
        <li><b>اختر اللعبة</b><small>كل لعبة لها طريقة فوز: مراكز، نقاط، أقل نقاط، إقصاء، فرق، أو تعاوني</small></li>
        <li><b>اختر اللاعبين ورتّبهم</b><small>أو حط نقاط كل واحد والترتيب يطلع لحاله</small></li>
        <li><b>وقت البداية والنهاية</b><small>عشان نعرف كم تاخذ كل لعبة عندنا</small></li>
        <li><b>مين جهّز ومين رتّب</b><small>في الألعاب الثقيلة، اللي يجهّز ياخذ +20 XP واللي يرتّب +15</small></li>
      </ol>
    </div>,

    <div key="rank">
      <h2>الترتيب <small>كيف نعرف مين الأقوى؟</small></h2>
      <div className="gd-big">نقطة لكل خصم تغلبه</div>
      <div className="gd-example">
        <p>قيم فيه 5 لاعبين: لو جيت <b>الثاني</b> غلبت 3 من 4، يعني <b>3 نقاط من 4</b></p>
        <p>المستوى = نقاطك ÷ كل الخصوم اللي واجهتهم، كنسبة مئوية</p>
        <p>عشان كذا اللي يلعب 3 أقيام ويفوزها كلها ما يتساوى مع اللي لعب 30 وفاز 15</p>
      </div>
    </div>,

    <div key="xp">
      <h2>الـXP <small>تجمعه بالحضور والتفاعل، مو بالفوز بس</small></h2>
      <div className="gd-xp">{rules.map(r => <div key={r.id}><span>{r.icon}</span><small>{r.label.replace(/ \(.*\)$/, '')}</small><b>+{r.range || r.xp}</b></div>)}</div>
      <p className="gd-note">وفوقها: الإنجازات، صندوق الحظ، الهدايا، والتوقعات</p>
    </div>,

    <div key="levels">
      <h2>الليفلات</h2>
      <div className="rc-nums">
        {[2, 5, 10, 15, 20].map(l => <div key={l}><b>{l}</b><span>ليفل</span><i>{xpFor(l).toLocaleString('en')} XP</i></div>)}
      </div>
      <div className="gd-big small">كل ليفل يفتح لك جوائز جديدة</div>
      <p className="gd-note">من 2 لين 20، وكل ما ارتفعت صارت الجوائز أقوى وأكثر تأثير على الشلة</p>
    </div>,

    <div key="rewards">
      <h2>الجوائز <small>أمثلة</small></h2>
      <div className="gd-grid">
        {pick(['color', 'tease', 'scene', 'baby', 'challenge', 'predict', 'veto', 'lucky', 'immune', 'hall']).map(r => <Card key={r.id} icon={r.icon} title={`ليفل ${r.level} · ${r.name}`}>{r.desc}</Card>)}
      </div>
    </div>,

    <div key="limits">
      <h2>جوائز تتجدد <small>مرة بالأسبوع أو بالشهر</small></h2>
      <div className="gd-grid">
        <Card icon="📅" title="مرة بالأسبوع">مثل صندوق الحظ، الطقطقة، تجاوز الدور، واختيار الفريق</Card>
        <Card icon="🗓️" title="مرة بالشهر">مثل الفيتو، الحصانة، والعرّاب</Card>
        <Card icon="⏳" title="بعد ما تستخدمها">تتجدد بعد المدة، وتشوف الباقي في «جوائزي المحدودة» بصفحة أنا</Card>
      </div>
    </div>,

    <div key="tease" className="gd-split">
      <div>
        <h2>الطقطقة 😈</h2>
        <div className="gd-list">
          <Card icon="😭" title="ملصق">تلزّقه على صورة واحد 3 أيام</Card>
          <Card icon="👶" title="البيبي">شخصيته تصير بيبي بحفاظة يوم كامل</Card>
          <Card icon="🏷️" title="تغيير لقبه">تكتب له لقب يشوفه الكل يوم كامل</Card>
          <Card icon="🎭" title="اسم مستعار">تغيّر اسمه ساعتين</Card>
          <Card icon="🛡️" title="والحل؟">الحصانة: أسبوع محد يقدر يقرّب لك</Card>
        </div>
      </div>
      {victim && <div className="gd-hero"><Character player={victim} pose="baby" size={170} /><small>مثال: {victim.name} لما يصير بيبي</small></div>}
    </div>,

    <div key="ach">
      <h2>الإنجازات <small>5 أنواع</small></h2>
      <div className="gd-grid">
        <Card icon="📈" title="المسيرة">إنجازات تكبر معك بدرجات: {TIER.map(t => t.icon).join(' ')}</Card>
        <Card icon="🔥" title="الصعبة">مواقف صعبة، مثل «الإعصار»: تفوز بكل أقيام الجلسة</Card>
        <Card icon="🫂" title="الشلة">التجهيز، الهدايا، المذكرات، والشكر</Card>
        <Card icon="❓" title="السرية">مخفية لين أحد يفتحها</Card>
        <Card icon="📅" title="الموسمية">تتجدد كل شهر، مثل «بطل الشهر»</Card>
      </div>
      <p className="gd-note">كل إنجاز يعطيك XP، والأصعب يعطي أكثر</p>
    </div>,

    <div key="secret" className="rc-cover end">
      <h2>الإنجازات السرية 🤫</h2>
      <div className="gd-secrets">{Object.keys(SECRET_BADGES).map(k => <span key={k}>❓</span>)}</div>
      <p>{Object.keys(SECRET_BADGES).length} إنجازات سرية، تنفتح بمواقف مضحكة أو نادرة وأنتم تلعبون</p>
      <p className="gd-note">وكل وحدة تعطيك شارة تحطها على صورتك وجنب اسمك</p>
    </div>,

    <div key="titles">
      <h2>الألقاب <small>صعبة وتستاهل</small></h2>
      <div className="gd-rar">{Object.values(RARITY).reverse().map(r => <span key={r.name}><i style={{ background: r.dot }} />{r.name}</span>)}</div>
      <div className="gd-grid">{titleEx.map(t => <Card key={t.id} icon={t.icon} title={`${t.name} · ${RARITY[t.rarity].name}`}>{t.desc}</Card>)}</div>
      <p className="gd-note">{TITLE_DEFS.length} لقب بثلاث درجات حسب الصعوبة، تلبس واحد منها جنب اسمك من ليفل 3</p>
    </div>,

    <div key="session">
      <h2>الجلسة <small>قبل وأثناء وبعد</small></h2>
      <div className="gd-grid">
        <Card icon="🗳️" title="قبل: الجلسة الجاية">كل واحد يختار وش يبي يلعب، والأكثر طلباً يطلع فوق</Card>
        <Card icon="📋" title="أثناء: قرارات الليلة">اختيار شريك، تجاوز الدور، ضمان الخاسر، وDouble or Nothing</Card>
        <Card icon="🔮" title="أثناء: التوقعات">توقّع الفايز قبل القيم، وإذا صح تاخذ XP</Card>
        <Card icon="⚡" title="بعد: XP الليلة">كم أخذ كل واحد، ومين ارتفع ليفله</Card>
      </div>
    </div>,

    <div key="board">
      <h2>وين الشلة الحين؟</h2>
      <ol className="gd-board">
        {crew.map((l, k) => (
          <li key={l.player.id}><span className="gd-rk">{k + 1}</span><Avatar player={l.player} size={40} /><b>{l.player.name}</b><span className="gd-lv">ليفل {l.level}</span><em>{l.xp.toLocaleString('en')} XP</em></li>
        ))}
      </ol>
      {someone && <p className="gd-note">{someone.name} قدّام، بس الطريق للين ليفل 20 طويل 😏</p>}
    </div>,

    <div className="rc-cover end" key="end">
      <h1>يلا<br /><span>نلعب 🎲</span></h1>
      <p>أي شي ما فهمته؟ اسأل {idx.players.find(p => p.is_admin)?.name || 'المسؤول'}</p>
    </div>,
  ]

  const last = slides.length - 1
  const next = () => setI(x => Math.min(last, x + 1))
  const prev = () => setI(x => Math.max(0, x - 1))
  const exit = () => { if (document.fullscreenElement) document.exitFullscreen?.(); go('/me/admin') }
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
    <div className="recap guide"
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
