'use client'

import { useEffect, useState } from 'react'
import styles from '../../page.module.css'

interface GameTransitionLoaderProps {
	title: string
	ariaLabel?: string
}

const DOTS_TICK_MS = 380

export default function GameTransitionLoader({
	title,
	ariaLabel = 'Загрузка игрового состояния Station Eden',
}: GameTransitionLoaderProps) {
	const [dotsCount, setDotsCount] = useState(1)

	useEffect(() => {
		const interval = window.setInterval(() => {
			setDotsCount(current => (current >= 3 ? 1 : current + 1))
		}, DOTS_TICK_MS)

		return () => window.clearInterval(interval)
	}, [])

	const dots = '.'.repeat(dotsCount).padEnd(3, '\u00A0')

	return (
		<section className={styles.preIntroLoader} aria-label={ariaLabel}>
			<div className={styles.preIntroOverlay} aria-hidden='true' />

			<div className={styles.preIntroCenter}>
				<div key={title} className={styles.transitionTitle}>
					<span>{title}</span>

					<span className={styles.transitionDots} aria-hidden='true'>
						<span
							style={{
								display: 'inline-block',
								minWidth: '1.25em',
								textAlign: 'left',
							}}
						>
							{dots}
						</span>
					</span>
				</div>
			</div>
		</section>
	)
}
