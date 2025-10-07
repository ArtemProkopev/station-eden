'use client'

import styles from './page.module.css'

export default function VerifiedBadge() {
	return (
		<span className={styles.verifyPill} title='Email подтверждён'>
			<svg
				className={styles.verifyIcon}
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='3'
				strokeLinecap='round'
				strokeLinejoin='round'
				aria-hidden
			>
				<circle cx='12' cy='12' r='9' />
				<path d='M8 12l2.5 2.5L16 9' />
			</svg>
			ПОДТВЕРЖДЁН
		</span>
	)
}
