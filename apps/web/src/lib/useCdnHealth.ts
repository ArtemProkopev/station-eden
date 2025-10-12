// apps/web/src/lib/useCdnHealth.ts
'use client'

import { useState, useEffect } from 'react'
import { PRIMARY, FALLBACK } from './asset'

export interface CdnHealthState {
  isPrimaryHealthy: boolean
  isChecking: boolean
  lastChecked: Date | null
  error: string | null
}

export function useCdnHealth(checkInterval: number = 30000): CdnHealthState {
  const [state, setState] = useState<CdnHealthState>({
    isPrimaryHealthy: true,
    isChecking: false,
    lastChecked: null,
    error: null
  })

  useEffect(() => {
    let mounted = true

    const checkCdnHealth = async () => {
      if (!mounted) return

      setState(prev => ({ ...prev, isChecking: true, error: null }))

      try {
        const isHealthy = await checkPrimaryCdnHealth()
        
        if (mounted) {
          setState({
            isPrimaryHealthy: isHealthy,
            isChecking: false,
            lastChecked: new Date(),
            error: isHealthy ? null : 'Primary CDN недоступен'
          })
        }
      } catch (error) {
        if (mounted) {
          setState({
            isPrimaryHealthy: false,
            isChecking: false,
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Ошибка проверки CDN'
          })
        }
      }
    }

    // Первая проверка сразу
    checkCdnHealth()

    // Периодические проверки
    const interval = setInterval(checkCdnHealth, checkInterval)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [checkInterval])

  return state
}

// Вспомогательная функция для проверки здоровья primary CDN
async function checkPrimaryCdnHealth(): Promise<boolean> {
  // Если PRIMARY не настроен, считаем что проверка не нужна
  if (!PRIMARY) return true

  try {
    // Пробуем загрузить тестовый ресурс через primary CDN
    // Используем favicon.ico как тестовый файл, который обычно есть
    const testUrl = `${PRIMARY}/web/favicon.ico?health-check=${Date.now()}`
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    // CDN считается здоровым если возвращает 2xx/3xx или 404 (главное что отвечает)
    return response.status !== 403 && response.status !== 500
  } catch {
    return false
  }
}