// apps/web/src/app/not-found.tsx
import Link from 'next/link'
import styles from './not-found.module.css'

export const metadata = {
	title: 'Station Eden — Страница не найдена',
	description: 'Запрашиваемая страница не существует',
}

export default function NotFound() {
	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<section className={styles.card}>
					<div className={styles.header}>
						<h1 className={styles.title}>Station Eden</h1>
					</div>

					<div className={styles.big404}>404</div>

					<div className={styles.notice}>Страница не найдена</div>

					<p className={styles.description}>
						Запрашиваемая страница не существует или была перемещена
					</p>

					<Link href='/' className={styles.button}>
						Вернуться на главную
					</Link>
				</section>
			</div>
		</div>
	)
}
