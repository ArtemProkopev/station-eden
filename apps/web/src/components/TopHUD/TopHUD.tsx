// apps/web/src/components/TopHUD/TopHUD.tsx
'use client'

import React from 'react'
import { useUserData } from '../../hooks/useUserData'
import styles from './TopHUD.module.css'
import { Currency } from './components/Currency'
import { Icon } from './components/Icon'
import { UserDropdown } from './components/UserDropdown'
import { Notifications } from './components/Notifications'
import { useViewportScale } from './hooks/useViewportScale'
import { Notification } from '@station-eden/shared'

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
	 * 'main' - скрывает кнопку "На главную" (для главной страницы)
	 */
	variant?: 'default' | 'main'
}

export default function TopHUD({
	profile,
	avatar,
	variant = 'default',
}: TopHUDProps) {
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
	const [notifications, setNotifications] = React.useState<Notification[]>([
		{
			id: '1',
			type: 'game_invite',
			title: 'Приглашение в игру',
			message: 'Игрок CosmicWarrior приглашает вас в игру',
			timestamp: new Date(Date.now() - 5 * 60000), 
			isRead: false,
			lobbyId: 'lobby-123',
			inviterName: 'CosmicWarrior',
			inviterId: 'user-456',
			gameMode: 'team_deathmatch'
		},
		{
			id: '2',
			type: 'news',
			title: 'Новое обновление',
			message: 'Вышло обновление 1.2 с новыми картами и улучшениями',
			timestamp: new Date(Date.now() - 2 * 3600000), 
			isRead: true,
			link: '/news/update-1.2'
		},
		{
			id: '3',
			type: 'friend_request',
			title: 'Запрос в друзья',
			message: 'SpaceExplorer хочет добавить вас в друзья',
			timestamp: new Date(Date.now() - 30 * 60000), 
			isRead: false,
			requesterId: 'user-789',
			requesterName: 'SpaceExplorer'
		}
	])

	const scale = useViewportScale()
	const userData = useUserData()

	// Стабильные значения для предотвращения мигания
	const finalAvatar = avatar || userData.avatar
	const finalProfile = profile || {
		status:
			userData.status === 'ok'
				? 'ok'
				: userData.status === 'error'
					? 'error'
					: 'loading',
		username: userData.username,
		email: userData.email,
		userId: userData.userId,
	}

	const handleDropdownToggle = () => setIsDropdownOpen(!isDropdownOpen)
	const handleDropdownClose = () => setIsDropdownOpen(false)
	const handleAddCurrency = () => console.log('Add currency clicked')

	// Обработчики для уведомлений
	const handleNotificationAction = (notificationId: string, action: string) => {
		console.log(`Notification ${notificationId}: ${action}`)
		// Здесь будет логика обработки действий с уведомлениями
	}

	const handleMarkAsRead = (notificationId: string) => {
		setNotifications(prev => 
			prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
		)
	}

	const handleDismissNotification = (notificationId: string) => {
		setNotifications(prev => prev.filter(n => n.id !== notificationId))
	}

	const hudStyle = {
		transform: `scale(${scale})`,
		transformOrigin: 'top center',
	} as React.CSSProperties

	// Скелетон при загрузке
	if (userData.status === 'loading') {
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
		<header
			className={styles.hud}
			style={hudStyle}
			aria-label='Верхняя панель управления'
		>
			{/* Левая часть: Навигация (или пустой блок для сохранения layout) */}
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

			{/* Правая часть: Валюта, Уведомления и Профиль */}
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
						username: finalProfile.username || undefined,
						email: finalProfile.email,
						userId: finalProfile.userId,
					}}
					avatar={finalAvatar}
					isOpen={isDropdownOpen}
					onToggle={handleDropdownToggle}
					onClose={handleDropdownClose}
				/>
			</div>
		</header>
	)
}

// Обновляем скелетон
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

				{/* Скелетон для кнопки уведомлений */}
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