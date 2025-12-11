// apps/web/src/app/page.tsx
'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import styles from './home.module.css'

// Ленивая подгрузка тяжёлых компонентов
const TopHUD = dynamic(() => import('../components/TopHUD/TopHUD'), {
	ssr: false,
})

const Fireflies = dynamic(
	() =>
		import('../components/ui/Fireflies/FirefliesMain').then(m => m.Fireflies),
	{
		ssr: false,
	}
)

const PanelWithPlayButton = dynamic(
	() => import('../components/ui/PanelWithPlayButton/PanelWithPlayButton'),
	{
		ssr: false,
	}
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
		href: 'https://t.me/your-channel',
		icon: '/icons/telegram.svg',
		alt: 'Telegram',
	},
	{
		href: 'https://tiktok.com/@your-account',
		icon: '/icons/tiktok.svg',
		alt: 'TikTok',
	},
	{
		href: 'https://discord.gg/your-server',
		icon: '/icons/discord.svg',
		alt: 'Discord',
	},
] as const

// Мягкая проверка сессии через /auth/session:
// - всегда 200, без 401/403
// - status: 'signed-in' | 'signed-out'
async function fetchProfile(): Promise<UserProfile | null> {
	try {
		const session: any = await api.session()

		if (session?.status !== 'signed-in' || !session?.user) {
			return null
		}

		const user = session.user
		const id: string | undefined = user.userId ?? user.id ?? user.sub
		const email: string | undefined = user.email

		if (!id || !email) return null

		const profile: UserProfile = {
			id,
			email,
			username:
				typeof user.username === 'string' ? user.username : email.split('@')[0],
			avatar: user.avatar,
		}

		return profile
	} catch {
		// Любые ошибки → просто считаем, что гость, без красных ошибок в консоли
		return null
	}
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
	const router = useRouter()

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

	const isAuthenticated = !!userProfile

	const handlePlayClick = useCallback(() => {
		if (isAuthenticated) {
			router.push('/lobby')
		} else {
			router.push('/login')
		}
	}, [router, isAuthenticated])

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
								className={`${styles.menuItem} cursor-target`}
								onClick={handleRegister}
							>
								ЗАРЕГИСТРИРОВАТЬСЯ
							</button>
							<button
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
		</>
	)
}
