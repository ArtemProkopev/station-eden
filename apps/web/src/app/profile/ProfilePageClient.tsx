// apps/web/src/app/profile/ProfilePageClient.tsx
'use client'

import TopHUD from '@/components/TopHUD/TopHUD'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { ScaleContainer } from '@/components/ui/ScaleContainer/ScaleContainer'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import { useScrollPrevention } from '@/hooks/useScrollPrevention'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import EditProfileModal from './components/EditProfileModal'
import { ProfileAvatar } from './components/ProfileAvatar'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileInfo } from './components/ProfileInfo'
import { ProfileStats } from './components/ProfileStats'
import { UsernameModal } from './components/UsernameModal'
import { useProfile } from './hooks/useProfile'
import styles from './page.module.css'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

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
		setIconsStatus,
		setIsEditModalOpen,
		openUsernameModal,
		closeUsernameModal,
		updateUsername,
		handleIconError,
	} = useProfile()

	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()

	useScrollPrevention()

	useEffect(() => {
		let cancelled = false

		const initializeProfile = async () => {
			setIsLoading(true)
			try {
				let r = await fetch(`${API}/auth/me`, {
					method: 'GET',
					credentials: 'include',
					cache: 'no-store',
				})

				if (r.status === 401) {
					const refreshResp = await fetch(`${API}/auth/refresh`, {
						method: 'POST',
						credentials: 'include',
					})

					if (refreshResp.ok) {
						r = await fetch(`${API}/auth/me`, {
							method: 'GET',
							credentials: 'include',
							cache: 'no-store',
						})
					}
				}

				if (!r.ok) {
					if (!cancelled) {
						router.replace('/login?from=/profile')
					}
					return
				}

				if (cancelled) return

				loadSavedAssets()
				await Promise.all([checkIconsAvailability(), loadUserData()])
			} catch (error) {
				console.error('Profile initialization failed:', error)
			} finally {
				if (!cancelled) {
					setIsLoading(false)
				}
			}
		}

		initializeProfile()

		return () => {
			cancelled = true
		}
	}, [loadSavedAssets, checkIconsAvailability, loadUserData, router])

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
