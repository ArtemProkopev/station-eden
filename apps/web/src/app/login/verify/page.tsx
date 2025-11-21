// apps/web/src/app/login/verify/page.tsx
import { Suspense } from 'react'
import VerifyEmailCodePageClient from './VerifyEmailCodePageClient'

export default function VerifyEmailCodePage() {
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
					<div>Загрузка проверки кода…</div>
				</main>
			}
		>
			<VerifyEmailCodePageClient />
		</Suspense>
	)
}
