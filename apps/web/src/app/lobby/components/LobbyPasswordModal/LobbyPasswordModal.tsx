'use client'

import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons'
import { useEffect, useState, type FormEvent } from 'react'
import styles from './LobbyPasswordModal.module.css'

type LobbyPasswordModalProps = {
	isOpen: boolean
	error?: string
	isSubmitting?: boolean
	onSubmit: (password: string) => void
	onCancel: () => void
}

export function LobbyPasswordModal({
	isOpen,
	error = '',
	isSubmitting = false,
	onSubmit,
	onCancel,
}: LobbyPasswordModalProps) {
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [validationError, setValidationError] = useState('')
	const [wasSubmitted, setWasSubmitted] = useState(false)

	useEffect(() => {
		if (!isOpen) return

		setPassword('')
		setShowPassword(false)
		setValidationError('')
		setWasSubmitted(false)

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !isSubmitting) {
				onCancel()
			}
		}

		document.addEventListener('keydown', handleKeyDown)

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, isSubmitting, onCancel])

	if (!isOpen) return null

	const message = wasSubmitted ? validationError || error : ''

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const normalizedPassword = password.trim()
		setWasSubmitted(true)

		if (normalizedPassword.length < 4) {
			setValidationError('Пароль должен содержать минимум 4 символа')
			return
		}

		setValidationError('')
		onSubmit(normalizedPassword)
	}

	return (
		<div className={styles.overlay} role='presentation'>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				aria-labelledby='lobby-password-title'
			>
				<div className={styles.header}>
					<p className={styles.eyebrow}>STATION EDEN</p>
					<h2 id='lobby-password-title' className={styles.title}>
						Вход в лобби
					</h2>
					<p className={styles.subtitle}>
						Для подключения введите пароль комнаты
					</p>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>
					<label className={styles.field}>
						<span className={styles.fieldLabel}>Пароль лобби</span>

						<div className={styles.passwordControl}>
							<input
								className={styles.passwordInput}
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={event => {
									setPassword(event.target.value)
									setValidationError('')
									setWasSubmitted(false)
								}}
								placeholder='Минимум 4 символа'
								minLength={4}
								autoComplete='current-password'
								disabled={isSubmitting}
								autoFocus
							/>

							<button
								type='button'
								className={styles.passwordToggle}
								onClick={() => setShowPassword(prev => !prev)}
								disabled={isSubmitting}
								aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
								title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
							>
								{showPassword ? <EyeOffIcon /> : <EyeIcon />}
							</button>
						</div>
					</label>

					{message && <div className={styles.errorBox}>{message}</div>}

					<div className={styles.actions}>
						<button
							type='button'
							className={styles.cancelButton}
							onClick={onCancel}
							disabled={isSubmitting}
						>
							Назад
						</button>

						<button
							type='submit'
							className={styles.submitButton}
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Проверка' : 'Войти в лобби'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
