// apps/web/src/components/TopHUD/TopHUD.tsx
'use client'

import { Friend, Notification } from '@station-eden/shared'
import React from 'react'
import { useUserData } from '../../hooks/useUserData'
import styles from './TopHUD.module.css'
import { ChatWindow } from './components/ChatWindow'
import { Currency } from './components/Currency'
import { FriendsDrawer } from './components/FriendsDrawer'
import { Icon } from './components/Icon'
import { Notifications } from './components/Notifications'
import { UserDropdown } from './components/UserDropdown'
import { useViewportScale } from './hooks/useViewportScale'

interface TopHUDProps {
	profile?: {
		status: 'loading' | 'error' | 'ok' | 'unauth'
		userId?: string
		email?: string
		username?: string | null
		message?: string
	}
	avatar?: string
	/**
	 * 'default' - показывает кнопку "На главную" (для внутренних страниц)
	 * 'main'    - скрывает кнопку "На главную" (для главной страницы)
	 */
	variant?: 'default' | 'main'
}

const FALLBACK_AVATAR = '/avatars/avatar1.png'
const GUEST_USERNAME = 'Гость'

export default function TopHUD({
	profile,
	avatar,
	variant = 'default',
}: TopHUDProps) {
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
	const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = React.useState(false)
	const [activeChat, setActiveChat] = React.useState<{
		friendId: string
		friendName: string
	} | null>(null)

	// ленивые инициализации
	const [notifications, setNotifications] = React.useState<Notification[]>(
		() => [
			{
				id: '1',
				type: 'game_invite',
				title: 'Приглашение в игру',
				message: 'Игрок CosmicWarrior приглашает вас в игру',
				timestamp: new Date(Date.now() - 5 * 60_000),
				isRead: false,
				lobbyId: 'lobby-123',
				inviterName: 'CosmicWarrior',
				inviterId: 'user-456',
				gameMode: 'team_deathmatch',
			},
			{
				id: '2',
				type: 'news',
				title: 'Новое обновление',
				message: 'Вышло обновление 1.2 с новыми картами и улучшениями',
				timestamp: new Date(Date.now() - 2 * 3_600_000),
				isRead: true,
				link: '/news/update-1.2',
			},
			{
				id: '3',
				type: 'friend_request',
				title: 'Запрос в друзья',
				message: 'SpaceExplorer хочет добавить вас в друзья',
				timestamp: new Date(Date.now() - 30 * 60_000),
				isRead: false,
				requesterId: 'user-789',
				requesterName: 'SpaceExplorer',
			},
		]
	)

	const [friends, setFriends] = React.useState<Friend[]>(() => [
		{
			id: 'friend-1',
			username: 'CosmicWarrior',
			email: 'cosmic@example.com',
			status: 'online',
			isFavorite: true,
		},
		{
			id: 'friend-2',
			username: 'SpaceExplorer',
			email: 'space@example.com',
			status: 'in_game',
			isFavorite: true,
		},
		{
			id: 'friend-3',
			username: 'StarTraveler',
			email: 'star@example.com',
			status: 'away',
		},
		{
			id: 'friend-4',
			username: 'GalaxyHunter',
			email: 'galaxy@example.com',
			status: 'offline',
			lastSeen: new Date(Date.now() - 2 * 3_600_000),
		},
		{
			id: 'friend-5',
			username: 'NebulaRunner',
			email: 'nebula@example.com',
			status: 'online',
		},
		{
			id: 'friend-6',
			username: 'QuantumPilot',
			email: 'quantum@example.com',
			status: 'offline',
			lastSeen: new Date(Date.now() - 24 * 3_600_000),
		},
	])

	const scale = useViewportScale()
	const userData = useUserData()

	const finalProfile = React.useMemo(() => {
		if (profile) {
			return {
				status: profile.status,
				userId: profile.userId,
				email: profile.email,
				username: profile.username ?? undefined,
			}
		}

		if (userData.status === 'ok' || userData.status === 'error') {
			return {
				status: userData.status,
				userId: userData.userId,
				email: userData.email,
				username: userData.username ?? GUEST_USERNAME,
			}
		}

		return {
			status: 'loading' as const,
			userId: undefined,
			email: undefined,
			username: undefined,
		}
	}, [profile, userData])

	const finalAvatar = avatar || userData.avatar || FALLBACK_AVATAR

	const handleDropdownToggle = React.useCallback(() => {
		setIsDropdownOpen(prev => !prev)
	}, [])

	const handleDropdownClose = React.useCallback(() => {
		setIsDropdownOpen(false)
	}, [])

	const handleAddCurrency = React.useCallback(() => {
		console.log('Add currency clicked')
	}, [])

	const handleNotificationAction = React.useCallback(
		(notificationId: string, action: string) => {
			console.log(`Notification ${notificationId}: ${action}`)
		},
		[]
	)

	const handleMarkAsRead = React.useCallback((notificationId: string) => {
		setNotifications(prev =>
			prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
		)
	}, [])

	const handleDismissNotification = React.useCallback(
		(notificationId: string) => {
			setNotifications(prev => prev.filter(n => n.id !== notificationId))
		},
		[]
	)

	const handleFriendsClick = React.useCallback(() => {
		setIsFriendsDrawerOpen(true)
		setIsDropdownOpen(false)
	}, [])

	const handleFriendClick = React.useCallback((friend: Friend) => {
		console.log('Friend clicked:', friend.username)
	}, [])

	const handleStartChat = React.useCallback(
		(friendId: string) => {
			console.log('Start chat with:', friendId)
			const friend = friends.find(f => f.id === friendId)
			if (friend) {
				setActiveChat({
					friendId: friend.id,
					friendName: friend.username,
				})
			}
		},
		[friends]
	)

	const handleCloseChat = React.useCallback(() => {
		setActiveChat(null)
	}, [])

	const handleFriendsDrawerClose = React.useCallback(() => {
		setIsFriendsDrawerOpen(false)
		setActiveChat(null)
	}, [])

	const handleViewProfile = React.useCallback((friendId: string) => {
		window.location.href = `/profile/${friendId}`
	}, [])

	const handleRemoveFriend = React.useCallback((friendId: string) => {
		setFriends(prev => prev.filter(f => f.id !== friendId))
	}, [])

	const hudStyle = React.useMemo(
		() =>
			({
				transform: `scale(${scale})`,
				transformOrigin: 'top center',
			}) as React.CSSProperties,
		[scale]
	)

	if (!profile && userData.status === 'loading') {
		return (
			<header
				className={styles.hud}
				style={hudStyle}
				aria-label='Загрузка верхней панели'
			>
				<SkeletonTopHUD showBackLink={variant === 'default'} />
			</header>
		)
	}

	return (
		<>
			<header
				className={styles.hud}
				style={hudStyle}
				aria-label='Верхняя панель управления'
			>
				<div className={styles.leftSection}>
					{variant === 'default' && (
						<nav aria-label='Основная навигация'>
							<a
								href='/'
								className={styles.backLink}
								aria-label='Вернуться на главную страницу'
							>
								<Icon
									type='rocket'
									size='medium'
									alt='Логотип - ракета'
									aria-hidden={true}
								/>
								<span className={styles.backText}>на главную</span>
							</a>
						</nav>
					)}
				</div>

				<div className={styles.hudRight}>
					<Currency value={128} onAdd={handleAddCurrency} />

					<Notifications
						notifications={notifications}
						onNotificationAction={handleNotificationAction}
						onMarkAsRead={handleMarkAsRead}
						onDismiss={handleDismissNotification}
					/>

					<UserDropdown
						profile={{
							username: finalProfile.username || GUEST_USERNAME,
							email: finalProfile.email,
							userId: finalProfile.userId,
						}}
						avatar={finalAvatar}
						isOpen={isDropdownOpen}
						onToggle={handleDropdownToggle}
						onClose={handleDropdownClose}
						onFriendsClick={handleFriendsClick}
					/>

					{/* Drawer существует в DOM только пока открыт */}
					{isFriendsDrawerOpen && (
						<FriendsDrawer
							isOpen={true}
							onClose={handleFriendsDrawerClose}
							friends={friends}
							onFriendClick={handleFriendClick}
							onStartChat={handleStartChat}
							onViewProfile={handleViewProfile}
							onRemoveFriend={handleRemoveFriend}
							activeChatId={activeChat?.friendId}
							onCloseChat={handleCloseChat}
						/>
					)}
				</div>
			</header>

			{/* Чат монтируется только когда есть активный собеседник */}
			{activeChat && (
				<ChatWindow
					isOpen={true}
					onClose={handleCloseChat}
					friendId={activeChat.friendId}
					friendName={activeChat.friendName}
				/>
			)}
		</>
	)
}

function SkeletonTopHUD({ showBackLink }: { showBackLink: boolean }) {
	return (
		<>
			<div className={styles.leftSection}>
				{showBackLink && (
					<div className={styles.backLink}>
						<div className={styles.iconSkeleton}></div>
						<span className={styles.backText}>на главную</span>
					</div>
				)}
			</div>

			<div className={styles.hudRight}>
				<div className={styles.currency}>
					<span className={styles.backText}>128</span>
					<div className={styles.currencyContent}>
						<div className={styles.starSkeleton}></div>
					</div>
				</div>

				<div className={styles.notificationsSkeleton}></div>

				<div className={styles.avatarDropdown}>
					<button className={styles.avatarButton} disabled aria-hidden='true'>
						<div className={styles.avatarContainer}>
							<div className={styles.avatarSkeleton}></div>
						</div>
					</button>
				</div>
			</div>
		</>
	)
}
