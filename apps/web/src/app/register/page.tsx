// apps/web/src/app/register/page.tsx
import { Suspense } from 'react'
import RegisterPageClient from './RegisterPageClient'

export default function RegisterPage() {
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
					<div>Загрузка формы регистрации…</div>
				</main>
			}
		>
			<RegisterPageClient />
		</Suspense>
	)
}
