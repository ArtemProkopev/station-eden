// apps/web/src/hooks/useSessionKeepAlive.ts
'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { isForcedLogout, isUserAuthenticated } from '../lib/authUtils'

const DEFAULT_INTERVAL = 10 * 60 * 1000
const MIN_REFRESH_GAP = 10 * 1000

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function useSessionKeepAlive() {
	const lastCallRef = useRef(0)
	const isMounted = useRef(false)
	const pathname = usePathname()

	useEffect(() => {
		if (!pathname) return
		if (pathname.startsWith('/login') || pathname.startsWith('/register'))
			return

		if (typeof window !== 'undefined' && isForcedLogout()) return
		if (typeof window !== 'undefined' && !isUserAuthenticated()) return

		isMounted.current = true

		const intervalMs = Number(
			process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || DEFAULT_INTERVAL,
		)

		let firstTimeout: ReturnType<typeof setTimeout> | null = null
		let intervalId: ReturnType<typeof setInterval> | null = null

		const stopLoop = () => {
			isMounted.current = false
			if (firstTimeout !== null) {
				clearTimeout(firstTimeout)
				firstTimeout = null
			}
			if (intervalId !== null) {
				clearInterval(intervalId)
				intervalId = null
			}
		}

		const handleLogoutEvent = () => {
			console.info('[keep-alive] Logout event received, stopping loop')
			stopLoop()
		}

		const handleSessionChanged = (e: Event) => {
			if (e instanceof CustomEvent && isRecord(e.detail)) {
				if (e.detail.loggedIn === false) {
					console.info(
						'[keep-alive] Session changed to logged out, stopping loop',
					)
					stopLoop()
				}
			}
		}

		const safeRefresh = async () => {
			if (!isMounted.current) return

			if (isForcedLogout()) {
				console.info('[keep-alive] Forced logout detected, stopping loop')
				stopLoop()
				return
			}

			const now = Date.now()
			const delta = now - lastCallRef.current
			if (delta < MIN_REFRESH_GAP) return
			lastCallRef.current = now

			try {
				await api.refresh()
				console.debug('[keep-alive] Refresh successful')
			} catch (e: unknown) {
				let status: number | undefined

				if (isRecord(e)) {
					const s = e.status
					const sc = e.statusCode
					if (typeof s === 'number') status = s
					else if (typeof sc === 'number') status = sc
				} else if (e instanceof Error && e.message.includes('401')) {
					status = 401
				}

				if (status === 401 || status === 403) {
					console.info('[keep-alive] Unauthorized, stopping loop')
					stopLoop()
					return
				}

				const msg =
					e instanceof Error ? e.message : typeof e === 'string' ? e : e
				console.warn('[keep-alive] Refresh failed:', msg)
			}
		}

		firstTimeout = setTimeout(() => {
			if (isMounted.current) safeRefresh()
		}, 2500)

		intervalId = setInterval(() => {
			if (isMounted.current) safeRefresh()
		}, intervalMs)

		let visUnlock = true
		const onVisibilityChange = () => {
			if (!isMounted.current) return
			if (document.visibilityState === 'visible') {
				if (visUnlock) {
					visUnlock = false
					safeRefresh()
					setTimeout(() => (visUnlock = true), 1500)
				}
			}
		}

		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('logout', handleLogoutEvent)
		window.addEventListener('session-changed', handleSessionChanged)

		return () => {
			stopLoop()
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('logout', handleLogoutEvent)
			window.removeEventListener('session-changed', handleSessionChanged)
		}
	}, [pathname])
}
