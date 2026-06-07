'use client'

import type { CreateLobbyDto, LobbyVisibility } from '@station-eden/shared'
import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import styles from './CreateLobbyModal.module.css'

type LobbyOption = {
	value: LobbyVisibility
	title: string
	description: string
}

const LOBBY_OPTIONS: LobbyOption[] = [
	{
		value: 'public',
		title: 'Публичное лобби',
		description:
			'Видно в списке открытых лобби. Любой игрок может подключиться.',
	},
	{
		value: 'password',
		title: 'Лобби по паролю',
		description:
			'Видно в списке открытых лобби, но для входа потребуется пароль.',
	},
	{
		value: 'hidden_password',
		title: 'Скрытое лобби по паролю',
		description:
			'Не отображается в списке открытых лобби. Подключение только по коду/ссылке и паролю.',
	},
]

type CreateLobbyModalProps = {
	isOpen: boolean
	isSubmitting?: boolean
	submitError?: string
	onClose: () => void
	onCreate: (payload: CreateLobbyDto) => Promise<void>
}

function needsPassword(visibility: LobbyVisibility) {
	return visibility === 'password' || visibility === 'hidden_password'
}

export function CreateLobbyModal({
	isOpen,
	isSubmitting = false,
	submitError = '',
	onClose,
	onCreate,
}: CreateLobbyModalProps) {
	const [visibility, setVisibility] = useState<LobbyVisibility>('public')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [validationError, setValidationError] = useState('')

	const passwordRequired = needsPassword(visibility)
	const errorMessage = validationError || submitError

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !isSubmitting) {
				onClose()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = ''
		}
	}, [isOpen, isSubmitting, onClose])

	useEffect(() => {
		if (!isOpen) return

		setVisibility('public')
		setPassword('')
		setShowPassword(false)
		setValidationError('')
	}, [isOpen])

	useEffect(() => {
		setValidationError('')

		if (!passwordRequired) {
			setPassword('')
			setShowPassword(false)
		}
	}, [passwordRequired])

	if (!isOpen) return null

	const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget && !isSubmitting) {
			onClose()
		}
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const normalizedPassword = password.trim()

		if (passwordRequired && normalizedPassword.length < 4) {
			setValidationError('Пароль должен содержать минимум 4 символа.')
			return
		}

		setValidationError('')

		await onCreate({
			visibility,
			...(passwordRequired ? { password: normalizedPassword } : {}),
		})
	}

	return (
		<div
			className={styles.overlay}
			onMouseDown={handleOverlayMouseDown}
			role='presentation'
		>
			<div
				className={styles.modal}
				role='dialog'
				aria-modal='true'
				aria-labelledby='create-lobby-title'
			>
				<div className={styles.header}>
					<div className={styles.headerCopy}>
						<p className={styles.eyebrow}>STATION EDEN</p>
						<h2 id='create-lobby-title' className={styles.title}>
							Создание лобби
						</h2>
						<p className={styles.subtitle}>
							Выберите режим доступа для игровой сессии и при необходимости
							задайте пароль для входа игроков.
						</p>
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						disabled={isSubmitting}
						aria-label='Закрыть окно создания лобби'
					>
						<span className={styles.closeIcon} aria-hidden='true' />
					</button>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>
					<div className={styles.optionsList}>
						{LOBBY_OPTIONS.map(option => {
							const isSelected = option.value === visibility
							const showInlinePassword =
								isSelected && needsPassword(option.value)

							return (
								<label
									key={option.value}
									className={`${styles.optionCard} ${
										isSelected ? styles.optionCardSelected : ''
									}`}
								>
									<input
										className={styles.radioInput}
										type='radio'
										name='lobbyVisibility'
										value={option.value}
										checked={isSelected}
										onChange={() => setVisibility(option.value)}
										disabled={isSubmitting}
									/>

									<span className={styles.optionIndicator} aria-hidden='true'>
										<span className={styles.optionIndicatorDot} />
									</span>

									<div className={styles.optionBody}>
										<div className={styles.optionTopRow}>
											<span className={styles.optionTitle}>{option.title}</span>

											{isSelected && (
												<span className={styles.optionBadge}>Выбрано</span>
											)}
										</div>

										<span className={styles.optionDescription}>
											{option.description}
										</span>

										{showInlinePassword && (
											<div className={styles.inlineSection}>
												<span className={styles.fieldLabel}>Пароль лобби</span>

												<div className={styles.passwordControl}>
													<input
														className={styles.passwordInput}
														type={showPassword ? 'text' : 'password'}
														value={password}
														onChange={event => setPassword(event.target.value)}
														placeholder='Минимум 4 символа'
														minLength={4}
														autoComplete='new-password'
														disabled={isSubmitting}
													/>

													<button
														type='button'
														className={styles.passwordToggle}
														onClick={event => {
															event.preventDefault()
															event.stopPropagation()
															setShowPassword(prev => !prev)
														}}
														disabled={isSubmitting}
													>
														{showPassword ? 'Скрыть' : 'Показать'}
													</button>
												</div>
											</div>
										)}
									</div>
								</label>
							)
						})}
					</div>

					{errorMessage && (
						<div className={styles.errorBox} aria-live='polite'>
							{errorMessage}
						</div>
					)}

					<div className={styles.actions}>
						<button
							type='button'
							className={styles.cancelButton}
							onClick={onClose}
							disabled={isSubmitting}
						>
							Отмена
						</button>

						<button
							type='submit'
							className={styles.createButton}
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Создание...' : 'Создать лобби'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
