// ملصقات الطقطقة (رسم أصلي بـ SVG)
/* eslint-disable react/prop-types */
const O = '#2A1A12'

const ART = {
  cry: { name: 'يبكي', el: <g>
    <circle cx="32" cy="32" r="22" fill="#FFD34D" stroke={O} strokeWidth="2.5" />
    <path d="M20 27q4-4 8 0M36 27q4-4 8 0" stroke={O} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M24 43q8-7 16 0" stroke={O} strokeWidth="2.5" fill="#7A2B2B" strokeLinecap="round" />
    <path className="st-tear" d="M21 30c-3 6-8 14-8 22h8c0-8 2-15 0-22z" fill="#5BC8FF" stroke={O} strokeWidth="1.5" />
    <path className="st-tear t2" d="M43 30c3 6 8 14 8 22h-8c0-8-2-15 0-22z" fill="#5BC8FF" stroke={O} strokeWidth="1.5" />
  </g> },
  salt: { name: 'مملوح', el: <g>
    <path d="M22 26h20l3 28q-13 5-26 0z" fill="#EAF2FF" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M22 26q10-14 20 0z" fill="#B9C6DA" stroke={O} strokeWidth="2.5" />
    {[[28, 20], [32, 18], [36, 20]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.3" fill={O} />)}
    <text x="32" y="45" textAnchor="middle" fontSize="9" fontWeight="700" fill="#5A6B88">ملح</text>
    {[[14, 10], [20, 6], [46, 8], [52, 13], [26, 4]].map(([x, y], i) => <rect className="st-salt" key={i} x={x} y={y} width="2.4" height="2.4" fill="#fff" stroke="#9AA7BD" strokeWidth=".5" style={{ animationDelay: `${i * .15}s` }} />)}
  </g> },
  bottle: { name: 'نوب', el: <g>
    <path d="M27 10q5-6 10 0v6h-10z" fill="#FFB3C7" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="23" y="16" width="18" height="6" rx="2" fill="#7FD0FF" stroke={O} strokeWidth="2.5" />
    <rect x="22" y="22" width="20" height="32" rx="7" fill="#F4FBFF" stroke={O} strokeWidth="2.5" />
    <path d="M24 38h16v9q0 5-8 5t-8-5z" fill="#FFF3D6" />
    <path d="M28 30h4M28 36h6M28 42h4" stroke="#7FA7C9" strokeWidth="1.8" strokeLinecap="round" />
  </g> },
  rip: { name: 'الله يرحمه', el: <g>
    <path d="M16 56V28q0-16 16-16t16 16v28z" fill="#B7BECB" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
    <text x="32" y="36" textAnchor="middle" fontSize="11" fontWeight="800" fill="#4B5263" fontFamily="sans-serif">RIP</text>
    <path d="M24 44h16" stroke="#8C93A3" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 57h48" stroke="#3E8B4A" strokeWidth="4" strokeLinecap="round" />
    <path d="M12 55l2-5 2 5M48 55l2-6 2 6" stroke="#3E8B4A" strokeWidth="2" fill="none" />
  </g> },
  flag: { name: 'استسلم', el: <g>
    <path d="M18 8v50" stroke="#7A5232" strokeWidth="3.5" strokeLinecap="round" />
    <path className="st-flag" d="M19 11q10-5 18 0t18 0v20q-10 5-18 0t-18 0z" fill="#fff" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
  </g> },
  snail: { name: 'بطيء', el: <g>
    <path d="M8 50q2-8 14-8h26q8 0 10-8 2 6 2 10 0 8-10 8H12q-4 0-4-2z" fill="#9BE07A" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="30" cy="34" r="14" fill="#E39A4F" stroke={O} strokeWidth="2.5" />
    <path d="M30 34m-8 0a8 8 0 1 0 8-8a5 5 0 1 0 5 5" fill="none" stroke="#8A4E1E" strokeWidth="2.2" />
    <path d="M52 34l-2-10M56 33l2-9" stroke={O} strokeWidth="2" strokeLinecap="round" /><circle cx="50" cy="23" r="2" fill={O} /><circle cx="58" cy="23" r="2" fill={O} />
    <path className="st-zz" d="M4 30h4l-4 4h4" stroke="#7E8CFF" strokeWidth="1.6" fill="none" />
  </g> },
  clown: { name: 'مهرج', el: <g>
    <circle cx="14" cy="30" r="9" fill="#FF5FA2" stroke={O} strokeWidth="2" /><circle cx="50" cy="30" r="9" fill="#4FB6FF" stroke={O} strokeWidth="2" />
    <circle cx="32" cy="34" r="19" fill="#FFF7EE" stroke={O} strokeWidth="2.5" />
    <path d="M23 26l4 4M27 26l-4 4M37 26l4 4M41 26l-4 4" stroke={O} strokeWidth="2" strokeLinecap="round" />
    <circle cx="32" cy="36" r="5" fill="#FF3B3B" stroke={O} strokeWidth="2" />
    <path d="M22 43q10 9 20 0" stroke="#E2465B" strokeWidth="3" fill="none" strokeLinecap="round" />
  </g> },
  loser: { name: 'خسران', el: <g>
    <rect x="10" y="10" width="44" height="44" rx="12" fill="#FF4D5E" stroke={O} strokeWidth="2.5" />
    <path d="M24 18v26h18" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g> },
}

export const STICKERS = Object.entries(ART).map(([id, v]) => ({ id, name: v.name }))
export function Sticker({ id, size = 28 }) {
  const a = ART[id] || ART.cry
  return (
    <svg className={`sticker st-${id}`} width={size} height={size} viewBox="0 0 64 64" aria-label={a.name}>
      <g className="st-outline">{a.el}</g>
    </svg>
  )
}
