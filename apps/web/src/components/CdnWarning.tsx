// apps/web/src/components/CdnWarning.tsx
'use client'

import { useState } from 'react'
import { useCdnHealth } from '../lib/useCdnHealth'

export default function CdnWarning() {
  const { isPrimaryHealthy, isChecking } = useCdnHealth()
  const [isDismissed, setIsDismissed] = useState(false)

  if (isPrimaryHealthy || isChecking || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                CDN недоступен
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Используется резервный сервер
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="ml-4 flex-shrink-0 text-yellow-600 hover:text-yellow-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}