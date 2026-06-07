import styles from '../../page.module.css'

interface GameTransitionLoaderProps {
	title: string
	ariaLabel?: string
}

export default function GameTransitionLoader({
	title,
	ariaLabel = 'Загрузка игрового состояния Station Eden',
}: GameTransitionLoaderProps) {
	return (
		<section className={styles.preIntroLoader} aria-label={ariaLabel}>
			<div className={styles.preIntroOverlay} aria-hidden='true' />

			<div className={styles.preIntroCenter}>
				<div key={title} className={styles.transitionTitle}>
					<span>{title}</span>

					<span className={styles.transitionDots} aria-hidden='true'>
						<span className={styles.transitionDot} />
						<span className={styles.transitionDot} />
						<span className={styles.transitionDot} />
					</span>
				</div>
			</div>
		</section>
	)
}
