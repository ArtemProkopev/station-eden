'use client'

import { useMemo, useState } from 'react'
import ImgCdn from '../../../components/ImgCdn'
import { asset } from '../../../lib/asset'
import styles from './EditProfileModal.module.css'

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (avatar: string, frame: string) => void
	currentAvatar?: string
	currentFrame?: string
}

// Наборы доступных картинок сразу как абсолютные CDN/S3-URL
const AVATARS = [
	asset('/avatars/avatar1.png'),
	asset('/avatars/avatar2.png'),
	asset('/avatars/avatar3.png'),
	asset('/avatars/avatar4.png'),
	asset('/avatars/avatar5.png'),
	asset('/avatars/avatar6.png'),
	asset('/avatars/avatar7.png'),
	asset('/avatars/avatar8.png'),
	asset('/avatars/avatar9.png'),
	asset('/avatars/avatar10.png'),
	asset('/avatars/avatar11.png'),
	asset('/avatars/testavatar.png'),
]

const FRAMES = [
	asset('/frames/frame1.png'),
	asset('/frames/frame2.png'),
	asset('/frames/frame3.png'),
	asset('/frames/frame4.png'),
	asset('/frames/frame5.png'),
	asset('/frames/frame6.png'),
	asset('/frames/frame7.png'),
	asset('/frames/frame8.png'),
	asset('/frames/frame9.png'),
	asset('/frames/testframe.png'),
]

// Нормализуем входящее значение к абсолютному URL
function toAbsolute(url?: string) {
	if (!url) return undefined
	return /^https?:\/\//.test(url) ? url : asset(url)
}

export default function EditProfileModal({
	isOpen,
	onClose,
	onSave,
	currentAvatar,
	currentFrame,
}: EditProfileModalProps) {
	// Дефолты + миграция старых относительных значений к абсолютным
	const initialAvatar = useMemo(
		() => toAbsolute(currentAvatar) ?? AVATARS[0],
		[currentAvatar]
	)
	const initialFrame = useMemo(
		() => toAbsolute(currentFrame) ?? FRAMES[0],
		[currentFrame]
	)

	const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar)
	const [selectedFrame, setSelectedFrame] = useState(initialFrame)

	if (!isOpen) return null

	const handleSave = () => {
		// Всегда сохраняем абсолютные ссылки (у нас уже так)
		onSave(selectedAvatar!, selectedFrame!)
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
							<ImgCdn
								src={selectedAvatar!}
								alt='Аватар'
								className={styles.previewAvatar}
							/>
							<ImgCdn
								src={selectedFrame!}
								alt='Рамка'
								className={styles.previewFrame}
							/>
						</div>
					</div>

					<div className={styles.section}>
						<h3>Выберите аватарку</h3>
						<div className={styles.grid}>
							{AVATARS.map(a => (
								<button
									key={a}
									className={`${styles.avatarOption} ${selectedAvatar === a ? styles.selected : ''}`}
									onClick={() => setSelectedAvatar(a)}
								>
									<ImgCdn src={a} alt='Аватар' />
								</button>
							))}
						</div>
					</div>

					<div className={styles.section}>
						<h3>Выберите рамку</h3>
						<div className={styles.grid}>
							{FRAMES.map(f => (
								<button
									key={f}
									className={`${styles.frameOption} ${selectedFrame === f ? styles.selected : ''}`}
									onClick={() => setSelectedFrame(f)}
								>
									<ImgCdn src={f} alt='Рамка' />
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
