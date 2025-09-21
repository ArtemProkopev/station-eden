// apps/web/src/components/auth/GoogleAuthButton.tsx
'use client'

import styles from './GoogleAuthButton.module.css'

type Props = {
	label?: string
	mode?: 'login' | 'register'
}

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

export default function GoogleAuthButton({
	label = 'Войти с Google',
	mode = 'login',
}: Props) {
	const href = `${API}/auth/google?mode=${mode}`

	return (
		<div className={styles.wrap}>
			<a
				className={styles.button}
				href={href}
				rel='nofollow'
				aria-label={label}
			>
				{/* фирменное многоцветное G */}
				<svg
					className={styles.icon}
					width='18'
					height='18'
					viewBox='0 0 18 18'
					aria-hidden='true'
				>
					<path
						fill='#4285F4'
						d='M17.64 9.204c0-.638-.057-1.252-.163-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.796 2.716v2.257h2.904c1.7-1.565 2.692-3.868 2.692-6.613Z'
					/>
					<path
						fill='#34A853'
						d='M9 18c2.43 0 4.47-.806 5.96-2.183l-2.904-2.257c-.806.54-1.84.86-3.056.86-2.35 0-4.34-1.586-5.05-3.718H.94v2.334A9 9 0 0 0 9 18Z'
					/>
					<path
						fill='#FBBC05'
						d='M3.95 10.702A5.4 5.4 0 0 1 3.67 9c0-.59.102-1.164.28-1.702V4.964H.94A9 9 0 0 0 0 9c0 1.46.35 2.84.94 4.036l3.01-2.334Z'
					/>
					<path
						fill='#EA4335'
						d='M9 3.58c1.32 0 2.5.454 3.43 1.346l2.571-2.571C13.47.912 11.43 0 9 0A9 9 0 0 0 .94 4.964l3.01 2.334C4.66 5.166 6.65 3.58 9 3.58Z'
					/>
				</svg>
				<span className={styles.text}>{label}</span>
			</a>
		</div>
	)
}
