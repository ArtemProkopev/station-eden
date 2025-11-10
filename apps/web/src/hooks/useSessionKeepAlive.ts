// apps/web/src/hooks/useSessionKeepAlive.ts
'use client'

import { useEffect } from 'react'
import { api } from '../lib/api'

const DEFAULT_INTERVAL = 10 * 60 * 1000 // 10 минут

export function useSessionKeepAlive() {
  useEffect(() => {
    let alive = true
    const intervalMs = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || DEFAULT_INTERVAL)

    const tick = async () => {
      try { await api.refresh() } catch {}
    }

    // первый тихий вызов через короткую задержку
    const first = window.setTimeout(() => { if (alive) tick() }, 3000)
    const id = window.setInterval(() => { if (alive) tick() }, intervalMs)

    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      alive = false
      clearTimeout(first)
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}
