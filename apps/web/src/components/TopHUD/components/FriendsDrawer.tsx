// apps/web/src/components/TopHUD/components/FriendsDrawer.tsx
'use client'

import { Friend } from '@station-eden/shared'
import Image from 'next/image'
import React from 'react'
import styles from './FriendsDrawer.module.css'

interface FriendsDrawerProps {
	isOpen: boolean
	onClose: () => void
	friends?: Friend[]
	onFriendClick: (friend: Friend) => void
	onStartChat: (friendId: string) => void
	onViewProfile: (friendId: string) => void
	onRemoveFriend: (friendId: string) => void
	activeChatId?: string | null
	onCloseChat?: () => void
}

export function FriendsDrawer({
	isOpen,
	onClose,
	friends = [],
	onFriendClick,
	onStartChat,
	onViewProfile,
	onRemoveFriend,
	activeChatId = null,
	onCloseChat,
}: FriendsDrawerProps) {
	const drawerRef = React.useRef<HTMLDivElement>(null)

	// Закрытие при клике вне компонента - исправленная версия
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// Проверяем, что клик был вне drawer и не по чату
			if (
				drawerRef.current &&
				!drawerRef.current.contains(event.target as Node) &&
				!(event.target as Element).closest('[data-chat-window]')
			) {
				onClose()
				// При клике вне области также закрываем чат, если он открыт
				if (activeChatId && onCloseChat) {
					onCloseChat()
				}
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.body.style.overflow = 'unset'
		}
	}, [isOpen, onClose, activeChatId, onCloseChat])

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Escape') {
			onClose()
			// При Escape также закрываем чат, если он открыт
			if (activeChatId && onCloseChat) {
				onCloseChat()
			}
		}
	}

	const onlineFriends = friends.filter(f => f.status === 'online')
	const offlineFriends = friends.filter(f => f.status !== 'online')

	// Мемоизируем обработчики чтобы предотвратить лишние рендеры
	const handleCloseClick = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation()
			onClose()
			// При закрытии FriendsDrawer также закрываем чат
			if (activeChatId && onCloseChat) {
				onCloseChat()
			}
		},
		[onClose, activeChatId, onCloseChat],
	)

	return (
		<>
			{/* Overlay */}
			{isOpen && <div className={styles.overlay} />}

			{/* Drawer */}
			<div
				ref={drawerRef}
				className={`${styles.drawer} ${isOpen ? styles.open : ''} ${activeChatId ? styles.withChat : ''}`}
				onKeyDown={handleKeyDown}
				aria-label='Список друзей'
			>
				<div className={styles.header}>
					<h2 className={styles.title}>Друзья</h2>
					<button
						type='button'
						className={styles.closeButton}
						onClick={handleCloseClick}
						aria-label='Закрыть список друзей'
					>
						×
					</button>
				</div>

				<div className={styles.content}>
					{/* Онлайн друзья */}
					{onlineFriends.length > 0 && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								В сети ({onlineFriends.length})
							</h3>
							<div className={styles.friendsList}>
								{onlineFriends.map(friend => (
									<FriendItem
										key={friend.id}
										friend={friend}
										onFriendClick={onFriendClick}
										onStartChat={onStartChat}
										onViewProfile={onViewProfile}
										onRemoveFriend={onRemoveFriend}
										isActiveChat={friend.id === activeChatId}
									/>
								))}
							</div>
						</div>
					)}

					{/* Оффлайн друзья */}
					{offlineFriends.length > 0 && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								Не в сети ({offlineFriends.length})
							</h3>
							<div className={styles.friendsList}>
								{offlineFriends.map(friend => (
									<FriendItem
										key={friend.id}
										friend={friend}
										onFriendClick={onFriendClick}
										onStartChat={onStartChat}
										onViewProfile={onViewProfile}
										onRemoveFriend={onRemoveFriend}
										isActiveChat={friend.id === activeChatId}
									/>
								))}
							</div>
						</div>
					)}

					{/* Нет друзей */}
					{friends.length === 0 && (
						<div className={styles.emptyState}>
							<div className={styles.emptyIcon}>👥</div>
							<p className={styles.emptyText}>Пока нет друзей</p>
							<p className={styles.emptySubtext}>
								Добавьте друзей, чтобы видеть их статус и общаться
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

// Компонент элемента друга с мемоизацией
const FriendItem = React.memo(function FriendItem({
	friend,
	onFriendClick,
	onStartChat,
	onViewProfile,
	onRemoveFriend,
	isActiveChat = false,
}: {
	friend: Friend
	onFriendClick: (friend: Friend) => void
	onStartChat: (friendId: string) => void
	onViewProfile: (friendId: string) => void
	onRemoveFriend: (friendId: string) => void
	isActiveChat?: boolean
}) {
	const [showMenu, setShowMenu] = React.useState(false)
	const menuRef = React.useRef<HTMLDivElement>(null)

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false)
			}
		}

		if (showMenu) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [showMenu])

	const handleMenuToggle = React.useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		setShowMenu(prev => !prev)
	}, [])

	const handleAction = React.useCallback(
		(action: string, e: React.MouseEvent) => {
			e.stopPropagation()
			setShowMenu(false)

			switch (action) {
				case 'chat':
					onStartChat(friend.id)
					break
				case 'profile':
					onViewProfile(friend.id)
					break
				case 'remove':
					onRemoveFriend(friend.id)
					break
			}
		},
		[friend.id, onStartChat, onViewProfile, onRemoveFriend],
	)

	const handleChatClick = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation()
			onStartChat(friend.id)
		},
		[friend.id, onStartChat],
	)

	const handleFriendClick = React.useCallback(() => {
		onFriendClick(friend)
	}, [friend, onFriendClick])

	const getStatusText = (status: Friend['status']): string => {
		switch (status) {
			case 'online':
				return 'В сети'
			case 'offline':
				return 'Не в сети'
			case 'away':
				return 'Отошёл'
			case 'in_game':
				return 'В игре'
			default:
				return 'Не в сети'
		}
	}

	return (
		<div
			className={`${styles.friendItem} ${isActiveChat ? styles.activeChat : ''}`}
			onClick={handleFriendClick}
		>
			<div className={styles.friendMain}>
				<div className={styles.friendAvatar}>
					{friend.avatar ? (
						<Image
							src={friend.avatar}
							alt=''
							width={40}
							height={40}
							className={styles.avatarImage}
						/>
					) : (
						<div className={styles.avatarPlaceholder}>
							{friend.username.charAt(0).toUpperCase()}
						</div>
					)}
					<span
						className={`${styles.statusIndicator} ${styles[friend.status]}`}
					/>
				</div>

				<div className={styles.friendInfo}>
					<span className={styles.friendName}>{friend.username}</span>
					<span className={styles.friendStatus}>
						{getStatusText(friend.status)}
						{isActiveChat && (
							<span className={styles.activeChatBadge}> ● в чате</span>
						)}
					</span>
				</div>

				<div className={styles.friendActions}>
					{friend.status === 'online' && (
						<button
							type='button'
							className={styles.chatButton}
							onClick={handleChatClick}
							aria-label='Начать чат'
							title='Начать чат'
						>
							<svg
								width='16'
								height='16'
								viewBox='0 0 24 24'
								fill='currentColor'
								className={styles.chatIcon}
							>
								<path d='M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z' />
							</svg>
						</button>
					)}

					<button
						type='button'
						className={styles.menuButton}
						onClick={handleMenuToggle}
						aria-label='Действия с другом'
						aria-expanded={showMenu}
					>
						⋮
					</button>
				</div>
			</div>

			{showMenu && (
				<div className={styles.contextMenu} ref={menuRef}>
					<button
						type='button'
						className={styles.menuItem}
						onClick={e => handleAction('profile', e)}
					>
						<svg
							width='14'
							height='14'
							viewBox='0 0 24 24'
							fill='currentColor'
							className={styles.menuIcon}
						>
							<path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
						</svg>
						Профиль
					</button>
					<button
						type='button'
						className={styles.menuItem}
						onClick={e => handleAction('chat', e)}
						disabled={friend.status !== 'online'}
					>
						<svg
							width='14'
							height='14'
							viewBox='0 0 24 24'
							fill='currentColor'
							className={styles.menuIcon}
						>
							<path d='M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z' />
						</svg>
						Чат
					</button>
					<button
						type='button'
						className={`${styles.menuItem} ${styles.danger}`}
						onClick={e => handleAction('remove', e)}
					>
						<svg
							width='14'
							height='14'
							viewBox='0 0 24 24'
							fill='currentColor'
							className={styles.menuIcon}
						>
							<path d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />
						</svg>
						Удалить
					</button>
				</div>
			)}
		</div>
	)
})
