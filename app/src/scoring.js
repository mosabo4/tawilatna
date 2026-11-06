// طريقة الفوز لكل لعبة
export const SCORING = {
  rank: { name: 'ترتيب المراكز', icon: '🏅', hint: 'تختار مركز كل لاعب' },
  points: { name: 'الأعلى نقاط يفوز', icon: '🔢', hint: 'تكتب نقاط كل واحد والترتيب يطلع لحاله' },
  low: { name: 'الأقل نقاط يفوز', icon: '📉', hint: 'تكتب النقاط والأقل هو الأول' },
  winner: { name: 'فائز واحد', icon: '🏆', hint: 'تختار مين فاز بس' },
  elim: { name: 'إقصاء', icon: '💀', hint: 'تضغط على اللي يطلعون بالترتيب، وآخر واحد باقي هو الفائز' },
  teams: { name: 'فرق', icon: '⚔️', hint: 'تختار الفريق الفائز' },
  coop: { name: 'تعاونية', icon: '🤝', hint: 'كلكم تفوزون أو كلكم تخسرون' },
}
const BY_NAME = {
  points: ['Ticket to Ride: Europe', 'Brass: Birmingham', 'Root', 'Raccoon Tycoon', 'Catan', 'Carcassonne', 'Faraway', 'The Vale of Eternity', 'Dragonrealm', 'Citadels', 'Trash Pandas', 'Jaipur', 'Clank! Catacombs', 'Clank!: A Deck-Building Adventure', 'Tabannusi: Builders of Ur', 'The Manhattan Project 2: Minutes to Midnight', 'Sea Salt & Paper', 'Skull King', '7 Wonders', '7 Wonders Duel', 'Splendor', 'Deep Sea Adventure', 'Shallow Regrets', 'Inca Treasure', 'Pixies', 'The Fox in the Forest', 'Air, Land & Sea', 'Twilight Struggle'],
  low: ['Cabo Deluxe Edition'],
  winner: ['UNO: Mosab Edition', 'Trio', 'The Lord of the Rings: Duel for Middle-earth', 'Virus!', 'King of Tokyo', 'Cluedo', 'Saudi Deal', 'Dictator Game: Medieval Chaos'],
  elim: ['Coup', 'Exploding Kittens', 'Exploding Kittens: Party Pack', 'Exploding Kittens: Good vs Evil', 'Dungeon Mayhem', 'Dumb Ways to Die', "Liar's Pub"],
  teams: ['The Resistance: Avalon', 'Scotland Yard', 'Saboteur', 'O-1953', 'قول بس لا تقولها'],
}
const NAME_MAP = Object.fromEntries(Object.entries(BY_NAME).flatMap(([k, ns]) => ns.map(n => [n, k])))
// لو العمود موجود في القاعدة نعتمد عليه، وإلا نخمّن من الاسم
export const scoringOf = g => (g?.scoring ? g.scoring : NAME_MAP[g?.name] || (g?.category === 'coop' ? 'coop' : 'rank'))
export const isHeavy = g => Number(g?.weight) >= 3

export const durationText = p => {
  if (!p?.started_at || !p?.ended_at) return null
  const m = Math.round((new Date(p.ended_at) - new Date(p.started_at)) / 60000)
  if (m <= 0) return null
  return m < 60 ? `${m} دقيقة` : `${Math.floor(m / 60)} ساعة${m % 60 ? ` و${m % 60} دقيقة` : ''}`
}
