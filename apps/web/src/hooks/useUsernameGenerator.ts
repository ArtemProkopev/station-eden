// apps/web/src/hooks/useUsernameGenerator.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Публичный API wasm-модуля, который генерирует никнеймы.
 * Совместим как с классом UsernameGenerator, так и с функциями из wasm-bindgen.
 */
type WasmModuleApi = {
	default?: (modulePath?: string | URL) => Promise<unknown> | unknown
	init?: (modulePath?: string | URL) => Promise<unknown> | unknown
	UsernameGenerator?: new () => {
		generate_username(): string
		generate_multiple?(count: number): string[] | any
		free?: () => void
	}
	generate_username?: () => string
}

/**
 * Единичная лениво-инициализируемая загрузка wasm-рантайма на весь бандл.
 * Хук использует только этот промис — никакого повторного импорта при каждом маунте.
 */
let wasmLoadOnce: Promise<WasmModuleApi | null> | null = null

async function loadWasmOnce(): Promise<WasmModuleApi | null> {
	if (typeof window === 'undefined') return null
	if (wasmLoadOnce) return wasmLoadOnce

	wasmLoadOnce = (async () => {
		try {
			// Строим абсолютный URL, чтобы Next не пытался резолвить модуль на билде.
			const wasmJsUrl = new URL(
				'/wasm/username_generator.js',
				window.location.origin
			).toString()
			// webpackIgnore гарантирует, что импорт не будет обработан бандлером.
			// @ts-ignore
			const mod: WasmModuleApi = await import(
				/* webpackIgnore: true */ wasmJsUrl
			)

			// Инициализация: некоторые сборки экспортируют default(init), другие — init.
			const initFn = (
				typeof mod.default === 'function' ? mod.default : mod.init
			) as ((arg?: unknown) => Promise<unknown> | unknown) | undefined

			if (initFn) {
				// wasm-bindgen по умолчанию сам найдёт соседний *.wasm через import.meta.url
				await initFn()
			}

			return mod
		} catch (e) {
			// Тихо падаем в фоллбек — хук сам обработает это дальше.
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.warn('WASM module load failed, fallback will be used:', e)
			}
			return null
		}
	})()

	return wasmLoadOnce
}

/** Небольшой быстрый PRNG для фоллбека (xoshiro128++ на 32-битах). */
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
			const out = Number((t ^ (t >> 31n)) & 0xffffffffn)
			return [v, out >>> 0]
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

	/** Возвращает число в диапазоне [0, upper) без смещения. */
	range(upper: number): number {
		// Мультипликативный метод (32x32 -> 64, берём верхние 32)
		return ((((this.nextU32() * upper) >>> 0) / 2 ** 32) * upper) | 0
	}
}

/** Слоговые таблицы и веса для фоллбек-генератора (подобраны под «приятные» сочетания). */
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
	['x', 25],
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
	['x', 25],
])

/** Предрасчитанные суммарные веса — чтобы не складывать каждый раз. */
const SUM_ONSETS = ONSETS.reduce((a, [, w]) => a + w, 0)
const SUM_NUCLEI = NUCLEI.reduce((a, [, w]) => a + w, 0)
const SUM_CODAE = CODAE.reduce((a, [, w]) => a + w, 0)

function pickWeighted(
	rng: Xoshiro128,
	table: ReadonlyArray<[string, number]>,
	total: number
): string {
	let r = rng.nextU32() % total
	// Линейный проход быстрее бинарного поиска на коротких массивах (они маленькие)
	for (let i = 0; i < table.length; i++) {
		const [s, w] = table[i]
		if (r < w) return s
		r -= w
	}
	return table[table.length - 1][0]
}

/** Фоллбек-генератор никнеймов без wasm. */
class FallbackGenerator {
	private rng: Xoshiro128

	constructor() {
		// Сидим из crypto.getRandomValues, иначе из Math.random (реже).
		let hi = 0,
			lo = 0
		if (
			typeof window !== 'undefined' &&
			'crypto' in window &&
			(window.crypto as Crypto).getRandomValues
		) {
			const buf = new Uint32Array(2)
			;(window.crypto as Crypto).getRandomValues(buf)
			hi = buf[0] >>> 0
			lo = buf[1] >>> 0
		} else {
			hi = (Math.random() * 0xffffffff) >>> 0
			lo = (Math.random() * 0xffffffff) >>> 0
		}
		this.rng = new Xoshiro128(hi, lo)
	}

	generate_username(): string {
		const syllables = 2 + (this.rng.range(2) | 0) // 2 или 3
		// Приблизительная оценка ёмкости строки для минимальных реаллокаций
		let out = ''

		for (let i = 0; i < syllables; i++) {
			const onset = pickWeighted(this.rng, ONSETS, SUM_ONSETS)
			const nuc = pickWeighted(this.rng, NUCLEI, SUM_NUCLEI)
			const coda = pickWeighted(this.rng, CODAE, SUM_CODAE)

			if (i === 0) {
				// Капитализация первой буквы «красиво»: учитываем onset или ядро
				if (onset.length > 0) {
					const f = onset.charAt(0).toUpperCase()
					out += f + onset.slice(1) + nuc + coda
				} else {
					const f = nuc.charAt(0).toUpperCase()
					out += f + nuc.slice(1) + coda
				}
			} else {
				out += onset + nuc + coda
			}
		}

		// 20% шанс добавить аккуратный числовой суффикс
		if ((this.rng.range(5) | 0) === 0) {
			const n = (this.rng.nextU32() % 999) + 1
			out += String(n)
		}

		// Косметика для слишком коротких окончаний на 'x'
		if (out.endsWith('x') && out.length < 6) out += 'o'
		return out
	}

	generate_multiple(count: number): string[] {
		const n = Math.min(Math.max(count | 0, 0), 50)
		const arr = new Array<string>(n)
		for (let i = 0; i < n; i++) arr[i] = this.generate_username()
		return arr
	}

	free() {
		/* noop */
	}
}

type GeneratorLike = {
	generate_username(): string
	generate_multiple?(count: number): string[] | any
	free?: () => void
}

/**
 * Основной хук. Возвращает функции генерации и статус загрузки.
 *
 * Поведение:
 * - на сервере ничего не делает (loading=false, но используется фоллбек при вызове функций)
 * - на клиенте один раз грузит wasm-рантайм и создаёт экземпляр генератора
 * - если wasm недоступен/упал — плавно скатывается на быстрый фоллбек
 */
export function useUsernameGenerator() {
	const genRef = useRef<GeneratorLike | null>(null)
	const [ready, setReady] = useState(false)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			if (typeof window === 'undefined') {
				// На сервере не инициируем загрузку
				genRef.current = genRef.current ?? new FallbackGenerator()
				if (!cancelled) setReady(true)
				return
			}

			const mod = await loadWasmOnce()
			if (cancelled) return

			if (mod && typeof mod.UsernameGenerator === 'function') {
				try {
					genRef.current?.free?.()
					genRef.current = new mod.UsernameGenerator!()
					setReady(true)
					return
				} catch {
					// если инстанс не собрался — фоллбек ниже
				}
			}

			// Фоллбек
			genRef.current?.free?.()
			genRef.current = new FallbackGenerator()
			setReady(true)
		})()

		return () => {
			cancelled = true
			// Не чистим genRef: переиспользование инстанса выгодно при повторном маунте.
			// Но если у инстанса есть free — вызовем, чтобы не протекать в тестах/SPA-навигации.
			genRef.current?.free?.()
		}
	}, [])

	const generateUsername = useCallback((): string => {
		const g = genRef.current
		if (g && typeof g.generate_username === 'function')
			return g.generate_username()
		// Если что-то пошло не так — создаём быстрый локальный фоллбек на лету.
		return new FallbackGenerator().generate_username()
	}, [])

	const generateMultiple = useCallback((count: number): string[] => {
		const g = genRef.current
		if (g?.generate_multiple) {
			const result = g.generate_multiple(count)
			// wasm-bindgen может вернуть JsValue/Array — нормализуем к string[]
			return Array.isArray(result)
				? (result as string[])
				: Array.from(result ?? [], String)
		}
		return new FallbackGenerator().generate_multiple(count)
	}, [])

	return {
		generateUsername,
		generateMultiple,
		loading: !ready,
		isWasmSupported: typeof window !== 'undefined',
	}
}
