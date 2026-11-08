// التصانيف الكبيرة للألعاب (الترتيب هنا هو ترتيب العرض)
export const CATEGORIES = [
  { id: 'strategy', name: 'استراتيجية عميقة', hint: 'تخطيط طويل وقرارات ثقيلة', tone: '#7C8CFF' },
  { id: 'family', name: 'عائلية وكلاسيكية', hint: 'قواعد سهلة وتنفع للكل', tone: '#4FC3B8' },
  { id: 'adventure', name: 'مغامرات وبناء أوراق', hint: 'استكشاف وتطوير مجموعتك', tone: '#E0A44E' },
  { id: 'coop', name: 'تعاونية وألغاز', hint: 'كلنا فريق واحد ضد اللعبة', tone: '#6FD08C' },
  { id: 'bluff', name: 'خداع وأدوار مخفية', hint: 'كذب وشك ومين الخاين', tone: '#E0708E' },
  { id: 'light', name: 'أوراق خفيفة وسريعة', hint: 'جولات قصيرة وضحك', tone: '#C38BFF' },
  { id: 'duel', name: 'ألعاب 1v1', hint: 'واحد ضد واحد', tone: '#5FB2FF' },
]
export const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
export const OTHER = { id: 'other', name: 'بدون تصنيف', hint: '', tone: '#8A90B8' }
export const catOf = g => CAT[g?.category] || OTHER

export function weightLabel(w) {
  if (w == null) return null
  if (w < 1.8) return 'سهلة'
  if (w < 2.5) return 'متوسطة'
  if (w < 3.3) return 'متقدمة'
  return 'صعبة'
}
