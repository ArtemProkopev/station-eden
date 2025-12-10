// apps/web/src/app/login/forgot/page.tsx
import { Suspense } from 'react'
import ForgotPasswordPageClient from './ForgotPasswordPageClient'

export default function ForgotPasswordPage() {
	return (
		<Suspense
			fallback={
				<main
					style={{
						minHeight: '100vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<div>Загрузка…</div>
				</main>
			}
		>
			<ForgotPasswordPageClient />
		</Suspense>
	)
}
