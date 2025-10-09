'use client'

import type { ImgHTMLAttributes } from 'react'
import { useState } from 'react'
import { asset, toFallback } from '../lib/asset'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
	/** Можно передавать относительный путь из /public ("/avatars/a.png")
	 *  или абсолютный URL на PRIMARY. Компонент сам подставит fallback при ошибке. */
	src: string
}

export default function ImgCdn({ src, ...rest }: Props) {
	const isRel = !/^https?:\/\//i.test(src)

	// Собираем primary и fallback варианты
	const primary = isRel ? asset(src) : src
	const fallback = isRel ? asset(src, true) : toFallback(src)

	const [cur, setCur] = useState(primary)

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
