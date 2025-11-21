// apps/web/src/app/login/page.tsx
import { Suspense } from 'react'
import LoginPageClient from './LoginPageClient'
import styles from './page.module.css'

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<main className={styles.page}>
					<div className={styles.container}>
						<section className={styles.card}>
							<h1 className={styles.title}>Вход</h1>
							<div className={styles.loadingSpinner} />
						</section>
					</div>
				</main>
			}
		>
			<LoginPageClient />
		</Suspense>
	)
}
