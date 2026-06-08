'use client'

import { useEffect } from 'react'
import styles from '../../page.module.css'

interface LeaveGameConfirmModalProps {
	onConfirm: () => void
	onCancel: () => void
}

export default function LeaveGameConfirmModal({
	onConfirm,
	onCancel,
}: LeaveGameConfirmModalProps) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onCancel()
			}
		}

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [onCancel])

	return (
		<div className={styles.leaveConfirmToastArea}>
			<div
				className={styles.leaveConfirmToast}
				role='alertdialog'
				aria-modal='false'
				aria-labelledby='leave-game-toast-title'
			>
				<div className={styles.leaveConfirmToastTop}>
					<div className={styles.leaveConfirmToastIcon}>
						<WarningIcon />
					</div>

					<p
						id='leave-game-toast-title'
						className={styles.leaveConfirmToastTitle}
					>
						Вы уверены, что хотите покинуть игру?
					</p>
				</div>

				<div className={styles.leaveConfirmToastActions}>
					<button
						type='button'
						className={styles.leaveConfirmToastAccept}
						onClick={onConfirm}
					>
						Да
					</button>

					<button
						type='button'
						className={styles.leaveConfirmToastCancel}
						onClick={onCancel}
					>
						Отмена
					</button>
				</div>
			</div>
		</div>
	)
}

function WarningIcon() {
	return (
		<svg
			className={styles.leaveConfirmToastSvg}
			width='18'
			height='18'
			viewBox='0 0 12 12'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
			focusable='false'
		>
			<path
				d='M12 6C12 9.31371 9.31371 12 6 12C2.68629 12 0 9.31371 0 6C0 2.68629 2.68629 0 6 0C9.31371 0 12 2.68629 12 6Z'
				fill='currentColor'
			/>
			<path
				d='M4.99483 3.51873C4.93082 2.92123 5.39906 2.40015 5.99999 2.40015C6.60092 2.40015 7.06916 2.92125 7.00514 3.51876L6.6224 7.09082C6.58831 7.40893 6.31986 7.65015 5.99994 7.65015C5.68001 7.65015 5.41156 7.40892 5.37748 7.09081L4.99483 3.51873Z'
				fill='white'
			/>
			<path
				d='M5.39996 9.00015C5.39996 8.66878 5.66859 8.40015 5.99996 8.40015C6.33133 8.40015 6.59996 8.66878 6.59996 9.00015C6.59996 9.33152 6.33133 9.60015 5.99996 9.60015C5.66859 9.60015 5.39996 9.33152 5.39996 9.00015Z'
				fill='white'
			/>
		</svg>
	)
}
