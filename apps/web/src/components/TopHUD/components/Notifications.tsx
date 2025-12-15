'use client'

import { Notification, NotificationType } from '@station-eden/shared'
import Image from 'next/image'
import React, { useRef, useEffect } from 'react'
import styles from './Notifications.module.css'

interface NotificationsProps {
	notifications?: Notification[]
	onNotificationAction?: (notificationId: string, action: string) => void
	onMarkAsRead?: (notificationId: string) => void
	onDismiss?: (notificationId: string) => void
}

export function Notifications({
	notifications = [],
	onNotificationAction,
	onMarkAsRead,
	onDismiss,
}: NotificationsProps) {
	const [isOpen, setIsOpen] = React.useState(false)
	const dropdownRef = React.useRef<HTMLDivElement>(null)
	const notificationsListRef = useRef<HTMLDivElement>(null)

	const unreadCount = notifications.filter(n => !n.isRead).length
	const hasNotifications = notifications.length > 0

	// Обработчик прокрутки колесиком мыши для списка уведомлений
	useEffect(() => {
		const container = notificationsListRef.current
		if (!container || !isOpen) return

		const wheelHandler = (e: WheelEvent) => {
			// Проверяем, нужна ли прокрутка (есть ли контент для прокрутки)
			if (container.scrollHeight > container.clientHeight) {
				container.scrollTop += e.deltaY
				e.preventDefault()
			}
		}

		container.addEventListener('wheel', wheelHandler, { passive: false })
		
		return () => {
			container.removeEventListener('wheel', wheelHandler)
		}
	}, [isOpen])

	// Закрытие при клике вне компонента
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	const handleToggle = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsOpen(!isOpen)
	}

	const handleClose = () => {
		setIsOpen(false)
	}

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Escape') {
			handleClose()
		}
	}

	const handleNotificationClick = (notification: Notification) => {
		if (!notification.isRead) {
			onMarkAsRead?.(notification.id)
		}
	}

	const handleAcceptInvite = (notificationId: string, lobbyId: string) => {
		onNotificationAction?.(notificationId, 'accept')
		// Редирект в лобби
		window.location.href = `/lobby/${lobbyId}`
		handleClose()
	}

	const handleDeclineInvite = (notificationId: string) => {
		onNotificationAction?.(notificationId, 'decline')
		onDismiss?.(notificationId)
	}

	const handleDismiss = (notificationId: string, e: React.MouseEvent) => {
		e.stopPropagation()
		onDismiss?.(notificationId)
	}

	const getNotificationIcon = (type: NotificationType) => {
		switch (type) {
			case 'game_invite':
				return '/icons/game-invite.svg'
			case 'friend_request':
				return '/icons/friend-request.svg'
			case 'news':
				return '/icons/news.svg'
			default:
				return '/icons/bell.svg'
		}
	}

	// <-- Исправлено: принимаем string | Date и нормализуем в Date
	const formatTime = (timestamp: Date | string) => {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

		if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
			return ''
		}

		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const minutes = Math.floor(diff / 60000)
		const hours = Math.floor(diff / 3600000)
		const days = Math.floor(diff / 86400000)

		if (minutes < 1) return 'только что'
		if (minutes < 60) return `${minutes} мин назад`
		if (hours < 24) return `${hours} ч назад`
		return `${days} дн назад`
	}

	return (
		<nav
			className={styles.notificationsDropdown}
			ref={dropdownRef}
			onKeyDown={handleKeyDown}
			aria-label='Уведомления'
		>
			<button
				type='button'
				className={styles.notificationsButton}
				onClick={handleToggle}
				aria-expanded={isOpen}
				aria-haspopup='menu'
				aria-label={
					hasNotifications
						? `Уведомления (${unreadCount} непрочитанных)`
						: 'Уведомления'
				}
				title='Уведомления'
			>
				<div className={styles.bellIcon}>
					<Image
						src='/icons/bell.svg'
						alt=''
						width={24}
						height={24}
						className={styles.bellImage}
					/>
				</div>

				{unreadCount > 0 && (
					<span className={styles.badge} aria-live='polite'>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className={styles.dropdownMenu} role='menu'>
					<div className={styles.menuHeader}>
						<h3 className={styles.menuTitle}>Уведомления</h3>
						{hasNotifications && (
							<span className={styles.notificationsCount}>
								{unreadCount} непрочитанных
							</span>
						)}
					</div>

					<div 
						className={styles.notificationsList}
						ref={notificationsListRef}
					>
						{hasNotifications ? (
							<div className={styles.notificationsListInner}>
								{notifications.map(notification => (
									<div
										key={notification.id}
										className={`${styles.notificationItem} ${
											!notification.isRead ? styles.unread : ''
										} ${styles[`type-${notification.type}`]}`}
										onClick={() => handleNotificationClick(notification)}
										role='menuitem'
									>
										<div className={styles.notificationHeader}>
											<div className={styles.notificationIcon}>
												<Image
													src={getNotificationIcon(notification.type)}
													alt=''
													width={16}
													height={16}
												/>
											</div>
											<span className={styles.notificationTitle}>
												{notification.title}
											</span>
											<button
												type='button'
												className={styles.dismissButton}
												onClick={e => handleDismiss(notification.id, e)}
												aria-label='Закрыть уведомление'
											>
												×
											</button>
										</div>

										<div className={styles.notificationContent}>
											<p className={styles.notificationMessage}>
												{notification.message}
											</p>
											<span className={styles.notificationTime}>
												{formatTime(notification.timestamp)}
											</span>
										</div>

										{notification.type === 'game_invite' && (
											<div className={styles.inviteActions}>
												<button
													type='button'
													className={styles.acceptButton}
													onClick={() =>
														handleAcceptInvite(
															notification.id,
															notification.lobbyId
														)
													}
												>
													Принять
												</button>
												<button
													type='button'
													className={styles.declineButton}
													onClick={() => handleDeclineInvite(notification.id)}
												>
													Отклонить
												</button>
											</div>
										)}

										{notification.type === 'friend_request' && (
											<div className={styles.friendActions}>
												<button
													type='button'
													className={styles.acceptButton}
													onClick={() =>
														onNotificationAction?.(notification.id, 'accept')
													}
												>
													Принять
												</button>
												<button
													type='button'
													className={styles.declineButton}
													onClick={() =>
														onNotificationAction?.(notification.id, 'decline')
													}
												>
													Отклонить
												</button>
											</div>
										)}

										{notification.type === 'news' &&
											'link' in notification &&
											notification.link && (
												<button
													type='button'
													className={styles.readMoreButton}
													onClick={() => window.open(notification.link, '_blank')}
												>
													Подробнее
												</button>
											)}
									</div>
								))}
							</div>
						) : (
							<div className={styles.emptyState}>
								<div className={styles.emptyIcon}>🔔</div>
								<p className={styles.emptyText}>Нет уведомлений</p>
								<p className={styles.emptySubtext}>
									Здесь появятся ваши уведомления
								</p>
							</div>
						)}
					</div>

					{hasNotifications && (
						<div className={styles.menuFooter}>
							<button
								type='button'
								className={styles.markAllReadButton}
								onClick={() => notifications.forEach(n => onMarkAsRead?.(n.id))}
							>
								Отметить все как прочитанные
							</button>
						</div>
					)}
				</div>
			)}
		</nav>
	)
}