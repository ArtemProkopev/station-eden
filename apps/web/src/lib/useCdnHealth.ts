// apps/web/src/lib/useCdnHealth.ts

'use client'

import { useEffect, useState } from 'react'

import { PRIMARY } from './asset'
import { checkImage } from './checkImage'

interface CdnHealthState {
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
		error: null,
	})

	useEffect(() => {
		let mounted = true

		const checkCdnHealth = async () => {
			if (!mounted) return

			setState(prev => ({
				...prev,
				isChecking: true,
				error: null,
			}))

			try {
				const isHealthy = await checkPrimaryCdnHealth()

				if (!mounted) return

				setState({
					isPrimaryHealthy: isHealthy,
					isChecking: false,
					lastChecked: new Date(),
					error: isHealthy ? null : 'Primary CDN недоступен',
				})
			} catch (error) {
				if (!mounted) return

				setState({
					isPrimaryHealthy: false,
					isChecking: false,
					lastChecked: new Date(),
					error: error instanceof Error ? error.message : 'Ошибка проверки CDN',
				})
			}
		}

		checkCdnHealth()

		const interval = window.setInterval(checkCdnHealth, checkInterval)

		return () => {
			mounted = false
			window.clearInterval(interval)
		}
	}, [checkInterval])

	return state
}

async function checkPrimaryCdnHealth(): Promise<boolean> {
	if (!PRIMARY) return true

	const testUrl = `${PRIMARY}/web/favicon.ico?health-check=${Date.now()}`

	return checkImage(testUrl)
}
