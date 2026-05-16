type WeightedPart = readonly [value: string, weight: number]

const ONSETS = [
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
] as const satisfies readonly WeightedPart[]

const NUCLEI = [
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
] as const satisfies readonly WeightedPart[]

const CODAE = [
	['', 120],
	['n', 60],
	['r', 60],
	['s', 55],
	['x', 50],
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
] as const satisfies readonly WeightedPart[]

const SUM_ONSETS = sumWeights(ONSETS)
const SUM_NUCLEI = sumWeights(NUCLEI)
const SUM_CODAE = sumWeights(CODAE)

function sumWeights(items: readonly WeightedPart[]): number {
	return items.reduce((sum, [, weight]) => sum + weight, 0)
}

function getSeedPair(): readonly [number, number] {
	const cryptoApi = globalThis.crypto

	if (cryptoApi?.getRandomValues) {
		const values = new Uint32Array(2)
		cryptoApi.getRandomValues(values)

		return [values[0] >>> 0, values[1] >>> 0]
	}

	return [
		Math.floor(Math.random() * 0xffffffff) >>> 0,
		Math.floor(Math.random() * 0xffffffff) >>> 0,
	]
}

function splitmix32(seed: bigint): readonly [bigint, number] {
	let z = BigInt.asUintN(64, seed + 0x9e3779b97f4a7c15n)

	let mixed = z
	mixed = BigInt.asUintN(64, (mixed ^ (mixed >> 30n)) * 0xbf58476d1ce4e5b9n)
	mixed = BigInt.asUintN(64, (mixed ^ (mixed >> 27n)) * 0x94d049bb133111ebn)

	const value = Number((mixed ^ (mixed >> 31n)) & 0xffffffffn) >>> 0

	return [z, value]
}

class Xoshiro128 {
	private s0: number
	private s1: number
	private s2: number
	private s3: number

	constructor(seedHi: number, seedLo: number) {
		let seed = (BigInt(seedHi >>> 0) << 32n) | BigInt(seedLo >>> 0)

		;[seed, this.s0] = splitmix32(seed)
		;[seed, this.s1] = splitmix32(seed)
		;[seed, this.s2] = splitmix32(seed)
		;[seed, this.s3] = splitmix32(seed)
	}

	private rotl(value: number, shift: number): number {
		return ((value << shift) | (value >>> (32 - shift))) >>> 0
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
		if (!Number.isFinite(upper) || upper <= 0) return 0

		return Math.floor((this.nextU32() / 0x100000000) * upper)
	}
}

function pickWeighted(
	rng: Xoshiro128,
	items: readonly WeightedPart[],
	total: number,
): string {
	let cursor = rng.nextU32() % total

	for (const [value, weight] of items) {
		if (cursor < weight) return value

		cursor -= weight
	}

	return items.at(-1)?.[0] ?? ''
}

function capitalizeFirst(value: string): string {
	if (!value) return ''

	return value.charAt(0).toUpperCase() + value.slice(1)
}

function normalizeCount(count: number): number {
	if (!Number.isFinite(count)) return 0

	return Math.min(Math.max(Math.trunc(count), 0), 50)
}

export class UsernameGenerator {
	private readonly rng: Xoshiro128

	constructor() {
		const [seedHi, seedLo] = getSeedPair()

		this.rng = new Xoshiro128(seedHi, seedLo)
	}

	generate_username(): string {
		const syllables = 2 + this.rng.range(2)
		let username = ''

		for (let index = 0; index < syllables; index++) {
			const onset = pickWeighted(this.rng, ONSETS, SUM_ONSETS)
			const nucleus = pickWeighted(this.rng, NUCLEI, SUM_NUCLEI)
			const coda = pickWeighted(this.rng, CODAE, SUM_CODAE)

			if (index === 0) {
				if (onset) {
					username += capitalizeFirst(onset)
					username += nucleus
				} else {
					username += capitalizeFirst(nucleus)
				}
			} else {
				username += onset
				username += nucleus
			}

			username += coda
		}

		if (this.rng.range(5) === 0) {
			username += String((this.rng.nextU32() % 999) + 1)
		}

		if (username.endsWith('x') && username.length < 6) {
			username += 'o'
		}

		return username
	}

	generate_multiple(count: number): string[] {
		const length = normalizeCount(count)
		const result: string[] = []

		for (let index = 0; index < length; index++) {
			result.push(this.generate_username())
		}

		return result
	}

	free(): void {
		// Совместимость со старым WASM API. В TS-версии освобождать нечего.
	}
}

export function generate_username(): string {
	return new UsernameGenerator().generate_username()
}

export function generateUsername(): string {
	return generate_username()
}

export function generateMultiple(count: number): string[] {
	return new UsernameGenerator().generate_multiple(count)
}
