// apps/web/src/components/ImgCdn.tsx
'use client'

import type { ImgHTMLAttributes } from 'react'
import { useState, useEffect } from 'react'
import { asset, toFallback } from '../lib/asset'
import { useCdnHealth } from '../lib/useCdnHealth'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
}

export default function ImgCdn({ src, ...rest }: Props) {
  const { isPrimaryHealthy } = useCdnHealth()
  const isRel = !/^https?:\/\//i.test(src)

  // Собираем primary и fallback варианты
  const primary = isRel ? asset(src) : src
  const fallback = isRel ? asset(src, true) : toFallback(src)

  // Если primary CDN недоступен, сразу используем fallback
  const [cur, setCur] = useState(isPrimaryHealthy ? primary : fallback)

  // Синхронизация с пропсом src и состоянием CDN
  useEffect(() => {
    setCur(isPrimaryHealthy ? primary : fallback)
  }, [primary, isPrimaryHealthy]) 

  return (
    <img
      src={cur}
      onError={() => {
        if (cur !== fallback) setCur(fallback)
      }}
      {...rest}
    />
  )
}