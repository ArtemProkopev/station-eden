// apps/web/src/hooks/useUsernameGenerator.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type WasmModuleApi = {
	default?: (input?: unknown) => Promise<unknown> | unknown
	init?: (input?: unknown) => Promise<unknown> | unknown
	UsernameGenerator?: new () => {
		generate_username(): string
		generate_multiple?(count: number): any
		free?: () => void
	}
	generate_username?: () => string
}

// Синглтоны: импорт glue, init wasm и общий инстанс генератора
let wasmModOnce: Promise<WasmModuleApi | null> | null = null
let wasmReadyOnce: Promise<boolean> | null = null
let sharedGen: {
	generate_username(): string
	generate_multiple?(n: number): any
	free?: () => void
} | null = null
let lastInitError: unknown = null

function wasmGlueUrl(): string | null {
	if (typeof window === 'undefined') return null
	return new URL(
		'/wasm/username_generator.js',
		window.location.origin
	).toString()
}

function wasmBinaryUrl(): string | null {
	if (typeof window === 'undefined') return null
	return new URL(
		'/wasm/username_generator_bg.wasm',
		window.location.origin
	).toString()
}

async function importWasmGlue(): Promise<WasmModuleApi | null> {
	if (typeof window === 'undefined') return null
	if (wasmModOnce) return wasmModOnce
	wasmModOnce = (async () => {
		try {
			const url = wasmGlueUrl()
			if (!url) return null
			// @ts-ignore
			const mod: WasmModuleApi = await import(/* webpackIgnore: true */ url)
			return mod ?? null
		} catch (e) {
			if (process.env.NODE_ENV !== 'production')
				console.warn('wasm glue import failed', e)
			return null
		}
	})()
	return wasmModOnce
}

// Инициализируем wasm новым объектным API; если не поддерживается — откатываемся к старому
async function ensureWasmInitialized(): Promise<boolean> {
	if (wasmReadyOnce) return wasmReadyOnce
	wasmReadyOnce = (async () => {
		const mod = await importWasmGlue()
		if (!mod) return false
		try {
			const init = (
				typeof mod.default === 'function' ? mod.default : mod.init
			) as ((i?: unknown) => Promise<unknown> | unknown) | undefined
			const bin = wasmBinaryUrl()

			if (init) {
				try {
					// Современный интерфейс wasm-bindgen: единый объект
					// Передаём Response, чтобы wasm-bindgen сам сделал streaming или fallback на bytes.
					const module_or_path = bin ? await fetch(bin) : undefined
					await init({ module_or_path })
				} catch {
					// Совместимость со старым интерфейсом: путь/URL строкой
					await init(bin || undefined)
				}
			}

			if (typeof mod.UsernameGenerator === 'function') {
				sharedGen = new mod.UsernameGenerator!()
			} else if (typeof mod.generate_username === 'function') {
				sharedGen = {
					generate_username: () => mod.generate_username!(),
					generate_multiple: (n: number) =>
						Array.from({ length: Math.min(Math.max(n | 0, 0), 50) }, () =>
							mod.generate_username!()
						),
				}
			} else {
				throw new Error('WASM exports not found')
			}
			lastInitError = null
			return true
		} catch (e) {
			lastInitError = e
			if (process.env.NODE_ENV !== 'production')
				console.warn('wasm init failed', e)
			sharedGen = null
			return false
		}
	})()
	return wasmReadyOnce
}

// Фоллбек-ГПСЧ и генератор (без wasm)
class Xoshiro128 {
	private s0: number
	private s1: number
	private s2: number
	private s3: number
	constructor(seedHi: number, seedLo: number) {
		let z = (BigInt(seedHi) << 32n) | BigInt(seedLo)
		const splitmix32 = (x: bigint): [bigint, number] => {
			let v = x + 0x9e3779b97f4a7c15n
			let t = v
			t = (t ^ (t >> 30n)) * 0xbf58476d1ce4e5b9n
			t = (t ^ (t >> 27n)) * 0x94d049bb133111ebn
			const out = Number((t ^ (t >> 31n)) & 0xffffffffn) >>> 0
			return [v, out]
		}
		;[z, this.s0] = splitmix32(z)
		;[z, this.s1] = splitmix32(z)
		;[z, this.s2] = splitmix32(z)
		;[z, this.s3] = splitmix32(z)
	}
	private rotl(x: number, k: number) {
		return ((x << k) | (x >>> (32 - k))) >>> 0
	}
	nextU32(): number {
		const result = (this.rotl((this.s0 + this.s3) >>> 0, 7) + this.s0) >>> 0
		const t = (this.s1 << 9) >>> 0
		this.s2 ^= this.s0
		this.s3 ^= this.s1
		this.s1 ^= this.s2
		this.s0 ^= this.s3
		this.s2 ^= t
		this.s3 = this.rotl(this.s3, 11)
		return result >>> 0
	}
	range(upper: number): number {
		if (upper <= 0) return 0
		return Math.floor((this.nextU32() / 2 ** 32) * upper) | 0
	}
}

const ONSETS: ReadonlyArray<[string, number]> = Object.freeze([
	['', 60],
	['n', 50],
	['v', 30],
	['k', 50],
	['m', 40],
	['t', 50],
	['l', 40],
	['r', 40],
	['s', 35],
	['z', 25],
	['x', 20],
	['cr', 12],
	['tr', 12],
	['pr', 12],
	['dr', 10],
	['gr', 10],
	['sh', 18],
	['ch', 18],
	['th', 5],
	['sk', 10],
	['gl', 10],
])

const NUCLEI: ReadonlyArray<[string, number]> = Object.freeze([
	['a', 80],
	['e', 85],
	['i', 70],
	['o', 75],
	['u', 45],
	['y', 20],
	['ai', 25],
	['ei', 22],
	['oi', 18],
	['au', 16],
	['ou', 18],
	['ia', 14],
	['ar', 20],
	['er', 20],
	['or', 20],
	['ir', 15],
	['ur', 12],
])

const CODAE: ReadonlyArray<[string, number]> = Object.freeze([
	['', 120],
	['n', 60],
	['r', 60],
	['s', 55],
	['l', 40],
	['m', 30],
	['k', 35],
	['t', 35],
	['d', 25],
	['th', 10],
	['sh', 16],
	['ch', 16],
	['rd', 12],
	['st', 18],
])

const SUM_ONSETS = ONSETS.reduce((a, [, w]) => a + w, 0)
const SUM_NUCLEI = NUCLEI.reduce((a, [, w]) => a + w, 0)
const SUM_CODAE = CODAE.reduce((a, [, w]) => a + w, 0)

function pickWeighted(
	rng: Xoshiro128,
	tbl: ReadonlyArray<[string, number]>,
	total: number
) {
	let r = rng.nextU32() % total
	for (let i = 0; i < tbl.length; i++) {
		const [s, w] = tbl[i]
		if (r < w) return s
		r -= w
	}
	return tbl[tbl.length - 1][0]
}

class FallbackGenerator {
	private rng: Xoshiro128
	constructor() {
		let hi = 0,
			lo = 0
		if (
			typeof window !== 'undefined' &&
			'crypto' in window &&
			window.crypto.getRandomValues
		) {
			const b = new Uint32Array(2)
			window.crypto.getRandomValues(b)
			hi = b[0] >>> 0
			lo = b[1] >>> 0
		} else {
			hi = (Math.random() * 0xffffffff) >>> 0
			lo = (Math.random() * 0xffffffff) >>> 0
		}
		this.rng = new Xoshiro128(hi, lo)
	}
	generate_username(): string {
		const syllables = 2 + this.rng.range(2)
		let out = ''
		for (let i = 0; i < syllables; i++) {
			const onset = pickWeighted(this.rng, ONSETS, SUM_ONSETS)
			const nuc = pickWeighted(this.rng, NUCLEI, SUM_NUCLEI)
			const coda = pickWeighted(this.rng, CODAE, SUM_CODAE)
			if (i === 0) {
				if (onset)
					out += onset.charAt(0).toUpperCase() + onset.slice(1) + nuc + coda
				else out += nuc.charAt(0).toUpperCase() + nuc.slice(1) + coda
			} else {
				out += onset + nuc + coda
			}
		}
		if (this.rng.range(5) === 0) out += String((this.rng.nextU32() % 999) + 1)
		if (out.endsWith('x') && out.length < 6) out += 'o'
		return out
	}
	generate_multiple(n: number): string[] {
		const m = Math.min(Math.max(n | 0, 0), 50)
		const res = new Array<string>(m)
		for (let i = 0; i < m; i++) res[i] = this.generate_username()
		return res
	}
	free() {}
}

function getGeneratorSync(): {
	generate_username(): string
	generate_multiple?(n: number): any
} {
	return sharedGen ?? new FallbackGenerator()
}

export function useUsernameGenerator() {
	const [ready, setReady] = useState(false)
	const localGenRef = useRef<{
		generate_username(): string
		generate_multiple?(n: number): any
	} | null>(null)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			const ok = await ensureWasmInitialized()
			if (cancelled) return
			localGenRef.current = getGeneratorSync()
			setReady(true)
			if (!ok && process.env.NODE_ENV !== 'production') {
				console.warn('fallback generator active; init error:', lastInitError)
			}
		})()
		return () => {
			cancelled = true
			// sharedGen не освобождаем: нужен для HMR/StrictMode
		}
	}, [])

	const generateUsername = useCallback((): string => {
		try {
			return (localGenRef.current ?? getGeneratorSync()).generate_username()
		} catch {
			localGenRef.current = new FallbackGenerator()
			;(async () => {
				await ensureWasmInitialized()
				localGenRef.current = getGeneratorSync()
			})()
			return localGenRef.current.generate_username()
		}
	}, [])

	const generateMultiple = useCallback((count: number): string[] => {
		try {
			const g = localGenRef.current ?? getGeneratorSync()
			const r = g.generate_multiple ? g.generate_multiple(count) : null
			if (Array.isArray(r)) return r as string[]
			if (r && typeof (r as any).length === 'number')
				return Array.from(r, String)
			return new FallbackGenerator().generate_multiple(count)
		} catch {
			localGenRef.current = new FallbackGenerator()
			;(async () => {
				await ensureWasmInitialized()
				localGenRef.current = getGeneratorSync()
			})()
			return localGenRef.current.generate_multiple!(count)
		}
	}, [])

	return {
		generateUsername,
		generateMultiple,
		loading: !ready,
		isWasmSupported: typeof window !== 'undefined',
	}
}
