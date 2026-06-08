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
	icon: 'public' | 'password' | 'hidden'
}

type ModalTab = 'create' | 'open'

type NormalizedOpenLobby = PublicLobbyInfo & {
	difficulty?: 'easy' | 'normal' | 'hard'
	turnTime?: number
	hiddenRolesCount?: number
	enableCrises?: boolean
}

const LOBBY_OPTIONS: LobbyOption[] = [
	{
		value: 'public',
		title: 'Открытое',
		description: 'Видно в списке лобби, любой игрок может войти',
		icon: 'public',
	},
	{
		value: 'password',
		title: 'С паролем',
		description: 'Видно в списке, вход только по паролю',
		icon: 'password',
	},
	{
		value: 'hidden_password',
		title: 'Скрытое',
		description: 'Не видно в списке, вход по ссылке и паролю',
		icon: 'hidden',
	},
]

type CreateLobbyModalProps = {
	isOpen: boolean
	initialTab?: ModalTab
	isSubmitting?: boolean
	submitError?: string
	onClose: () => void
	onCreate: (payload: CreateLobbyDto) => Promise<void>
	onJoinLobby: (lobbyId: string, password?: string) => Promise<void> | void
}

function needsPassword(visibility: LobbyVisibility) {
	return visibility === 'password' || visibility === 'hidden_password'
}

function PublicLobbyIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M12 1.5C9.9233 1.5 7.89323 2.11581 6.16652 3.26957C4.4398 4.42332 3.09399 6.0632 2.29927 7.98182C1.50455 9.90045 1.29661 12.0116 1.70176 14.0484C2.1069 16.0852 3.10693 17.9562 4.57538 19.4246C6.04383 20.8931 7.91475 21.8931 9.95155 22.2982C11.9884 22.7034 14.0996 22.4955 16.0182 21.7007C17.9368 20.906 19.5767 19.5602 20.7304 17.8335C21.8842 16.1068 22.5 14.0767 22.5 12C22.4969 9.21618 21.3897 6.54726 19.4212 4.5788C17.4527 2.61035 14.7838 1.5031 12 1.5ZM2.96512 12C2.9669 10.9884 3.13995 9.98448 3.47693 9.0307C4.08252 13.4358 7.94652 13.808 8.11256 14.5102C8.20414 15.3012 8.22702 16.0986 8.18093 16.8935C8.24931 18.2512 10.1247 18.2707 10.8474 19.3451C11.1015 19.854 11.2003 20.4263 11.1317 20.9909C8.89749 20.7728 6.82423 19.7317 5.31492 18.07C3.8056 16.4083 2.96807 14.2448 2.96512 12ZM14.4516 20.693C15.1168 18.6096 17.1142 17.9034 17.3174 16.6991C17.4805 15.7331 16.2107 15.234 15.0709 15.0982C13.931 14.9625 14.1059 13.7845 13.302 12.9494C12.4981 12.1143 11.9746 12.1602 10.8455 12.3018C9.71637 12.4434 8.75038 12.3506 8.43489 11.6562C8.1194 10.9617 8.52182 10.6296 7.69158 9.76911C7.5795 9.66171 7.49898 9.52566 7.45876 9.37572C7.41854 9.22579 7.42017 9.0677 7.46345 8.91862C7.50673 8.76955 7.59003 8.63517 7.70429 8.53009C7.81855 8.42501 7.95941 8.35323 8.11158 8.32256C8.69763 8.18093 9.73982 9.20163 10.3503 9.08149C12.1885 8.70251 9.98498 5.10223 12.7472 4.19777C13.2543 4.02457 13.6724 3.65806 13.9105 3.17805C15.4599 3.51632 16.8925 4.25757 18.0636 5.32688C18.4045 6.10989 18.5263 6.97074 18.4162 7.81758C18.048 8.95744 17.1201 9.7779 18.132 11.6425C19.1879 13.5901 19.8393 13.8548 20.314 13.3186C20.4997 13.1148 20.7319 12.9589 20.9909 12.8644C20.8145 14.6755 20.0961 16.3914 18.9295 17.788C17.763 19.1846 16.2024 20.197 14.4516 20.693Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function PasswordLobbyIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M12 16.5563V18.2156M12 16.5563C11.0835 16.5563 10.3406 15.8133 10.3406 14.8969C10.3406 13.9804 11.0835 13.2375 12 13.2375C12.9165 13.2375 13.6593 13.9804 13.6593 14.8969C13.6593 15.8133 12.9165 16.5563 12 16.5563ZM16.9781 9.64782V5.41879C16.9781 3.55482 15.4671 2.0438 13.6031 2.0438H10.3969C8.5329 2.0438 7.02188 3.55482 7.02188 5.41879V9.64782M8.04745 9.52501H15.9525C17.598 9.52501 19.1023 10.4547 19.8382 11.9265C20.1398 12.5297 20.2968 13.1949 20.2969 13.8693V17.612C20.2968 18.2864 20.1398 18.9515 19.8382 19.5548C19.1023 21.0266 17.598 21.9562 15.9525 21.9562H8.04745C6.40194 21.9562 4.89766 21.0266 4.16179 19.5548C3.86017 18.9515 3.70314 18.2864 3.70312 17.612V13.8693C3.70312 13.1949 3.86019 12.5297 4.16179 11.9265C4.89766 10.4547 6.40194 9.52501 8.04745 9.52501Z'
				stroke='currentColor'
				strokeWidth='2'
				strokeMiterlimit='10'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	)
}

function HiddenLobbyIcon() {
	return (
		<svg
			viewBox='0 0 32 32'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M28.2071 28.2071C28.5976 27.8166 28.5976 27.1834 28.2071 26.7929L5.20711 3.79289C4.81658 3.40237 4.18342 3.40237 3.79289 3.79289C3.40237 4.18342 3.40237 4.81658 3.79289 5.20711L26.7929 28.2071C27.1834 28.5976 27.8166 28.5976 28.2071 28.2071Z'
				fill='currentColor'
			/>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M24.3628 23.9842C22.0396 25.6555 19.1861 26.9999 16.0001 26.9999C12.3561 26.9999 9.14706 25.2412 6.6689 23.2462C4.18104 21.2433 2.32859 18.9216 1.37718 17.6103C0.675056 16.6426 0.675056 15.3573 1.37718 14.3896C2.32859 13.0783 4.18104 10.7566 6.6689 8.75377C7.11685 8.39315 7.58869 8.04025 8.08266 7.70406L9.52495 9.14635C8.96973 9.50735 8.43489 9.89963 7.92307 10.3117C5.62696 12.1601 3.89368 14.3269 2.99598 15.5641C2.80212 15.8313 2.80212 16.1686 2.99598 16.4358C3.89368 17.6731 5.62696 19.8398 7.92307 21.6883C10.2289 23.5445 13.002 24.9999 16.0001 24.9999C18.5154 24.9999 20.8724 23.9755 22.928 22.5494L24.3628 23.9842ZM20.4278 20.0492C19.3308 21.2481 17.7533 21.9999 16.0001 21.9999C12.6864 21.9999 10.0002 19.3137 10.0002 16C10.0002 14.2468 10.752 12.6693 11.9509 11.5723L13.3672 12.9886C12.5293 13.7218 12.0002 14.7991 12.0002 16C12.0002 18.2091 13.791 19.9999 16.0001 19.9999C17.201 19.9999 18.2783 19.4708 19.0115 18.6329L20.4278 20.0492ZM19.9428 15.3216L21.87 17.2487C21.9553 16.8459 22.0001 16.4282 22.0001 16C22.0001 12.6862 19.3139 9.99997 16.0001 9.99997C15.5719 9.99997 15.1542 10.0448 14.7514 10.1301L16.6785 12.0573C18.3441 12.3418 19.6583 13.656 19.9428 15.3216ZM12.3259 7.7047C13.4979 7.2617 14.7288 7 16.0001 7C18.9982 7 21.7713 8.4554 24.0771 10.3117C26.3733 12.1601 28.1065 14.3269 29.0042 15.5641C29.1981 15.8313 29.1981 16.1686 29.0042 16.4358C28.2701 17.4476 26.9773 19.0809 25.2748 20.6535L26.69 22.0687C28.4962 20.3904 29.854 18.6703 30.623 17.6103C31.3252 16.6426 31.3252 15.3573 30.623 14.3896C29.6716 13.0783 27.8192 10.7566 25.3313 8.75377C22.8532 6.75875 19.6441 5 16.0001 5C14.1385 5 12.3904 5.45901 10.7953 6.17404L12.3259 7.7047Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function LobbyOptionIcon({ icon }: { icon: LobbyOption['icon'] }) {
	if (icon === 'password') return <PasswordLobbyIcon />
	if (icon === 'hidden') return <HiddenLobbyIcon />

	return <PublicLobbyIcon />
}

function SearchPlayersIcon() {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='22'
			height='22'
			viewBox='0 0 22 22'
			fill='none'
			aria-hidden='true'
		>
			<path
				d='M4.59714 1.45096L4.57421 1.42803C4.16324 1.01685 3.48224 1.04678 3.11733 1.49936C1.67192 3.29206 0.916626 5.49765 0.916626 7.85396C0.916626 10.2103 1.67192 12.4156 3.11733 14.2081C3.48224 14.6607 4.16324 14.6906 4.57421 14.2797L4.61242 14.2415C4.78119 14.0733 4.88287 13.8495 4.89842 13.6118C4.91398 13.3741 4.84233 13.1388 4.69691 12.9502C3.54317 11.4602 2.93329 9.69506 2.93329 7.85396C2.93329 5.94068 3.5334 4.17727 4.66867 2.75839C4.81985 2.56995 4.89616 2.33233 4.88295 2.0911C4.86975 1.84987 4.76798 1.62178 4.59714 1.45096Z'
				fill='currentColor'
			/>
			<path
				d='M6.96668 7.85401C6.96668 7.01041 7.20018 6.22497 7.66678 5.54228C7.9317 5.15465 7.87906 4.63245 7.54705 4.30023L7.52243 4.2756C7.09213 3.8451 6.37187 3.90157 6.02437 4.40127C5.30813 5.43126 4.95002 6.61281 4.95002 7.85401C4.95002 9.08035 5.29964 10.2485 5.99868 11.2254C6.35404 11.722 7.06751 11.7865 7.49929 11.3549L7.54641 11.3076C7.87948 10.9743 7.93064 10.4508 7.66423 10.0626C7.19934 9.38539 6.96668 8.61949 6.96668 7.85401ZM17.4257 1.42829L17.4028 1.45122C17.2319 1.62204 17.1302 1.84991 17.117 2.09114C17.1038 2.33238 17.1801 2.56999 17.3312 2.75844C18.4665 4.17753 19.0666 5.94073 19.0666 7.85401C19.0666 9.69532 18.4568 11.4604 17.303 12.9502C17.1576 13.1389 17.086 13.374 17.1016 13.6117C17.1171 13.8494 17.2188 14.0732 17.3875 14.2413L17.424 14.278C17.8411 14.6952 18.5268 14.6512 18.8938 14.1895C20.3318 12.38 21.0833 10.1171 21.0833 7.85401C21.0833 5.4977 20.328 3.29232 18.8826 1.49962C18.5177 1.04704 17.8367 1.01711 17.4257 1.42829Z'
				fill='currentColor'
			/>
			<path
				d='M14.4776 4.27559L14.4529 4.30022C14.1207 4.63243 14.0683 5.15464 14.3332 5.54248C14.8 6.22496 15.0333 7.01039 15.0333 7.85399C15.0333 8.67255 14.8136 9.43633 14.3742 10.064C14.0982 10.458 14.1364 10.9906 14.4767 11.3307C14.9047 11.7587 15.6234 11.7086 15.969 11.2116C16.646 10.2373 17.05 9.0746 17.05 7.85399C17.05 6.61279 16.6918 5.43124 15.9758 4.40126C15.6283 3.90155 14.9081 3.84509 14.4776 4.27559ZM13.0166 7.85399C13.0166 6.64909 11.9457 5.68237 10.7087 5.85814C9.93285 5.96852 9.28307 6.5421 9.06421 7.29485C8.76574 8.3208 9.32786 9.29814 10.1933 9.66899L9.07737 20.1272C9.06748 20.2198 9.07718 20.3134 9.10584 20.402C9.13451 20.4906 9.18148 20.5721 9.24372 20.6414C9.30597 20.7106 9.38208 20.766 9.46712 20.8039C9.55217 20.8418 9.64423 20.8614 9.73734 20.8614H12.2626C12.3558 20.8615 12.4478 20.8419 12.5329 20.804C12.618 20.7661 12.6941 20.7107 12.7564 20.6415C12.8187 20.5722 12.8656 20.4906 12.8943 20.402C12.923 20.3134 12.9327 20.2198 12.9228 20.1272L11.8066 9.66899C12.5125 9.36649 13.0166 8.66066 13.0166 7.85399Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function EnterLobbyIcon() {
	return (
		<svg
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M9 6L15 12L9 18'
				stroke='currentColor'
				strokeWidth='2.4'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	)
}

function normalizeDifficulty(
	value: unknown,
): NormalizedOpenLobby['difficulty'] {
	if (value === 'easy' || value === 'normal' || value === 'hard') {
		return value
	}

	return 'normal'
}

function normalizeOptionalNumber(value: unknown, fallback: number) {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeOptionalBoolean(value: unknown, fallback: boolean) {
	return typeof value === 'boolean' ? value : fallback
}

function normalizeOpenLobbies(value: unknown): NormalizedOpenLobby[] {
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
		.map(lobby => {
			const rawLobby = lobby as PublicLobbyInfo & Record<string, unknown>

			return {
				...lobby,
				searchingPlayers: !!lobby.searchingPlayers,
				difficulty: normalizeDifficulty(rawLobby.difficulty),
				turnTime: normalizeOptionalNumber(rawLobby.turnTime, 180),
				hiddenRolesCount: normalizeOptionalNumber(rawLobby.hiddenRolesCount, 0),
				enableCrises: normalizeOptionalBoolean(rawLobby.enableCrises, true),
			}
		})
		.sort((a, b) => {
			if (!!a.searchingPlayers !== !!b.searchingPlayers) {
				return a.searchingPlayers ? -1 : 1
			}

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

	if (diffMinutes < 1) return 'только что'

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

function getLobbyTitle(lobby: NormalizedOpenLobby) {
	return lobby.hasPassword ? 'Лобби с паролем' : 'Открытое лобби'
}

function getGameModeName(mode?: string) {
	const modes: Record<string, string> = {
		standard: 'Стандартный',
		extended: 'Расширенный',
		competitive: 'Соревновательный',
		cooperative: 'Кооперативный',
	}

	return modes[mode || 'standard'] || mode || 'Стандартный'
}

function getDifficultyLabel(difficulty?: string) {
	switch (difficulty) {
		case 'easy':
			return 'Лёгкая'
		case 'hard':
			return 'Сложная'
		default:
			return 'Средняя'
	}
}

function getTurnTimeLabel(turnTime?: number) {
	switch (turnTime ?? 180) {
		case 60:
			return '1 минута'
		case 300:
			return '5 минут'
		default:
			return '3 минуты'
	}
}

function getCrisisLabel(enableCrises?: boolean) {
	return enableCrises === false ? 'выкл' : 'вкл'
}

function getHiddenRolesLabel(hiddenRolesCount?: number) {
	return hiddenRolesCount && hiddenRolesCount > 0 ? '1 роль' : 'выкл'
}

function getOpenSlotsCount(lobby: NormalizedOpenLobby) {
	return Math.max(0, lobby.maxPlayers - lobby.playersCount)
}

export function CreateLobbyModal({
	isOpen,
	initialTab = 'create',
	isSubmitting = false,
	submitError = '',
	onClose,
	onCreate,
	onJoinLobby,
}: CreateLobbyModalProps) {
	const [activeTab, setActiveTab] = useState<ModalTab>(initialTab)

	const [visibility, setVisibility] = useState<LobbyVisibility>('public')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [validationError, setValidationError] = useState('')

	const [openLobbies, setOpenLobbies] = useState<NormalizedOpenLobby[]>([])
	const [isOpenLobbiesLoading, setIsOpenLobbiesLoading] = useState(false)
	const [openLobbiesError, setOpenLobbiesError] = useState('')
	const [joiningLobbyId, setJoiningLobbyId] = useState('')
	const [joinErrors, setJoinErrors] = useState<Record<string, string>>({})
	const [nowTick, setNowTick] = useState(() => Date.now())

	const passwordRequired = needsPassword(visibility)
	const errorMessage = validationError || submitError

	const loadOpenLobbies = useCallback(async () => {
		setIsOpenLobbiesLoading(true)
		setOpenLobbiesError('')

		const startedAt = Date.now()
		const minLoadingMs = 650

		const waitForMinLoading = async () => {
			const elapsed = Date.now() - startedAt

			if (elapsed < minLoadingMs) {
				await new Promise<void>(resolve => {
					window.setTimeout(resolve, minLoadingMs - elapsed)
				})
			}
		}

		try {
			const lobbies = await api.openLobbies()

			await waitForMinLoading()

			setOpenLobbies(normalizeOpenLobbies(lobbies))
			setNowTick(Date.now())
		} catch (error) {
			await waitForMinLoading()

			console.error(error)
			setOpenLobbiesError('Не удалось загрузить список активных лобби')
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

		setActiveTab(initialTab)
		setVisibility('public')
		setPassword('')
		setShowPassword(false)
		setValidationError('')
		setOpenLobbies([])
		setOpenLobbiesError('')
		setJoiningLobbyId('')
		setJoinErrors({})
		setNowTick(Date.now())
	}, [isOpen, initialTab])

	useEffect(() => {
		if (!isOpen) return

		setActiveTab(initialTab)
	}, [initialTab, isOpen])

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
			setValidationError('Пароль должен содержать минимум 4 символа')
			return
		}

		setValidationError('')

		await onCreate({
			visibility,
			...(passwordRequired ? { password: normalizedPassword } : {}),
		})
	}

	const handleJoinLobbyClick = async (lobby: NormalizedOpenLobby) => {
		setJoiningLobbyId(lobby.lobbyId)
		setJoinErrors(prev => ({ ...prev, [lobby.lobbyId]: '' }))

		try {
			await onJoinLobby(lobby.lobbyId)
		} catch (error) {
			console.error(error)

			setJoinErrors(prev => ({
				...prev,
				[lobby.lobbyId]: lobby.hasPassword
					? 'Не удалось открыть лобби с паролем'
					: 'Не удалось подключиться к лобби',
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

							<span className={styles.optionIcon} aria-hidden='true'>
								<LobbyOptionIcon icon={option.icon} />
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
													onChange={event => {
														setPassword(event.target.value)
														setValidationError('')
													}}
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
					{isSubmitting ? 'Создание' : 'Создать лобби'}
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
						Выберите доступную комнату или обновите список
					</p>
				</div>

				<button
					type='button'
					className={styles.refreshButton}
					onClick={loadOpenLobbies}
					disabled={isOpenLobbiesLoading}
					aria-label={
						isOpenLobbiesLoading
							? 'Обновление списка лобби'
							: 'Обновить список лобби'
					}
					title={isOpenLobbiesLoading ? 'Обновление' : 'Обновить список лобби'}
					aria-busy={isOpenLobbiesLoading}
				>
					<span
						className={`${styles.refreshSpinner} ${
							isOpenLobbiesLoading ? styles.refreshSpinnerActive : ''
						}`}
						aria-hidden='true'
					/>
				</button>
			</div>

			{openLobbiesError && (
				<div className={styles.errorBox}>{openLobbiesError}</div>
			)}

			{isOpenLobbiesLoading && (
				<div className={styles.emptyState}>Сканирование активных лобби</div>
			)}

			{!isOpenLobbiesLoading && openLobbies.length === 0 && (
				<div className={styles.emptyState}>
					<span className={styles.emptyTitle}>Активных лобби пока нет</span>
					<span className={styles.emptyText}>
						Создайте первое лобби или попросите друга отправить код/ссылку
					</span>
				</div>
			)}

			{!isOpenLobbiesLoading && openLobbies.length > 0 && (
				<div className={styles.lobbiesList}>
					{openLobbies.map(lobby => {
						const isJoining = joiningLobbyId === lobby.lobbyId
						const lobbyAge = formatLobbyAge(lobby.createdAt, nowTick)
						const openSlotsCount = getOpenSlotsCount(lobby)

						return (
							<div
								key={lobby.lobbyId}
								className={`${styles.lobbyCard} ${
									lobby.searchingPlayers ? styles.lobbyCardSearching : ''
								}`}
							>
								<div className={styles.lobbyMain}>
									<div className={styles.lobbyInfo}>
										<div className={styles.lobbyTitleRow}>
											<span className={styles.lobbyTitleCluster}>
												<span
													className={styles.lobbyTitleIcon}
													aria-hidden='true'
												>
													{lobby.hasPassword ? (
														<PasswordLobbyIcon />
													) : (
														<PublicLobbyIcon />
													)}
												</span>

												<span className={styles.lobbyTitle}>
													{getLobbyTitle(lobby)}
												</span>
											</span>

											{lobby.searchingPlayers && openSlotsCount > 0 && (
												<div className={styles.lobbyBadges}>
													<span className={styles.searchBadge}>
														<span className={styles.searchBadgeIcon}>
															<SearchPlayersIcon />
														</span>
														<span>Ищут игроков</span>
														<span className={styles.searchBadgeSlots}>
															+{openSlotsCount}
														</span>
													</span>
												</div>
											)}
										</div>

										<div className={styles.lobbyMetaRow}>
											<span className={styles.lobbyMeta}>
												{lobby.playersCount}/{lobby.maxPlayers} ·{' '}
												{getGameModeName(lobby.gameMode)} ·{' '}
												{getDifficultyLabel(lobby.difficulty)}
											</span>

											<div className={styles.lobbyActionSlot}>
												<span className={styles.lobbyAge}>{lobbyAge}</span>

												<button
													type='button'
													className={styles.joinIconButton}
													onClick={() => handleJoinLobbyClick(lobby)}
													disabled={isJoining}
													aria-label={
														lobby.hasPassword
															? 'Открыть лобби с паролем'
															: 'Перейти в лобби'
													}
													title={
														lobby.hasPassword
															? 'Открыть лобби с паролем'
															: 'Перейти в лобби'
													}
												>
													<EnterLobbyIcon />
												</button>
											</div>
										</div>

										<div className={styles.lobbyDetails}>
											<span className={styles.detailPill}>
												Ход: {getTurnTimeLabel(lobby.turnTime)}
											</span>
											<span className={styles.detailPill}>
												Кризисы: {getCrisisLabel(lobby.enableCrises)}
											</span>
											<span className={styles.detailPill}>
												Скрытые роли:{' '}
												{getHiddenRolesLabel(lobby.hiddenRolesCount)}
											</span>
										</div>
									</div>
								</div>

								{joinErrors[lobby.lobbyId] && (
									<div className={styles.joinError}>
										{joinErrors[lobby.lobbyId]}
									</div>
								)}
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
							Создайте новую комнату или подключитесь к активному лобби
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
