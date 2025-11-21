// apps/web/src/app/settings/page.tsx
import { Suspense } from 'react'
import SettingsPageClient from './SettingsPageClient'
import styles from './page.module.css'

export default function SettingsPage() {
	return (
		<Suspense
			fallback={
				<main className={styles.root}>
					<div className={styles.loadingContainer}>
						<div className={styles.loadingSpinner}></div>
						<p>Загрузка настроек...</p>
					</div>
				</main>
			}
		>
			<SettingsPageClient />
		</Suspense>
	)
}
