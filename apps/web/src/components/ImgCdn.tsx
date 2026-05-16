// apps/web/src/components/ImgCdn.tsx

'use client'

/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { asset, FALLBACK, rawAsset } from '../lib/asset'

type Props = Omit<
	ImgHTMLAttributes<HTMLImageElement>,
	'src' | 'loading' | 'decoding'
> & {
	src: string

	/**
	 * Для ключевых картинок: лого, аватар в HUD, фон первого экрана.
	 * priority={true} грузит картинку eager, остальные lazy.
	 */
	priority?: boolean
}

export default function ImgCdn({
	src,
	priority,
	style,
	alt,
	onError,
	...rest
}: Props) {
	const isRel = !/^https?:\/\//i.test(src)

	const primary = useMemo(() => {
		return isRel ? asset(src) : src
	}, [isRel, src])

	const fallback = useMemo(() => {
		if (isRel) {
			return rawAsset(src, FALLBACK)
		}

		return src.replace(/(https?:\/\/[^/]+)/, FALLBACK)
	}, [isRel, src])

	const [cur, setCur] = useState(primary)

	useEffect(() => {
		setCur(primary)
	}, [primary])

	return (
		<img
			src={cur}
			alt={alt || ''}
			loading={priority ? 'eager' : 'lazy'}
			decoding={priority ? 'sync' : 'async'}
			onError={event => {
				if (cur !== fallback) {
					setCur(fallback)
				}

				onError?.(event)
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
