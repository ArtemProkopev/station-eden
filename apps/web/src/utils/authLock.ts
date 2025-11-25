// apps/web/src/utils/authLock.ts
import { LockPayload } from '@station-eden/shared'

export const LOCK_KEY = 'se_auth_lock' as const

export const normLogin = (s: string) => s.trim().toLowerCase()

export function readLock(): LockPayload | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCK_KEY) : null
    if (!raw) return null
    const parsed = JSON.parse(raw) as LockPayload
    if (!parsed?.lockedUntilIso) return null
    return parsed
  } catch {
    return null
  }
}

export function writeLock(login: string, lockedUntilIso: string) {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify({ login: normLogin(login), lockedUntilIso })
    )
  } catch {}
}

export function clearLock() {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(LOCK_KEY)
  } catch {}
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return '0:00'
  const sec = Math.ceil(ms / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}