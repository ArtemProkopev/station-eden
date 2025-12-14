'use client'

import { useEffect } from 'react'

export type ScrollPreventionOptions = {
	/**
	 * Запрещать ли скролл на тач устройствах
	 * @default true
	 */
	preventTouch?: boolean
	/**
	 * Запрещать ли скролл колесом мыши
	 * @default true
	 */
	preventWheel?: boolean
	/**
	 * Запрещать ли скролл через CSS overflow
	 * @default true
	 */
	preventOverflow?: boolean
}

/**
 * Хук для предотвращения скролла на странице
 */
export function useScrollPrevention(options: ScrollPreventionOptions = {}) {
	const {
		preventTouch = true,
		preventWheel = true,
		preventOverflow = true,
	} = options

	useEffect(() => {
		const preventDefault = (e: Event) => {
			e.preventDefault()
		}

		const eventOptions: AddEventListenerOptions = { passive: false }

		if (preventWheel) {
			document.addEventListener('wheel', preventDefault, eventOptions)
		}

		if (preventTouch) {
			document.addEventListener('touchmove', preventDefault, eventOptions)
		}

		if (preventOverflow) {
			document.body.style.overflow = 'hidden'
			document.documentElement.style.overflow = 'hidden'
		}

		return () => {
			if (preventWheel) {
				document.removeEventListener('wheel', preventDefault)
			}

			if (preventTouch) {
				document.removeEventListener('touchmove', preventDefault)
			}

			if (preventOverflow) {
				document.body.style.overflow = ''
				document.documentElement.style.overflow = ''
			}
		}
	}, [preventTouch, preventWheel, preventOverflow])
}
