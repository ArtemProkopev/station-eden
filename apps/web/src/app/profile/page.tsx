// apps/web/src/app/profile/page.tsx
import { Suspense } from 'react'
import ProfilePageClient from './ProfilePageClient'
import styles from './page.module.css'

export default function ProfilePage() {
	return (
		<Suspense
			fallback={
				<main className={styles.root}>
					<div className={styles.loadingContainer}>
						<div className={styles.loadingSpinner}></div>
						<p>Загрузка профиля...</p>
					</div>
				</main>
			}
		>
			<ProfilePageClient />
		</Suspense>
	)
}
