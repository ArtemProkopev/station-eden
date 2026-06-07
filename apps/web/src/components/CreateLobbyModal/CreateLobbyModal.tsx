'use client'

import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons'
import type {
	CreateLobbyDto,
	LobbyVisibility,
	PublicLobbyInfo,
} from '@station-eden/shared'
import {
	useCallback,
	useEffect,
	useState,
	type FormEvent,
	type MouseEvent,
} from 'react'
import { api } from '../../lib/api'
import styles from './CreateLobbyModal.module.css'

type LobbyOption = {
	value: LobbyVisibility
	title: string
	description: string
}

type ModalTab = 'create' | 'open'

const LOBBY_OPTIONS: LobbyOption[] = [
	{
		value: 'public',
		title: 'Публичное лобби',
		description:
			'Видно в списке активных лобби. Любой игрок может подключиться.',
	},
	{
		value: 'password',
		title: 'Лобби по паролю',
		description:
			'Видно в списке активных лобби, но для входа потребуется пароль.',
	},
	{
		value: 'hidden_password',
		title: 'Скрытое лобби по паролю',
		description:
			'Не отображается в списке активных лобби. Подключение только по коду/ссылке и паролю.',
	},
]

type CreateLobbyModalProps = {
	isOpen: boolean
	isSubmitting?: boolean
	submitError?: string
	onClose: () => void
	onCreate: (payload: CreateLobbyDto) => Promise<void>
	onJoinLobby: (lobbyId: string, password?: string) => Promise<void> | void
}

function needsPassword(visibility: LobbyVisibility) {
	return visibility === 'password' || visibility === 'hidden_password'
}

function normalizeOpenLobbies(value: unknown): PublicLobbyInfo[] {
	if (!Array.isArray(value)) return []

	return value
		.filter((item): item is PublicLobbyInfo => {
			if (!item || typeof item !== 'object') return false

			const lobby = item as Record<string, unknown>

			return (
				typeof lobby.lobbyId === 'string' &&
				typeof lobby.playersCount === 'number' &&
				typeof lobby.maxPlayers === 'number' &&
				typeof lobby.gameMode === 'string' &&
				(lobby.visibility === 'public' || lobby.visibility === 'password') &&
				typeof lobby.hasPassword === 'boolean' &&
				typeof lobby.createdAt === 'string'
			)
		})
		.sort((a, b) => {
			const first = new Date(a.createdAt).getTime()
			const second = new Date(b.createdAt).getTime()

			return second - first
		})
}

function formatRuPlural(value: number, one: string, few: string, many: string) {
	const mod10 = value % 10
	const mod100 = value % 100

	if (mod10 === 1 && mod100 !== 11) return one
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few

	return many
}

function formatLobbyAge(createdAt: string, now: number) {
	const createdTime = new Date(createdAt).getTime()

	if (!Number.isFinite(createdTime)) {
		return 'недавно'
	}

	const diffMinutes = Math.max(0, Math.floor((now - createdTime) / 60_000))

	if (diffMinutes < 1) {
		return 'только что'
	}

	if (diffMinutes < 60) {
		return `${diffMinutes} ${formatRuPlural(
			diffMinutes,
			'минуту',
			'минуты',
			'минут',
		)} назад`
	}

	const diffHours = Math.floor(diffMinutes / 60)

	if (diffHours < 24) {
		return `${diffHours} ${formatRuPlural(
			diffHours,
			'час',
			'часа',
			'часов',
		)} назад`
	}

	const diffDays = Math.floor(diffHours / 24)

	return `${diffDays} ${formatRuPlural(diffDays, 'день', 'дня', 'дней')} назад`
}

export function CreateLobbyModal({
	isOpen,
	isSubmitting = false,
	submitError = '',
	onClose,
	onCreate,
	onJoinLobby,
}: CreateLobbyModalProps) {
	const [activeTab, setActiveTab] = useState<ModalTab>('create')

	const [visibility, setVisibility] = useState<LobbyVisibility>('public')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [validationError, setValidationError] = useState('')

	const [openLobbies, setOpenLobbies] = useState<PublicLobbyInfo[]>([])
	const [isOpenLobbiesLoading, setIsOpenLobbiesLoading] = useState(false)
	const [openLobbiesError, setOpenLobbiesError] = useState('')
	const [joiningLobbyId, setJoiningLobbyId] = useState('')
	const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({})
	const [showJoinPasswords, setShowJoinPasswords] = useState<
		Record<string, boolean>
	>({})
	const [joinErrors, setJoinErrors] = useState<Record<string, string>>({})
	const [nowTick, setNowTick] = useState(() => Date.now())

	const passwordRequired = needsPassword(visibility)
	const errorMessage = validationError || submitError

	const loadOpenLobbies = useCallback(async () => {
		setIsOpenLobbiesLoading(true)
		setOpenLobbiesError('')

		try {
			const lobbies = await api.openLobbies()
			setOpenLobbies(normalizeOpenLobbies(lobbies))
			setNowTick(Date.now())
		} catch (error) {
			console.error(error)
			setOpenLobbiesError('Не удалось загрузить список активных лобби.')
		} finally {
			setIsOpenLobbiesLoading(false)
		}
	}, [])

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !isSubmitting && !joiningLobbyId) {
				onClose()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = ''
		}
	}, [isOpen, isSubmitting, joiningLobbyId, onClose])

	useEffect(() => {
		if (!isOpen) return

		setActiveTab('create')
		setVisibility('public')
		setPassword('')
		setShowPassword(false)
		setValidationError('')
		setOpenLobbies([])
		setOpenLobbiesError('')
		setJoiningLobbyId('')
		setJoinPasswords({})
		setShowJoinPasswords({})
		setJoinErrors({})
		setNowTick(Date.now())
	}, [isOpen])

	useEffect(() => {
		setValidationError('')

		if (!passwordRequired) {
			setPassword('')
			setShowPassword(false)
		}
	}, [passwordRequired])

	useEffect(() => {
		if (!isOpen || activeTab !== 'open') return
		loadOpenLobbies()
	}, [isOpen, activeTab, loadOpenLobbies])

	useEffect(() => {
		if (!isOpen || activeTab !== 'open') return

		setNowTick(Date.now())

		const intervalId = window.setInterval(() => {
			setNowTick(Date.now())
		}, 30_000)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [isOpen, activeTab])

	if (!isOpen) return null

	const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
		if (
			event.target === event.currentTarget &&
			!isSubmitting &&
			!joiningLobbyId
		) {
			onClose()
		}
	}

	const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

	const handleJoinPasswordChange = (lobbyId: string, value: string) => {
		setJoinPasswords(prev => ({ ...prev, [lobbyId]: value }))
		setJoinErrors(prev => ({ ...prev, [lobbyId]: '' }))
	}

	const handleJoinLobbyClick = async (lobby: PublicLobbyInfo) => {
		const currentPassword = joinPasswords[lobby.lobbyId]?.trim() || ''

		if (lobby.hasPassword && currentPassword.length < 4) {
			setJoinErrors(prev => ({
				...prev,
				[lobby.lobbyId]: 'Введите пароль минимум из 4 символов.',
			}))
			return
		}

		setJoiningLobbyId(lobby.lobbyId)
		setJoinErrors(prev => ({ ...prev, [lobby.lobbyId]: '' }))

		try {
			await onJoinLobby(
				lobby.lobbyId,
				lobby.hasPassword ? currentPassword : undefined,
			)
		} catch (error) {
			console.error(error)
			setJoinErrors(prev => ({
				...prev,
				[lobby.lobbyId]: 'Не удалось подключиться к лобби.',
			}))
		} finally {
			setJoiningLobbyId('')
		}
	}

	const renderCreateTab = () => (
		<form className={styles.form} onSubmit={handleCreateSubmit}>
			<div className={styles.optionsList}>
				{LOBBY_OPTIONS.map(option => {
					const isSelected = option.value === visibility
					const showInlinePassword = isSelected && needsPassword(option.value)
					const passwordToggleLabel = showPassword
						? 'Скрыть пароль'
						: 'Показать пароль'

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
											<div className={styles.passwordField}>
												<input
													className={`${styles.passwordInput} ${styles.passwordInputWithToggle}`}
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
													title={passwordToggleLabel}
													aria-label={passwordToggleLabel}
												>
													{showPassword ? <EyeOffIcon /> : <EyeIcon />}
												</button>
											</div>
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
					type='submit'
					className={styles.createButton}
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Создание...' : 'Создать лобби'}
				</button>
			</div>
		</form>
	)

	const renderOpenLobbiesTab = () => (
		<div className={styles.form}>
			<div className={styles.openToolbar}>
				<div>
					<h3 className={styles.openTitle}>Активные лобби</h3>
					<p className={styles.openSubtitle}>
						Публичные лобби доступны сразу. Для лобби с замком нужен пароль.
					</p>
				</div>

				<button
					type='button'
					className={styles.refreshButton}
					onClick={loadOpenLobbies}
					disabled={isOpenLobbiesLoading}
				>
					{isOpenLobbiesLoading ? 'Обновление...' : 'Обновить'}
				</button>
			</div>

			{openLobbiesError && (
				<div className={styles.errorBox}>{openLobbiesError}</div>
			)}

			{isOpenLobbiesLoading && (
				<div className={styles.emptyState}>Сканирование активных лобби...</div>
			)}

			{!isOpenLobbiesLoading && openLobbies.length === 0 && (
				<div className={styles.emptyState}>
					<span className={styles.emptyTitle}>Активных лобби пока нет</span>
					<span className={styles.emptyText}>
						Создайте первое лобби или попросите друга отправить код/ссылку.
					</span>
				</div>
			)}

			{!isOpenLobbiesLoading && openLobbies.length > 0 && (
				<div className={styles.lobbiesList}>
					{openLobbies.map(lobby => {
						const passwordValue = joinPasswords[lobby.lobbyId] || ''
						const isPasswordVisible = !!showJoinPasswords[lobby.lobbyId]
						const isJoining = joiningLobbyId === lobby.lobbyId
						const lobbyAge = formatLobbyAge(lobby.createdAt, nowTick)
						const joinPasswordToggleLabel = isPasswordVisible
							? 'Скрыть пароль'
							: 'Показать пароль'

						return (
							<div key={lobby.lobbyId} className={styles.lobbyCard}>
								<div className={styles.lobbyMain}>
									<div className={styles.lobbyInfo}>
										<div className={styles.lobbyTitleRow}>
											<span className={styles.lobbyTitle}>
												{lobby.hasPassword
													? 'Лобби по паролю'
													: 'Публичное лобби'}
											</span>

											<div className={styles.lobbyBadges}>
												<span className={styles.lobbyAge}>
													Создано {lobbyAge}
												</span>

												{lobby.hasPassword && (
													<span className={styles.lockBadge}>Пароль</span>
												)}
											</div>
										</div>

										<span className={styles.lobbyMeta}>
											{lobby.playersCount}/{lobby.maxPlayers} игроков ·{' '}
											{lobby.gameMode}
										</span>
									</div>
								</div>

								{lobby.hasPassword && (
									<div className={styles.joinPasswordControl}>
										<div className={styles.passwordField}>
											<input
												className={`${styles.passwordInput} ${styles.passwordInputWithToggle}`}
												type={isPasswordVisible ? 'text' : 'password'}
												value={passwordValue}
												onChange={event =>
													handleJoinPasswordChange(
														lobby.lobbyId,
														event.target.value,
													)
												}
												placeholder='Пароль для входа'
												minLength={4}
												autoComplete='current-password'
												disabled={isJoining}
											/>

											<button
												type='button'
												className={styles.passwordToggle}
												onClick={() =>
													setShowJoinPasswords(prev => ({
														...prev,
														[lobby.lobbyId]: !prev[lobby.lobbyId],
													}))
												}
												disabled={isJoining}
												title={joinPasswordToggleLabel}
												aria-label={joinPasswordToggleLabel}
											>
												{isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
											</button>
										</div>
									</div>
								)}

								{joinErrors[lobby.lobbyId] && (
									<div className={styles.joinError}>
										{joinErrors[lobby.lobbyId]}
									</div>
								)}

								<button
									type='button'
									className={styles.joinButton}
									onClick={() => handleJoinLobbyClick(lobby)}
									disabled={isJoining}
								>
									{isJoining ? 'Вход...' : 'Войти'}
								</button>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)

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
							Игровое лобби
						</h2>
						<p className={styles.subtitle}>
							Создайте новую комнату или подключитесь к активному лобби.
						</p>
					</div>

					<button
						type='button'
						className={styles.closeButton}
						onClick={onClose}
						disabled={isSubmitting || !!joiningLobbyId}
						aria-label='Закрыть окно лобби'
					>
						<span className={styles.closeIcon} aria-hidden='true' />
					</button>
				</div>

				<div className={styles.tabs}>
					<button
						type='button'
						className={`${styles.tabButton} ${
							activeTab === 'create' ? styles.tabButtonActive : ''
						}`}
						onClick={() => setActiveTab('create')}
					>
						Создать лобби
					</button>

					<button
						type='button'
						className={`${styles.tabButton} ${
							activeTab === 'open' ? styles.tabButtonActive : ''
						}`}
						onClick={() => setActiveTab('open')}
					>
						Активные лобби
					</button>
				</div>

				{activeTab === 'create' ? renderCreateTab() : renderOpenLobbiesTab()}
			</div>
		</div>
	)
}
