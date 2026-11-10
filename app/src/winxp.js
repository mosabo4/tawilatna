// XP الفوز: يزيد مع صعوبة اللعبة ومدة القيم (من 5 إلى 40)
export function winXp(p, g, o) {
  const weight = Number(g?.weight) || 2.5
  const mins = p?.started_at && p?.ended_at ? (new Date(p.ended_at) - new Date(p.started_at)) / 60000 : Number(g?.play_minutes || g?.max_minutes) || 30
  const m = o?.mult || 1
  const raw = (weight * 4 + Math.min(Math.max(mins, 0), 240) / 6) * m
  return Math.max(o?.min ?? 5, Math.min(o?.max ?? 40, Math.round(raw / 5) * 5))
}
