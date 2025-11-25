// apps/web/src/utils/serverInfoParser.ts
import { ServerLockInfo } from '@station-eden/shared'

export function parseServerInfo(err: any): ServerLockInfo {
  const text =
    (err &&
      (err.message ||
        err.error ||
        err.response?.data?.message ||
        err.response?.data ||
        err.response?.data?.error)) ||
    (err && JSON.stringify(err)) ||
    ''
  const t = String(text)

  const lockMinutesMatch = t.match(/locked for\s+(\d+)\s+minutes/i)
  if (lockMinutesMatch) {
    const num = Number(lockMinutesMatch[1])
    if (!Number.isNaN(num)) return { lockedMinutes: num }
  }

  const untilIsoMatch =
    t.match(/blocked until\s+([\d\-\wT:.Z]+)/i) ||
    t.match(/locked until\s+([\d\-\wT:.Z]+)/i)
  if (untilIsoMatch) {
    const parsed = Date.parse(untilIsoMatch[1])
    if (!Number.isNaN(parsed))
      return { lockedUntil: new Date(parsed).toISOString() }
  }

  const attemptsMatch =
    t.match(/Attempts left[:\s]*([0-9]+)/i) ||
    t.match(/attempts left[:\s]*([0-9]+)/i)
  if (attemptsMatch) return { attemptsLeft: Number(attemptsMatch[1]) }

  const data = err?.payload ?? err?.response?.data
  if (data && typeof data === 'object') {
    if (typeof data.minutesLeft === 'number')
      return { lockedMinutes: data.minutesLeft }
    if (typeof data.attemptsLeft === 'number')
      return { attemptsLeft: data.attemptsLeft }
    if (typeof data.lockedUntil === 'string')
      return { lockedUntil: data.lockedUntil }
  }

  return {}
}