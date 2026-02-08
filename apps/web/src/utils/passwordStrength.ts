// apps/web/src/utils/passwordStrength.ts
const hasLower = (s: string) => /[a-z]/.test(s)
const hasUpper = (s: string) => /[A-Z]/.test(s)
const hasDigit = (s: string) => /\d/.test(s)
const hasSpecial = (s: string) => /[^A-Za-z0-9]/.test(s)

export function measureStrength(pw: string): number {
  let score = 0
  if (!pw) return 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (hasLower(pw)) score++
  if (hasUpper(pw)) score++
  if (hasDigit(pw)) score++
  if (hasSpecial(pw)) score++
  return Math.min(5, Math.max(0, score))
}

export function strengthMeta(score: number) {
  const steps = [0, 20, 40, 65, 85, 100]
  const labels = [
    'Очень слабый',
    'Слабый',
    'Ниже среднего',
    'Средний',
    'Хороший',
    'Сильный',
  ]
  const idx = Math.max(0, Math.min(5, score))
  return { percent: steps[idx], label: labels[idx] }
}