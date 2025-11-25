// apps/web/src/app/profile/ProfilePageClient.tsx
'use client'

import TopHUD from '@/components/TopHUD/TopHUD'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { ScaleContainer } from '@/components/ui/ScaleContainer/ScaleContainer'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import { useCallback, useEffect, useState } from 'react'
import EditProfileModal from './components/EditProfileModal'
import { ProfileAvatar } from './components/ProfileAvatar'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileInfo } from './components/ProfileInfo'
import { ProfileStats } from './components/ProfileStats'
import { useProfile } from './hooks/useProfile'
import { useScrollPrevention } from '@/hooks/useScrollPrevention'
import styles from './page.module.css'

export default function ProfilePageClient() {
	const {
		profile,
		assets,
		iconsStatus,
		isEditModalOpen,
		loadSavedAssets,
		loadUserData,
		checkIconsAvailability,
		handleSaveProfile,
		setIconsStatus,
		setIsEditModalOpen,
	} = useProfile()

	const [isLoading, setIsLoading] = useState(true)

	useScrollPrevention()

	useEffect(() => {
		const initializeProfile = async () => {
			setIsLoading(true)
			try {
				loadSavedAssets()
				await Promise.all([checkIconsAvailability(), loadUserData()])
			} catch (error) {
				console.error('Profile initialization failed:', error)
			} finally {
				setIsLoading(false)
			}
		}

		initializeProfile()
	}, [loadSavedAssets, checkIconsAvailability, loadUserData])

	const handleEditModalOpen = useCallback(
		() => setIsEditModalOpen(true),
		[setIsEditModalOpen]
	)
	const handleEditModalClose = useCallback(
		() => setIsEditModalOpen(false),
		[setIsEditModalOpen]
	)
	const handleIconError = useCallback(
		(iconName: string) => {
			setIconsStatus(prev => ({ ...prev, [iconName]: false }))
		},
		[setIconsStatus]
	)

	// Формируем объект для TopHUD на лету
	const topHudProfile = {
		status: profile.status,
		userId: profile.data?.id,
		email: profile.data?.email,
		username: profile.data?.username,
		message: profile.message,
	}

	// Показываем лоадер пока данные не загружены
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
		</main>
	)
}