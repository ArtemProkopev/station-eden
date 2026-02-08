'use client'

import { memo, useCallback, useState } from 'react'
import styles from './AddPlayerModal.module.css'

interface AddPlayerModalProps {
	isOpen: boolean
	onClose: () => void
	onAddPlayer: (playerData?: {
		id?: string
		name?: string
		avatar?: string
	}) => void
}

type Friend = {
	id: string
	name: string
	avatar: string
}

const FRIENDS_LIST: Friend[] = [
	{ id: '1', name: 'Друг_1', avatar: '' },
	{ id: '2', name: 'Друг_2', avatar: '' },
	{ id: '3', name: 'Друг_3', avatar: '' },
]

export const AddPlayerModal = memo(function AddPlayerModal({
	isOpen,
	onClose,
	onAddPlayer,
}: AddPlayerModalProps) {
	const [activeTab, setActiveTab] = useState<'id' | 'friends'>('id')
	const [playerId, setPlayerId] = useState('')

	const handleAddById = useCallback(() => {
		if (playerId.trim()) {
			onAddPlayer({ id: playerId, name: `Игрок_${playerId}` })
			setPlayerId('')
		}
	}, [playerId, onAddPlayer])

	const handleAddFriend = useCallback(
		(friend: Friend) => {
			onAddPlayer(friend)
		},
		[onAddPlayer]
	)

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && activeTab === 'id') {
				e.preventDefault()
				handleAddById()
			}
		},
		[activeTab, handleAddById]
	)

	if (!isOpen) return null

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>Добавить игрока</h2>
					<button className={styles.closeButton} onClick={onClose}>
						×
					</button>
				</div>

				<div className={styles.tabs}>
					<button
						className={`${styles.tab} ${activeTab === 'id' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('id')}
					>
						По ID игрока
					</button>
					<button
						className={`${styles.tab} ${activeTab === 'friends' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('friends')}
					>
						Из списка друзей
					</button>
				</div>

				<div className={styles.tabContent}>
					{activeTab === 'id' && (
						<div className={styles.idTab}>
							<input
								type='text'
								value={playerId}
								onChange={e => setPlayerId(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder='Введите ID игрока'
								className={styles.idInput}
							/>
							<button
								className={styles.addButton}
								onClick={handleAddById}
								disabled={!playerId.trim()}
							>
								Добавить по ID
							</button>
						</div>
					)}

					{activeTab === 'friends' && (
						<div className={styles.friendsTab}>
							<div className={styles.friendsList}>
								{FRIENDS_LIST.map(friend => (
									<div key={friend.id} className={styles.friendItem}>
										<div className={styles.friendInfo}>
											<div className={styles.friendAvatar}></div>
											<span className={styles.friendName}>{friend.name}</span>
										</div>
										<button
											className={styles.addFriendButton}
											onClick={() => handleAddFriend(friend)}
										>
											Добавить
										</button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
})
