// apps/web/src/app/profile/ProfilePageClient.tsx
'use client'

import TopHUD from '@/components/TopHUD/TopHUD'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { ScaleContainer } from '@/components/ui/ScaleContainer/ScaleContainer'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import { useScrollPrevention } from '@/hooks/useScrollPrevention'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import EditProfileModal from './components/EditProfileModal'
import { ProfileAvatar } from './components/ProfileAvatar'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileInfo } from './components/ProfileInfo'
import { ProfileStats } from './components/ProfileStats'
import { UsernameModal } from './components/UsernameModal'
import { useProfile } from './hooks/useProfile'
import styles from './page.module.css'

export default function ProfilePageClient() {
	const {
		profile,
		assets,
		iconsStatus,
		isEditModalOpen,
		isUsernameModalOpen,
		loadSavedAssets,
		loadUserData,
		checkIconsAvailability,
		handleSaveProfile,
		setIsEditModalOpen,
		openUsernameModal,
		closeUsernameModal,
		updateUsername,
		handleIconError,
	} = useProfile()

	const router = useRouter()
	useScrollPrevention()

	/**
	 * Лоадер завязан на один init-запуск + статус профиля.
	 * Так мы гарантированно не зависнем “навсегда”.
	 */
	const [isLoading, setIsLoading] = useState(true)
	const didInitRef = useRef(false)
	const redirectedRef = useRef(false)

	const redirectToLogin = useCallback(() => {
		if (redirectedRef.current) return
		redirectedRef.current = true
		router.replace('/login?from=/profile')
	}, [router])

	// 1) Одноразовая инициализация
	useEffect(() => {
		if (didInitRef.current) return
		didInitRef.current = true

		let cancelled = false

		const init = async () => {
			try {
				setIsLoading(true)

				// Иконки не должны блокировать профиль — грузим фоном
				checkIconsAvailability().catch(() => {})

				// Главный источник истины: /auth/me (same-origin)
				await loadUserData()

				// Подтягиваем кэш (fallback) уже после того, как хук поставит profile.data.id
				// (если userId не будет — loadSavedAssets просто ничего не сделает)
				loadSavedAssets()
			} catch (e) {
				// На всякий случай: если loadUserData кинет исключение — покажем ошибку через profile.status=error
				// и всё равно не будем висеть в лоадере.
				// eslint-disable-next-line no-console
				console.error('Profile init error:', e)
			} finally {
				if (!cancelled) {
					// НЕ снимаем лоадер здесь окончательно — ниже есть эффект,
					// который снимет его, когда profile.status станет ok/unauth/error.
					// Но на случай совсем нестандартных ситуаций оставим "страховку":
					// если профиль так и остался loading — лоадер снимется через эффект по статусу.
				}
			}
		}

		init()

		return () => {
			cancelled = true
		}
	}, [checkIconsAvailability, loadUserData, loadSavedAssets])

	// 2) Завершаем лоадер строго по факту статуса профиля
	useEffect(() => {
		if (profile.status === 'loading') return
		setIsLoading(false)

		if (profile.status === 'unauth') {
			redirectToLogin()
		}
	}, [profile.status, redirectToLogin])

	const handleEditModalOpen = useCallback(
		() => setIsEditModalOpen(true),
		[setIsEditModalOpen]
	)
	const handleEditModalClose = useCallback(
		() => setIsEditModalOpen(false),
		[setIsEditModalOpen]
	)

	const topHudProfile = {
		status: profile.status,
		userId: profile.data?.id,
		email: profile.data?.email,
		username: profile.data?.username,
		message: profile.message,
	}

	if (isLoading) {
		return (
			<main className={styles.root}>
				<FirefliesProfile />
				<TwinklingStars />
				<TopHUD profile={topHudProfile} avatar={assets.avatar} />

				<ScaleContainer
					baseWidth={1200}
					baseHeight={800}
					minScale={0.5}
					maxScale={1}
				>
					<div className={styles.loadingContainer}>
						<div className={styles.loadingSpinner}></div>
						<p>Загрузка профиля...</p>
					</div>
				</ScaleContainer>
			</main>
		)
	}

	// Если всё же unauth — мы уже отправили редирект, но на момент рендера просто покажем лоадер,
	// чтобы не мелькала “пустая” страница.
	if (profile.status === 'unauth') {
		return (
			<main className={styles.root}>
				<FirefliesProfile />
				<TwinklingStars />
				<TopHUD profile={topHudProfile} avatar={assets.avatar} />

				<ScaleContainer
					baseWidth={1200}
					baseHeight={800}
					minScale={0.5}
					maxScale={1}
				>
					<div className={styles.loadingContainer}>
						<div className={styles.loadingSpinner}></div>
						<p>Проверка авторизации...</p>
					</div>
				</ScaleContainer>
			</main>
		)
	}

	return (
		<main className={styles.root}>
			<FirefliesProfile />
			<TwinklingStars />

			<TopHUD profile={topHudProfile} avatar={assets.avatar} />

			<ProfileHeader
				onEditClick={handleEditModalOpen}
				iconsStatus={iconsStatus}
				onIconError={handleIconError}
			/>

			<article className={styles.panel}>
				<div className={styles.contentGrid}>
					<ProfileAvatar
						avatar={assets.avatar}
						frame={assets.frame}
						username={profile.data?.username}
						onChangeUsernameClick={openUsernameModal}
					/>
					<ProfileInfo profile={profile} />
				</div>
			</article>

			<ProfileStats />

			<EditProfileModal
				isOpen={isEditModalOpen}
				onClose={handleEditModalClose}
				onSave={handleSaveProfile}
				currentAvatar={assets.avatar}
				currentFrame={assets.frame}
			/>

			<UsernameModal
				isOpen={isUsernameModalOpen}
				onClose={closeUsernameModal}
				currentUsername={profile.data?.username ?? ''}
				onSave={updateUsername}
			/>
		</main>
	)
}
