// apps/web/src/components/ui/TwinklingStars/TwinklingStars.tsx
'use client'

import React, { useMemo } from 'react'
import styles from './TwinklingStars.module.css'

/** детерминированный PRNG */
function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
/** простейший хэш строки в 32-битное число */
function hashSeed(seed: string) {
	let h = 2166136261
	for (let i = 0; i < seed.length; i++)
		h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
	return h >>> 0
}

type Star = {
	left: string
	top: string
	delay?: string
	duration?: string
	filter?: string
}

type Props = {
	/** общий сид, чтобы на сервере и клиенте вышло идентично */
	seed?: string
	smallCount?: number
	mediumCount?: number
	largeCount?: number
	specialCount?: number
	shootingCount?: number
}

export const TwinklingStars: React.FC<Props> = ({
	seed = 'twinkle', // можешь подставлять 'user:<id>' чтобы у каждого была своя «карта звёзд»
	smallCount = 80,
	mediumCount = 40,
	largeCount = 20,
	specialCount = 15,
	shootingCount = 8,
}) => {
	const { small, medium, large, special, shooting } = useMemo(() => {
		// делаем независимые генераторы для слоёв, чтобы распределения не «таскались» друг за другом
		const rndSmall = mulberry32(hashSeed(`${seed}|small`))
		const rndMedium = mulberry32(hashSeed(`${seed}|medium`))
		const rndLarge = mulberry32(hashSeed(`${seed}|large`))
		const rndSpecial = mulberry32(hashSeed(`${seed}|special`))
		const rndShoot = mulberry32(hashSeed(`${seed}|shooting`))

		const mk = (
			n: number,
			rnd: () => number,
			opts: {
				delayMax?: number
				durMin?: number
				durRand?: number
				hue?: boolean
				leftMin?: number
				leftMax?: number
				topMin?: number
				topMax?: number
			}
		): Star[] => {
			const {
				delayMax = 0,
				durMin = 0,
				durRand = 0,
				hue = false,
				leftMin = 0,
				leftMax = 100,
				topMin = 0,
				topMax = 100,
			} = opts
			const out: Star[] = []
			for (let i = 0; i < n; i++) {
				const left = (leftMin + rnd() * (leftMax - leftMin)).toFixed(6) + '%'
				const top = (topMin + rnd() * (topMax - topMin)).toFixed(6) + '%'
				const delay = delayMax ? (rnd() * delayMax).toFixed(6) + 's' : undefined
				const duration = durRand
					? (durMin + rnd() * durRand).toFixed(6) + 's'
					: undefined
				const filter = hue
					? `hue-rotate(${(rnd() * 360).toFixed(2)}deg)`
					: undefined
				out.push({ left, top, delay, duration, filter })
			}
			return out
		}

		return {
			small: mk(smallCount, rndSmall, { delayMax: 8, durMin: 3, durRand: 4 }),
			medium: mk(mediumCount, rndMedium, {
				delayMax: 6,
				durMin: 4,
				durRand: 5,
			}),
			large: mk(largeCount, rndLarge, { delayMax: 4, durMin: 5, durRand: 6 }),
			special: mk(specialCount, rndSpecial, {
				delayMax: 10,
				durMin: 6,
				durRand: 8,
				hue: true,
			}),
			// для «падающих» ограничим зону старта: left [10..90]%, top [0..30]%
			shooting: mk(shootingCount, rndShoot, {
				leftMin: 10,
				leftMax: 90,
				topMin: 0,
				topMax: 30,
				delayMax: 30,
			}),
		}
	}, [seed, smallCount, mediumCount, largeCount, specialCount, shootingCount])

	return (
		<div className={styles.starsContainer} aria-hidden='true'>
			{/* Мелкие звезды */}
			<div className={styles.smallStars}>
				{small.map((s, i) => (
					<div
						key={`small-${i}`}
						className={`${styles.star} ${styles.smallStar}`}
						style={{
							left: s.left,
							top: s.top,
							animationDelay: s.delay,
							animationDuration: s.duration,
						}}
					/>
				))}
			</div>

			{/* Средние звезды */}
			<div className={styles.mediumStars}>
				{medium.map((s, i) => (
					<div
						key={`medium-${i}`}
						className={`${styles.star} ${styles.mediumStar}`}
						style={{
							left: s.left,
							top: s.top,
							animationDelay: s.delay,
							animationDuration: s.duration,
						}}
					/>
				))}
			</div>

			{/* Крупные звезды */}
			<div className={styles.largeStars}>
				{large.map((s, i) => (
					<div
						key={`large-${i}`}
						className={`${styles.star} ${styles.largeStar}`}
						style={{
							left: s.left,
							top: s.top,
							animationDelay: s.delay,
							animationDuration: s.duration,
						}}
					/>
				))}
			</div>

			{/* Особые цветные звезды */}
			<div className={styles.specialStars}>
				{special.map((s, i) => (
					<div
						key={`special-${i}`}
						className={`${styles.star} ${styles.specialStar}`}
						style={{
							left: s.left,
							top: s.top,
							animationDelay: s.delay,
							animationDuration: s.duration,
							filter: s.filter,
						}}
					/>
				))}
			</div>

			{/* Падающие звезды */}
			<div className={styles.shootingStars}>
				{shooting.map((s, i) => (
					<div
						key={`shooting-${i}`}
						className={styles.shootingStar}
						style={{
							left: s.left,
							top: s.top,
							animationDelay: s.delay,
						}}
					/>
				))}
			</div>
		</div>
	)
}
