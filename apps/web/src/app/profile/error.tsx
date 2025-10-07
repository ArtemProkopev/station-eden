'use client'
import styles from './page.module.css'

export default function Error({
	error,
}: {
	error: Error & { digest?: string }
}) {
	return (
		<div className={styles.scene}>
			<div className={styles.panel}>
				<div className={styles.grid}>
					<section className={styles.main}>
						<h1 className={styles.title}>Профиль</h1>
						<div className={styles.error}>
							{error?.message || 'Что-то пошло не так'}
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}
