// apps/web/src/hooks/useUsernameGenerator.ts
import { useCallback, useEffect, useRef, useState } from 'react'

type WasmLike = any

export function useUsernameGenerator() {
	const [ready, setReady] = useState(false)
	const genRef = useRef<WasmLike | null>(null)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				// Не выполнять на сервере/в RSC
				if (typeof window === 'undefined') return

				// Формируем URL динамически, чтобы Next не резолвил модуль на билде
				const wasmJsUrl = new URL(
					'/wasm/username_generator.js',
					window.location.origin
				).toString()

				const mod: any = await import(/* webpackIgnore: true */ wasmJsUrl)

				const instance =
					(typeof mod.default === 'function' && (await mod.default())) ||
					(typeof mod.init === 'function' && (await mod.init())) ||
					mod

				const Gen = instance.UsernameGenerator || mod.UsernameGenerator
				genRef.current = new Gen()
			} catch (e) {
				console.warn('WASM load failed, use fallback:', e)
				genRef.current = {
					generate_username: () => fallback(),
					generate_multiple: (n: number) =>
						Array.from({ length: Math.min(n, 50) }, fallback),
					free: () => {},
				}
			} finally {
				if (!cancelled) setReady(true)
			}
		})()
		return () => {
			cancelled = true
			genRef.current?.free?.()
		}
	}, [])

	const generateUsername = useCallback((): string => {
		return genRef.current?.generate_username() ?? fallback()
	}, [])

	const generateMultiple = useCallback((count: number): string[] => {
		return (
			genRef.current?.generate_multiple?.(count) ??
			Array.from({ length: Math.min(count, 50) }, fallback)
		)
	}, [])

	return {
		generateUsername,
		generateMultiple,
		loading: !ready,
		isWasmSupported: true,
	}
}

function fallback(): string {
	const base = [
		'ka',
		'ne',
		'vi',
		'ro',
		'la',
		'mi',
		'to',
		'ra',
		'xo',
		'zi',
		'me',
		'ly',
		'na',
		're',
	]
	const rnd = () => Math.floor(Math.random() * base.length)
	const word =
		base[rnd()] + base[rnd()] + (Math.random() < 0.3 ? base[rnd()] : '')
	return (
		word[0].toUpperCase() +
		word.slice(1) +
		(Math.random() < 0.2 ? Math.floor(1 + Math.random() * 999) : '')
	)
}
