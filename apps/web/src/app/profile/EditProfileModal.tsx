'use client'

import { useState } from 'react'
import styles from './EditProfileModal.module.css'

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (avatar: string, frame: string) => void
	currentAvatar?: string
	currentFrame?: string
}

const AVATARS = [
	'/avatars/avatar1.png',
	'/avatars/avatar2.png',
	'/avatars/avatar3.png',
	'/avatars/avatar4.png',
	'/avatars/avatar5.png',
	'/avatars/avatar6.png',
	'/avatars/avatar7.png',
	'/avatars/avatar8.png',
	'/avatars/avatar9.png',
	'/avatars/avatar10.png',
	'/avatars/avatar11.png',
]

const FRAMES = [
	'/frames/frame1.png',
	'/frames/frame2.png',
	'/frames/frame3.png',
	'/frames/frame4.png',
	'/frames/frame5.png',
	'/frames/frame6.png',
	'/frames/frame7.png',
	'/frames/frame8.png',
	'/frames/frame9.png',
]

export default function EditProfileModal({
	isOpen,
	onClose,
	onSave,
	currentAvatar = AVATARS[0],
	currentFrame = FRAMES[0],
}: EditProfileModalProps) {
	const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar)
	const [selectedFrame, setSelectedFrame] = useState(currentFrame)

	if (!isOpen) return null

	const handleSave = () => {
		onSave(selectedAvatar, selectedFrame)
		onClose()
	}

	return (
		<div className={styles.overlay}>
			<div className={styles.modal}>
				<div className={styles.header}>
					<h2>Редактировать профиль</h2>
					<button className={styles.closeButton} onClick={onClose}>
						×
					</button>
				</div>

				<div className={styles.content}>
					<div className={styles.preview}>
						<div className={styles.previewContainer}>
							<img
								src={selectedAvatar}
								alt='Аватар'
								className={styles.previewAvatar}
							/>
							<img
								src={selectedFrame}
								alt='Рамка'
								className={styles.previewFrame}
							/>
						</div>
					</div>

					<div className={styles.section}>
						<h3>Выберите аватарку</h3>
						<div className={styles.grid}>
							{AVATARS.map(avatar => (
								<button
									key={avatar}
									className={`${styles.avatarOption} ${selectedAvatar === avatar ? styles.selected : ''}`}
									onClick={() => setSelectedAvatar(avatar)}
								>
									<img src={avatar} alt='Аватар' />
								</button>
							))}
						</div>
					</div>

					<div className={styles.section}>
						<h3>Выберите рамку</h3>
						<div className={styles.grid}>
							{FRAMES.map(frame => (
								<button
									key={frame}
									className={`${styles.frameOption} ${selectedFrame === frame ? styles.selected : ''}`}
									onClick={() => setSelectedFrame(frame)}
								>
									<img src={frame} alt='Рамка' />
								</button>
							))}
						</div>
					</div>

					<div className={styles.actions}>
						<button className={styles.cancelButton} onClick={onClose}>
							Отмена
						</button>
						<button className={styles.saveButton} onClick={handleSave}>
							Сохранить
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
