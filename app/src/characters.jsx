// شخصيات الشلة الكرتونية (رسم أصلي بـ SVG) — كل وحدة تشبه صاحبها، وتتعدّل مع الليفلات
/* eslint-disable react/prop-types */

// الشكل الأساسي لكل واحد (من صورهم)
export const BASE_LOOKS = {
  'مصعب': { skin: '#E6B48F', hair: '#2A1C14', hairStyle: 'messy', beard: 'mustache', outfit: '#1F2026', collar: 'shirt', hat: 'cowboy', glasses: null, brows: 'sharp', mouth: 'smirk' },
  'هاني': { skin: '#8C5A3C', hair: '#1C1310', hairStyle: 'curly', beard: 'full', outfit: '#25325C', collar: 'thobe', hat: null, glasses: null, brows: 'soft', mouth: 'smile' },
  'محمدي': { skin: '#C58D63', hair: '#1E1612', hairStyle: 'short', beard: 'goatee', outfit: '#F3F5FA', collar: 'thobe', hat: 'fedora', glasses: 'sun', brows: 'soft', mouth: 'grin' },
  'معتز': { skin: '#94603F', hair: '#17110D', hairStyle: 'curly', beard: 'thick', outfit: '#F1F2F4', collar: 'shirt', hat: null, glasses: null, brows: 'raised', mouth: 'flat' },
  'فارس': { skin: '#C3875A', hair: '#1B1410', hairStyle: 'curly', beard: 'mustache', outfit: '#F3F5FA', collar: 'thobe', hat: null, glasses: null, brows: 'soft', mouth: 'grin' },
  'اياد': { skin: '#B97E56', hair: '#16100C', hairStyle: 'wavy', beard: 'goatee', outfit: '#1E2A4E', collar: 'shirt', hat: null, glasses: null, brows: 'raised', mouth: 'smirk' },
}
const FALLBACK = { skin: '#C99270', hair: '#1E1612', hairStyle: 'short', beard: null, outfit: '#5B6CFF', collar: 'shirt', hat: null, glasses: null, brows: 'soft', mouth: 'smile' }
export const lookOf = (player, custom) => ({ ...(BASE_LOOKS[player?.name?.trim()] || { ...FALLBACK, outfit: player?.color || FALLBACK.outfit }), ...(custom || {}) })

// خيارات التعديل (تنفتح مع الليفلات)
export const CUSTOM = {
  outfit: { level: 2, label: 'لون اللبس', options: [null, '#F3F5FA', '#1F2026', '#25325C', '#7A1F2B', '#2E7D4F', '#C9A227', '#6B4FD8', '#E26D2A'] },
  glasses: { level: 3, label: 'نظارة', options: [null, 'sun', 'round', 'none'] },
  hat: { level: 5, label: 'راس', options: [null, 'none', 'cowboy', 'fedora', 'cap', 'shmagh', 'crown'] },
  aura: { level: 8, label: 'هالة', options: [null, 'fire', 'electric', 'gold'] },
}
export const OPTION_NAMES = { sun: 'شمسية', round: 'طبية', none: 'بدون', cowboy: 'كاوبوي', fedora: 'برنيطة', cap: 'كاب', shmagh: 'شماغ', crown: 'تاج', fire: 'نار', electric: 'كهرباء', gold: 'ذهبية' }

const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})` }

function Hair({ style, color }) {
  if (style === 'curly') return (
    <g fill={color}>
      {[[38, 40, 11], [48, 31, 12], [61, 28, 13], [74, 32, 12], [84, 42, 10], [33, 52, 8], [88, 54, 8], [55, 33, 10], [68, 36, 10]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
    </g>
  )
  if (style === 'wavy') return <path fill={color} d="M30 58c-4-22 10-36 30-37 20-1 34 10 33 30-3-6-7-9-12-9 2-6-2-10-7-9-3-6-11-6-15-1-5-3-11-1-13 4-6-1-11 4-10 10-3 1-5 5-6 12z" />
  if (style === 'messy') return <path fill={color} d="M31 56c-2-18 9-31 28-32 18-1 32 9 32 27l-6-7-3 7-6-9-4 8-6-10-4 9-7-8-3 9-6-7-4 8z" />
  return <path fill={color} d="M32 54c0-18 12-28 28-28s28 10 28 28c-4-8-10-12-18-13-6 4-14 5-22 3-8 1-13 4-16 10z" />
}

function Beard({ type, color }) {
  if (type === 'full' || type === 'thick') return (
    <path fill={color} opacity={type === 'thick' ? 1 : .92} d={type === 'thick'
      ? 'M31 60c0 22 12 38 29 38s29-16 29-38c-4 8-8 12-12 14-5-5-11-6-17-6s-12 1-17 6c-4-2-8-6-12-14z'
      : 'M33 63c1 18 12 31 27 31s26-13 27-31c-4 7-7 10-11 11-5-4-10-5-16-5s-11 1-16 5c-4-1-7-4-11-11z'} />
  )
  if (type === 'goatee') return <g fill={color}><path d="M50 73c3-2 7-3 10-3s7 1 10 3c-3 0-6 1-10 1s-7-1-10-1z" /><path d="M54 82c2 6 4 9 6 9s4-3 6-9c-2 1-4 2-6 2s-4-1-6-2z" /></g>
  if (type === 'mustache') return <g fill={color}><path d="M48 74c4-4 8-4 12-2 4-2 8-2 12 2-4 0-8 1-12 1s-8-1-12-1z" /><path d="M56 84c1 3 2 5 4 5s3-2 4-5c-1 1-3 1-4 1s-3 0-4-1z" opacity=".8" /></g>
  return null
}

function Face({ look, mood }) {
  const eyeY = 60
  const browY = look.brows === 'raised' ? 49 : 51
  const browTilt = look.brows === 'sharp' ? 3 : look.brows === 'raised' ? -1 : 1
  let eyes, mouth
  if (mood === 'hit') {
    eyes = <g stroke="#2A1A12" strokeWidth="2.4" strokeLinecap="round"><path d="M46 56l7 7M53 56l-7 7M67 56l7 7M74 56l-7 7" /></g>
    mouth = <ellipse cx="60" cy="79" rx="5" ry="6" fill="#5A1E1E" />
  } else if (mood === 'laugh') {
    eyes = <g stroke="#2A1A12" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M45 61q5-6 10 0M65 61q5-6 10 0" /></g>
    mouth = <path d="M50 74q10 12 20 0z" fill="#5A1E1E" stroke="#2A1A12" strokeWidth="1.2" />
  } else if (mood === 'cry') {
    eyes = <g><path d="M45 60q5 4 10 0M65 60q5 4 10 0" stroke="#2A1A12" strokeWidth="2.4" fill="none" strokeLinecap="round" /><path className="tear" d="M47 64q-2 6 0 9q3-3 0-9z" fill="#6CCBFF" /><path className="tear t2" d="M73 64q-2 6 0 9q3-3 0-9z" fill="#6CCBFF" /></g>
    mouth = <path d="M52 81q8-7 16 0" stroke="#2A1A12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  } else {
    eyes = <g><ellipse cx="50" cy={eyeY} rx="5" ry="5.6" fill="#fff" /><ellipse cx="70" cy={eyeY} rx="5" ry="5.6" fill="#fff" /><circle className="pupil" cx="51" cy={eyeY + 1} r="2.8" fill="#1A120D" /><circle className="pupil" cx="71" cy={eyeY + 1} r="2.8" fill="#1A120D" /><circle cx="52" cy={eyeY - .5} r=".9" fill="#fff" /><circle cx="72" cy={eyeY - .5} r=".9" fill="#fff" /></g>
    mouth = look.mouth === 'grin' ? <path d="M50 75q10 10 20 0z" fill="#fff" stroke="#3A1E14" strokeWidth="1.6" strokeLinejoin="round" />
      : look.mouth === 'smirk' ? <path d="M52 78q7 3 15-3" stroke="#3A1E14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        : look.mouth === 'flat' ? <path d="M53 78h14" stroke="#3A1E14" strokeWidth="2.4" strokeLinecap="round" />
          : <path d="M51 76q9 7 18 0" stroke="#3A1E14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
  }
  return (
    <g>
      <g stroke={look.hair} strokeWidth="2.6" strokeLinecap="round">
        <path d={`M44 ${browY + browTilt}L55 ${browY}`} /><path d={`M65 ${browY}L76 ${browY + browTilt}`} />
      </g>
      {eyes}
      <path d="M59 64q-2 6 1 8" stroke={shade(look.skin, .72)} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Beard type={look.beard} color={look.hair} />
      {mouth}
    </g>
  )
}

function Glasses({ type }) {
  if (type === 'sun') return <g><rect x="41" y="54" width="17" height="12" rx="4" fill="#2B1F2E" /><rect x="62" y="54" width="17" height="12" rx="4" fill="#2B1F2E" /><path d="M58 59h4M41 58l-8-2M79 58l8-2" stroke="#2B1F2E" strokeWidth="2" /><path d="M44 57l5 0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" /></g>
  if (type === 'round') return <g fill="none" stroke="#2B2B33" strokeWidth="2"><circle cx="50" cy="60" r="8" /><circle cx="70" cy="60" r="8" /><path d="M58 59h4" /></g>
  return null
}

function Hat({ type }) {
  if (type === 'cowboy') return <g><ellipse cx="60" cy="38" rx="42" ry="9" fill="#E07A2E" /><path d="M36 37c0-14 10-22 24-22s24 8 24 22c-8 3-16 4-24 4s-16-1-24-4z" fill="#EE8A35" /><path d="M38 33l4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3 4-3 4 3" fill="none" stroke="#3A2210" strokeWidth="1.2" /><path d="M20 38q40 10 80 0" stroke="#B55E1F" strokeWidth="1.5" fill="none" /></g>
  if (type === 'fedora') return <g><ellipse cx="60" cy="36" rx="36" ry="7" fill="#8E97A6" /><path d="M38 35c0-13 9-20 22-20s22 7 22 20c-7 2-14 3-22 3s-15-1-22-3z" fill="#A8B0BD" /><path d="M38 31c7 2 15 3 22 3s15-1 22-3v4c-7 2-15 3-22 3s-15-1-22-3z" fill="#4A5262" /></g>
  if (type === 'cap') return <g><path d="M33 40c0-14 12-22 27-22s27 8 27 22z" fill="#D93A3A" /><path d="M84 38c10 0 18 2 20 5-6 1-13 1-20 0z" fill="#B42E2E" /><circle cx="60" cy="19" r="2.5" fill="#B42E2E" /></g>
  if (type === 'shmagh') return <g><path d="M27 62c-2-26 12-42 33-42s35 16 33 42l-6 30c-3-20-6-34-27-34s-24 14-27 34z" fill="#fff" /><path d="M27 62c-2-26 12-42 33-42s35 16 33 42" fill="none" stroke="#D93A3A" strokeWidth="2" strokeDasharray="3 3" /><path d="M30 36c8-6 18-9 30-9s22 3 30 9" stroke="#111" strokeWidth="4" fill="none" /></g>
  if (type === 'crown') return <g><path d="M38 34l4-16 9 10 9-14 9 14 9-10 4 16z" fill="#FFD25A" stroke="#C89416" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="60" cy="25" r="2.5" fill="#E2465B" /><circle cx="46" cy="29" r="2" fill="#4FB6FF" /><circle cx="74" cy="29" r="2" fill="#4FB6FF" /></g>
  return null
}

// ---------- شخصيات مرسومة جاهزة (صور) ----------
// d = اتجاه الحركة في الصورة (l يسار، r يمين) عشان نقلبها صح في المسرح
export const K_POSES = ['idle', 'bust', 'punch', 'hit', 'laugh', 'cry', 'dance', 'fight', 'dice', 'jump', 'flag', 'crown', 'f_happy', 'f_angry', 'f_shock', 'f_smug', 'f_cry']
const E = { name: 'واقعي', poses: { idle: 'idle', punch: ['throw', 'r'], dice: ['throw', 'r'], hit: 'front', laugh: 'cards', cry: 'front', dance: 'jump', cheer: 'jump' }, gallery: ['idle', 'front', 'three', 'cards', 'jump', 'throw'] }
const K = { name: 'كرتون', poses: { idle: 'idle', punch: ['punch', 'r'], hit: ['hit', 'l'], laugh: ['laugh', 'r'], cry: 'cry', dance: 'dance', cheer: 'fight' }, gallery: ['idle', 'punch', 'hit', 'laugh', 'cry', 'dance', 'fight', 'dice', 'jump', 'flag', 'crown'] }
export const IMG_CHARS = {
  'مصعب': { slug: 'musab', def: 'e', styles: {
    k: K,
    a: { name: 'ثلاثي الأبعاد', poses: { idle: 'idle', punch: ['throw', 'l'], hit: 'side', laugh: 'cheer', cry: 'idle', dance: 'cheer', cheer: ['fist', 'r'] }, gallery: ['idle', 'side', 'cheer', 'throw', 'fist'] },
    b: { name: 'كرتون 1', poses: { idle: 'cross', punch: ['hammer', 'r'], hit: 'think', laugh: 'trophy', cry: 'think', dance: 'trophy', cheer: 'trophy' }, gallery: ['idle', 'cross', 'hammer', 'trophy', 'think', 'relax'] },
    c: { name: 'مجسّم', poses: { idle: 'idle', punch: ['point', 'l'], hit: 'front', laugh: 'sit', cry: 'front', dance: ['run', 'l'], cheer: 'sit' }, gallery: ['idle', 'front', 'point', 'run', 'sit'] },
    d: { name: 'تشيبي', poses: { idle: 'idle', punch: ['throw', 'l'], hit: 'shock', laugh: 'laugh', cry: 'shock', dance: 'cheer', cheer: 'cheer' }, gallery: ['idle', 'three', 'throw', 'laugh', 'shock', 'cheer'] },
    e: { ...E, gallery: ['idle', 'front', 'throw', 'cards', 'jump'] },
  } },
  'هاني': { slug: 'hani', def: 'e', styles: { e: E, k: K } },
  'محمدي': { slug: 'mohammadi', def: 'e', styles: { e: E, k: K } },
  'معتز': { slug: 'muataz', def: 'e', styles: { e: E, k: K } },
  'فارس': { slug: 'fares', def: 'e', styles: { e: E, k: K } },
  'اياد': { slug: 'eyad', def: 'e', styles: { e: E, k: K } },
}
export const imgSrc = (slug, style, pose) => `${import.meta.env.BASE_URL}chars/${slug}/${style}/${pose}.webp`

// pose: idle | punch | hit | dance | laugh | cry | cheer
export function Character({ player, custom, pose = 'idle', size = 120, flip, variant = 'flat' }) {
  const ic = IMG_CHARS[player?.name?.trim()]
  const st = custom?.style ?? ic?.def
  if (ic && st && st !== 'svg' && ic.styles[st]) {
    const p = ic.styles[st].poses[pose] || (pose === 'dice' && st === 'k' ? ['dice', 'r'] : ic.styles[st].poses.punch) || ic.styles[st].poses.idle
    const [file, dir] = Array.isArray(p) ? p : [p, null]
    const want = flip ? 'l' : 'r'
    const mirror = dir ? dir !== want : !!flip
    return <img className={`chr chr-img pose-${pose} ${mirror ? 'flip' : ''}`} src={imgSrc(ic.slug, st, file)} alt={player.name} style={{ height: size * 4 / 3 }} draggable="false" />
  }
  const look = lookOf(player, custom)
  const hat = look.hat === 'none' ? null : look.hat
  const glasses = look.glasses === 'none' ? null : look.glasses
  const mood = pose === 'hit' ? 'hit' : pose === 'laugh' ? 'laugh' : pose === 'cry' ? 'cry' : 'idle'
  const dark = shade(look.outfit, .82)
  return (
    <svg className={`chr pose-${pose} v-${variant} ${flip ? 'flip' : ''}`} width={size} height={size * 4 / 3} viewBox="0 0 120 160" aria-label={player?.name}>
      {variant !== 'flat' && (
        <defs>
          <filter id="stk" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d" />
            <feFlood floodColor="#fff" /><feComposite in2="d" operator="in" result="o" />
            <feDropShadow in="o" dx="0" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity=".35" result="os" />
            <feMerge><feMergeNode in="os" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="wob" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
          </filter>
          <radialGradient id="gloss" cx="35%" cy="25%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".08" /></radialGradient>
        </defs>
      )}
      {look.aura && <ellipse className={`aura aura-${look.aura}`} cx="60" cy="90" rx="50" ry="66" />}
      <ellipse cx="60" cy="154" rx="30" ry="5" fill="#000" opacity=".25" className="shadow" />
      <g className="body" filter={variant === 'sticker' ? 'url(#stk)' : variant === 'doodle' ? 'url(#wob)' : undefined}>
        <g className="arm arm-b" style={{ transformOrigin: '40px 98px' }}>
          <rect x="30" y="94" width="13" height="34" rx="6.5" fill={dark} /><circle cx="36" cy="130" r="6.5" fill={look.skin} />
        </g>
        <path d="M36 92q24-9 48 0l7 56q-31 8-62 0z" fill={look.outfit} />
        {look.collar === 'thobe'
          ? <><path d="M52 89q8 4 16 0v4q-8 4-16 0z" fill={dark} /><path d="M60 93v34" stroke={dark} strokeWidth="1.5" /><circle cx="60" cy="100" r="1.3" fill={dark} /><circle cx="60" cy="108" r="1.3" fill={dark} /></>
          : <><path d="M50 89l10 12 10-12" fill="none" stroke={dark} strokeWidth="2.5" strokeLinejoin="round" /><path d="M60 101v26" stroke={dark} strokeWidth="1.5" /></>}
        <rect x="54" y="80" width="12" height="12" rx="4" fill={shade(look.skin, .9)} />
        <g className="head" style={{ transformOrigin: '60px 86px' }}>
          {(look.hairStyle === 'curly' || look.hairStyle === 'wavy') && !hat && <Hair style={look.hairStyle} color={look.hair} />}
          <circle cx="32" cy="62" r="5.5" fill={shade(look.skin, .92)} /><circle cx="88" cy="62" r="5.5" fill={shade(look.skin, .92)} />
          <ellipse cx="60" cy="60" rx="28" ry="30" fill={look.skin} />
          {(!(look.hairStyle === 'curly' || look.hairStyle === 'wavy') || hat) && <Hair style={hat ? 'short' : look.hairStyle} color={look.hair} />}
          <ellipse cx="44" cy="70" rx="5" ry="3" fill="#FF7A7A" opacity=".18" /><ellipse cx="76" cy="70" rx="5" ry="3" fill="#FF7A7A" opacity=".18" />
          <Face look={look} mood={mood} />
          <Glasses type={mood === 'idle' ? glasses : null} />
          <Hat type={hat} />
          {variant === 'sticker' && <ellipse cx="60" cy="60" rx="28" ry="30" fill="url(#gloss)" pointerEvents="none" />}
        </g>
        <g className="arm arm-f" style={{ transformOrigin: '80px 98px' }}>
          <rect x="77" y="94" width="13" height="34" rx="6.5" fill={look.outfit} stroke={dark} strokeWidth="1" /><circle className="fist" cx="84" cy="130" r="7" fill={look.skin} />
        </g>
      </g>
    </svg>
  )
}

export const ACTIONS = [
  { id: 'punch', label: 'يضرب', icon: '👊', a: 'punch', b: 'hit', fx: '💥' },
  { id: 'tease', label: 'يطقطق على', icon: '🤭', a: 'laugh', b: 'cry', fx: '😂' },
  { id: 'dance', label: 'يرقص مع', icon: '🕺', a: 'dance', b: 'dance', fx: '🎵' },
  { id: 'duel', label: 'يتحدى', icon: '⚔️', a: 'cheer', b: 'cheer', fx: '⚡' },
  { id: 'dice', label: 'يرمي النرد على', icon: '🎲', a: 'dice', b: 'hit', fx: '🎲' },
]

export function Stage({ a, b, action = 'punch', customA, customB, compact }) {
  const act = ACTIONS.find(x => x.id === action) || ACTIONS[0]
  if (!a || !b) return null
  return (
    <div className={`stage act-${act.id} ${compact ? 'compact' : ''}`}>
      <div className="stage-floor" />
      <div className="actor actor-a"><Character player={a} custom={customA} pose={act.a} size={compact ? 84 : 104} /></div>
      <div className="fx" aria-hidden="true">{act.fx}</div>
      <div className="actor actor-b"><Character player={b} custom={customB} pose={act.b} size={compact ? 84 : 104} flip /></div>
      <p className="stage-cap"><b>{a.name}</b> {act.label} <b>{b.name}</b> {act.icon}</p>
    </div>
  )
}
