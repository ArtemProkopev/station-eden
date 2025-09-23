// apps/web/src/app/page.tsx
import styles from './home.module.css'

export const metadata = {
	title: 'Station Eden — Главная',
	description: 'Стартовая страница в разработке',
}

export default function HomePage() {
	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<section className={styles.card}>
					<h1 className={styles.title}>Station Eden</h1>
					<p className={styles.subtitle}>
						Стартовая страница на этапе разработки
					</p>
					<div className={styles.big404}>404</div>
				</section>
			</div>
		</>
	)
}
