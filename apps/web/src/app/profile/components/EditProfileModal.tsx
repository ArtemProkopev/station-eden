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
	const [activeTab, setActiveTab] = useState<'avatars' | 'frames'>('avatars')

	if (!isOpen) return null

	const handleSave = () => {
		// Всегда сохраняем абсолютные ссылки (у нас уже так)
		onSave(selectedAvatar!, selectedFrame!)
		onClose()
	}

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>Редактирование профиля</h2>
					<button className={styles.closeButton} onClick={onClose}>
						×
					</button>
				</div>

				<div className={styles.tabs}>
					<button 
						className={`${styles.tab} ${activeTab === 'avatars' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('avatars')}
					>
						Аватары
					</button>
					<button 
						className={`${styles.tab} ${activeTab === 'frames' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('frames')}
					>
						Рамки
					</button>
				</div>

				<div className={styles.tabContent}>
					<div className={styles.previewSection}>
						<h3 className={styles.previewTitle}>Предпросмотр</h3>
						<div className={styles.previewContainer}>
							<div className={styles.previewImage}>
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
							<div className={styles.previewInfo}>
								<div className={styles.previewItem}>
									<span>Аватар:</span>
									<span className={styles.previewValue}>Выбран</span>
								</div>
								<div className={styles.previewItem}>
									<span>Рамка:</span>
									<span className={styles.previewValue}>Выбрана</span>
								</div>
							</div>
						</div>
					</div>

					<div className={styles.selectionSection}>
						{activeTab === 'avatars' && (
							<div>
								<h3 className={styles.sectionTitle}>Выберите аватар</h3>
								<div className={styles.grid}>
									{AVATARS.map(a => (
										<button
											key={a}
											className={`${styles.option} ${selectedAvatar === a ? styles.selected : ''}`}
											onClick={() => setSelectedAvatar(a)}
										>
											<ImgCdn src={a} alt='Аватар' className={styles.optionImage} />
											{selectedAvatar === a && <div className={styles.selectedBadge}>✓</div>}
										</button>
									))}
								</div>
							</div>
						)}

						{activeTab === 'frames' && (
							<div>
								<h3 className={styles.sectionTitle}>Выберите рамку</h3>
								<div className={styles.grid}>
									{FRAMES.map(f => (
										<button
											key={f}
											className={`${styles.option} ${selectedFrame === f ? styles.selected : ''}`}
											onClick={() => setSelectedFrame(f)}
										>
											<ImgCdn src={f} alt='Рамка' className={styles.optionImage} />
											{selectedFrame === f && <div className={styles.selectedBadge}>✓</div>}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				<div className={styles.modalActions}>
					<button className={styles.cancelButton} onClick={onClose}>
						Отмена
					</button>
					<button className={styles.saveButton} onClick={handleSave}>
						Сохранить изменения
					</button>
				</div>
			</div>
		</div>
	)
}