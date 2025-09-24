// apps/web/src/app/page.tsx
import styles from './home.module.css'

export const metadata = {
	title: 'Station Eden — Главная',
	description: 'Добро пожаловать на Station Eden',
}

export default function HomePage() {
	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<section className={styles.card}>
					<h1 className={styles.title}>Station Eden</h1>
					<p className={styles.subtitle}>
						Добро пожаловать на главную страницу
					</p>
					<p className={styles.welcomeText}>
						Сайт находится в разработке. Скоро здесь появится больше контента! (тест)
					</p>
				</section>
			</div>
		</>
	)
}
