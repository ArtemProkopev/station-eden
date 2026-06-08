// apps/web/src/app/page.tsx
'use client'

import type { CreateLobbyDto } from '@station-eden/shared'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { CreateLobbyModal } from '../components/CreateLobbyModal/CreateLobbyModal'
import { api } from '../lib/api'
import styles from './home.module.css'

const TopHUD = dynamic(() => import('../components/TopHUD/TopHUD'), {
	ssr: false,
})

const Fireflies = dynamic(
	() =>
		import('../components/ui/Fireflies/FirefliesMain').then(m => m.Fireflies),
	{ ssr: false },
)

const PanelWithPlayButton = dynamic(
	() => import('../components/ui/PanelWithPlayButton/PanelWithPlayButton'),
	{ ssr: false },
)

const TargetCursor = dynamic(() => import('../components/ui/TargetCursor'), {
	ssr: false,
})

interface UserProfile {
	id: string
	email: string
	username: string
	avatar?: string
}

type InitialLobbyTab = 'create' | 'open'

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

const NEWS_DATA = [
	{
		id: 1,
		title: 'ОБНОВЛЕНИЕ ЭКИПАЖА',
		date: '2025-12-10',
		content: 'Уже сегодня в игре появится три новые роли!',
		highlight: 'Разнообразие — ключ к выживанию',
	},
	{
		id: 2,
		title: 'НОВЫЙ РЕЖИМ ИГРЫ',
		date: '2025-11-28',
		content: 'Добавлен кооперативный режим для 4 игроков',
		highlight: 'Выживайте вместе с друзьями',
	},
	{
		id: 3,
		title: 'ОБНОВЛЕНИЕ БАЛАНСА',
		date: '2025-11-15',
		content: 'Переработана система характеристик персонажей',
		highlight: 'Справедливость для всех ролей',
	},
] as const

const SOCIAL_ICONS = [
	{
		href: 'https://t.me/stationeden',
		icon: '/icons/telegram.svg',
		alt: 'Telegram',
	},
	{
		href: 'https://tiktok.com/@stationeden',
		icon: '/icons/tiktok.svg',
		alt: 'TikTok',
	},
	{
		href: 'https://discord.gg/your-server',
		icon: '/icons/discord.svg',
		alt: 'Discord',
	},
] as const

async function fetchProfile(): Promise<UserProfile | null> {
	try {
		const sessionUnknown = await api.session()

		if (!isRecord(sessionUnknown)) return null
		if (sessionUnknown.status !== 'signed-in') return null

		const userUnknown = sessionUnknown.user
		if (!isRecord(userUnknown)) return null

		const id =
			typeof userUnknown.userId === 'string'
				? userUnknown.userId
				: typeof userUnknown.id === 'string'
					? userUnknown.id
					: typeof userUnknown.sub === 'string'
						? userUnknown.sub
						: undefined

		const email =
			typeof userUnknown.email === 'string' ? userUnknown.email : undefined

		if (!id || !email) return null

		const username =
			typeof userUnknown.username === 'string'
				? userUnknown.username
				: email.split('@')[0]

		const avatar =
			typeof userUnknown.avatar === 'string' ? userUnknown.avatar : undefined

		return { id, email, username, avatar }
	} catch {
		return null
	}
}

function getCreateLobbyErrorMessage(error: unknown): string {
	if (isRecord(error)) {
		if (typeof error.userMessage === 'string') return error.userMessage
		if (typeof error.serverMessage === 'string') return error.serverMessage
		if (typeof error.message === 'string') return error.message
	}

	if (error instanceof Error) return error.message

	return 'Не удалось создать лобби'
}

function saveLobbyPassword(lobbyId: string, password?: string) {
	if (typeof window === 'undefined') return
	if (!password) return

	window.sessionStorage.setItem(
		`station-eden:lobby-password:${lobbyId}`,
		password,
	)
}

function NewsSlider() {
	const [currentIndex, setCurrentIndex] = useState(0)

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentIndex(prev => (prev + 1) % NEWS_DATA.length)
		}, 7000)

		return () => clearInterval(interval)
	}, [])

	const nextNews = useCallback(() => {
		setCurrentIndex(prev => (prev + 1) % NEWS_DATA.length)
	}, [])

	const prevNews = useCallback(() => {
		setCurrentIndex(prev => (prev - 1 + NEWS_DATA.length) % NEWS_DATA.length)
	}, [])

	const currentNews = NEWS_DATA[currentIndex]

	return (
		<div className={styles.newsSliderContainer}>
			<button
				type='button'
				className={styles.sliderArrowLeft}
				onClick={prevNews}
				aria-label='Предыдущая новость'
			>
				‹
			</button>

			<div className={styles.newsPanel}>
				<div className={styles.newsHeader}>
					<span className={styles.newsTitle}>{currentNews.title}</span>
					<span className={styles.newsDate}>Дата: {currentNews.date}</span>
				</div>

				<div className={styles.newsContent}>
					<p className={styles.newsInfo}>{currentNews.content}</p>
					<p className={styles.newsHighlight}>{currentNews.highlight}</p>
				</div>
			</div>

			<button
				type='button'
				className={styles.sliderArrowRight}
				onClick={nextNews}
				aria-label='Следующая новость'
			>
				›
			</button>
		</div>
	)
}

export default function HomePage() {
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const [isCreateLobbyOpen, setIsCreateLobbyOpen] = useState(false)
	const [isCreatingLobby, setIsCreatingLobby] = useState(false)
	const [createLobbyError, setCreateLobbyError] = useState('')
	const [initialLobbyTab, setInitialLobbyTab] =
		useState<InitialLobbyTab>('create')

	const router = useRouter()
	const isAuthenticated = !!userProfile

	useEffect(() => {
		let alive = true

		const load = async () => {
			const profile = await fetchProfile()

			if (!alive) return

			setUserProfile(profile)
			setIsLoading(false)
		}

		load()

		const handleSessionChanged = () => {
			if (!alive) return

			setUserProfile(null)
			setIsLoading(false)
			load()
		}

		const onVisibility = () => {
			if (document.visibilityState === 'visible') {
				load()
			}
		}

		const onFocus = () => {
			load()
		}

		window.addEventListener('session-changed', handleSessionChanged)
		document.addEventListener('visibilitychange', onVisibility)
		window.addEventListener('focus', onFocus)

		return () => {
			alive = false
			window.removeEventListener('session-changed', handleSessionChanged)
			document.removeEventListener('visibilitychange', onVisibility)
			window.removeEventListener('focus', onFocus)
		}
	}, [])

	useEffect(() => {
		if (isLoading) return
		if (typeof window === 'undefined') return

		const params = new URLSearchParams(window.location.search)

		if (params.get('openLobbies') !== '1') return

		if (!isAuthenticated) {
			router.replace('/')
			return
		}

		setInitialLobbyTab('open')
		setCreateLobbyError('')
		setIsCreateLobbyOpen(true)

		window.history.replaceState(null, '', window.location.pathname)
	}, [isLoading, isAuthenticated, router])

	const handlePlayClick = useCallback(() => {
		if (!isAuthenticated) {
			router.push('/login')
			return
		}

		setInitialLobbyTab('create')
		setCreateLobbyError('')
		setIsCreateLobbyOpen(true)
	}, [router, isAuthenticated])

	const handleCreateLobby = useCallback(
		async (payload: CreateLobbyDto) => {
			setIsCreatingLobby(true)
			setCreateLobbyError('')

			try {
				const lobby = await api.createLobby(payload)

				saveLobbyPassword(lobby.lobbyId, payload.password)

				setIsCreateLobbyOpen(false)
				router.push(`/lobby/${lobby.lobbyId}`)
			} catch (error) {
				setCreateLobbyError(getCreateLobbyErrorMessage(error))
			} finally {
				setIsCreatingLobby(false)
			}
		},
		[router],
	)

	const handleJoinLobby = useCallback(
		async (lobbyId: string, password?: string) => {
			saveLobbyPassword(lobbyId, password)
			setIsCreateLobbyOpen(false)
			setCreateLobbyError('')
			router.push(`/lobby/${lobbyId}`)
		},
		[router],
	)

	const handleCloseCreateLobby = useCallback(() => {
		if (isCreatingLobby) return

		setIsCreateLobbyOpen(false)
		setCreateLobbyError('')
		setInitialLobbyTab('create')
	}, [isCreatingLobby])

	const handleRegister = () => router.push('/register')
	const handleLogin = () => router.push('/login')

	return (
		<>
			<TargetCursor
				spinDuration={2}
				hideDefaultCursor={true}
				parallaxOn={true}
			/>

			<div className={styles.bg} aria-hidden />
			<div className={styles.bgFx} aria-hidden />

			<Fireflies />

			{isAuthenticated && userProfile && (
				<TopHUD
					variant='main'
					profile={{
						status: 'ok' as const,
						userId: userProfile.id,
						email: userProfile.email,
						username: userProfile.username,
					}}
					avatar={userProfile.avatar}
				/>
			)}

			<div className={styles.container}>
				<section className={styles.leftSection}>
					<div className={styles.stationTitle}>
						<div className={styles.titleLine}>Станция Эдем</div>
					</div>

					<NewsSlider />
				</section>

				<section className={styles.menuSection}>
					{!isAuthenticated && !isLoading && (
						<nav className={styles.sideMenu}>
							<button
								type='button'
								className={`${styles.menuItem} cursor-target`}
								onClick={handleRegister}
							>
								ЗАРЕГИСТРИРОВАТЬСЯ
							</button>

							<button
								type='button'
								className={`${styles.menuItem} cursor-target`}
								onClick={handleLogin}
							>
								ВОЙТИ
							</button>
						</nav>
					)}

					<PanelWithPlayButton onPlayClick={handlePlayClick} />
				</section>

				<div className={styles.socialSection}>
					<p className={styles.socialText}>Мы в социальных сетях:</p>

					<div className={styles.socialIcons}>
						{SOCIAL_ICONS.map(item => (
							<a
								key={item.alt}
								href={item.href}
								className={styles.socialIcon}
								target='_blank'
								rel='noopener noreferrer'
								aria-label={item.alt}
							>
								<Image
									src={item.icon}
									alt={item.alt}
									width={50}
									height={50}
									quality={75}
									loading='lazy'
								/>
							</a>
						))}
					</div>
				</div>
			</div>

			<CreateLobbyModal
				isOpen={isCreateLobbyOpen}
				initialTab={initialLobbyTab}
				isSubmitting={isCreatingLobby}
				submitError={createLobbyError}
				onClose={handleCloseCreateLobby}
				onCreate={handleCreateLobby}
				onJoinLobby={handleJoinLobby}
			/>
		</>
	)
}
