// apps/web/src/components/ImgCdn.tsx
'use client'

/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from 'react'
import { useEffect, useState } from 'react'
import { asset, FALLBACK } from '../lib/asset'
import { useCdnHealth } from '../lib/useCdnHealth'

type Props = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	'src' | 'loading' | 'decoding'
> & {
	src: string
	/**
	 * Для ключевых картинок (лого, аватар в HUD, фоновая на первом экране)
	 * ставим priority={true}, остальное будет lazy.
	 */
	priority?: boolean
}

export default function ImgCdn({ src, priority, style, alt, ...rest }: Props) {
	const { isPrimaryHealthy } = useCdnHealth()
	const isRel = !/^https?:\/\//i.test(src)

	// Собираем primary и fallback варианты
	const primary = isRel ? asset(src) : src
	const fallback = isRel
		? asset(src).replace(/(https?:\/\/[^/]+)/, FALLBACK)
		: src.replace(/(https?:\/\/[^/]+)/, FALLBACK)

	// Если primary CDN недоступен, сразу используем fallback
	const [cur, setCur] = useState(isPrimaryHealthy ? primary : fallback)

	// Синхронизация с пропсом src и состоянием CDN
	useEffect(() => {
		setCur(isPrimaryHealthy ? primary : fallback)
	}, [primary, fallback, isPrimaryHealthy])

	return (
		<img
			src={cur}
			alt={typeof alt === 'string' ? alt : ''} // ✅ обязательный alt для jsx-a11y
			loading={priority ? 'eager' : 'lazy'}
			decoding='async'
			onError={() => {
				if (cur !== fallback) setCur(fallback)
			}}
			style={{
				maxWidth: '100%',
				height: 'auto',
				...style,
			}}
			{...rest}
		/>
	)
}
