// apps/web/src/components/ImgCdn.tsx
'use client'

import type { ImgHTMLAttributes } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
	FALLBACK,
	onImgErrorSwapToFallback,
	PRIMARY,
	toCdn,
} from '../lib/asset'
import { useCdnHealth } from '../lib/useCdnHealth'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
	src: string
}

export default function ImgCdn({ src, ...rest }: Props) {
	const { isPrimaryHealthy } = useCdnHealth()

	// Нормализованный CDN-URL (перепишет selstorage/origin/относительные на CDN)
	const primary = useMemo(() => toCdn(src), [src])

	// Фолбек: тот же путь, но с origin селстора
	const fallback = useMemo(() => {
		try {
			if (!PRIMARY) return primary // toCdn уже вернул FALLBACK, менять нечего
			const p = new URL(primary)
			return primary.replace(p.origin, FALLBACK)
		} catch {
			return primary
		}
	}, [primary])

	// Если CDN нездоров — сразу используем селстор
	const [cur, setCur] = useState(isPrimaryHealthy ? primary : fallback)

	useEffect(() => {
		setCur(isPrimaryHealthy ? primary : fallback)
	}, [primary, fallback, isPrimaryHealthy])

	return (
		<img
			src={cur}
			onError={e => {
				if (cur !== fallback) setCur(fallback)
				onImgErrorSwapToFallback(e) // на всякий случай, если где-то попадёт прямой CDN-URL
			}}
			{...rest}
		/>
	)
}
