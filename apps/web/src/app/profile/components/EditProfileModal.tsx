'use client'

import { useMemo, useState, useEffect, useRef } from 'react' // ← ДОБАВЛЕН useRef
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

// Хук для предзагрузки изображений
function useImagePreload(urls: string[]) {
  useEffect(() => {
    urls.forEach(url => {
      const img = new Image()
      img.src = url
    })
  }, [urls])
}

// Оптимизированный компонент для изображений с ленивой загрузкой
const LazyImage = ({ src, alt, className, priority = false }: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) => {
  const [loaded, setLoaded] = useState(priority)
  
  useEffect(() => {
    if (priority) {
      const img = new Image()
      img.src = src
      img.onload = () => setLoaded(true)
    }
  }, [src, priority])

  return (
    <ImgCdn
      src={src}
      alt={alt}
      className={`${className} ${!loaded ? styles.loading : ''}`}
    />
  )
}

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

  // Предзагрузка изображений при открытии модалки
  useImagePreload([initialAvatar, initialFrame])
  
  // Предзагрузка всех изображений при монтировании (осторожно с количеством)
  useEffect(() => {
    if (isOpen) {
      // Предзагружаем только первые несколько изображений каждого типа
      const avatarsToPreload = AVATARS.slice(0, 4)
      const framesToPreload = FRAMES.slice(0, 4)
      
      ;[...avatarsToPreload, ...framesToPreload].forEach(url => {
        const img = new Image()
        img.src = url
      })
    }
  }, [isOpen])

	if (!isOpen) return null

	const handleSave = () => {
		onSave(selectedAvatar!, selectedFrame!)
		onClose()
	}

  // Предзагрузка изображений при смене таба
  const handleTabChange = (tab: 'avatars' | 'frames') => {
    setActiveTab(tab)
    
    // Предзагружаем изображения для нового таба
    const urlsToPreload = tab === 'avatars' ? AVATARS.slice(4) : FRAMES.slice(4)
    setTimeout(() => {
      urlsToPreload.forEach(url => {
        const img = new Image()
        img.src = url
      })
    }, 100)
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
						onClick={() => handleTabChange('avatars')}
					>
						Аватары
					</button>
					<button 
						className={`${styles.tab} ${activeTab === 'frames' ? styles.activeTab : ''}`}
						onClick={() => handleTabChange('frames')}
					>
						Рамки
					</button>
				</div>

				<div className={styles.tabContent}>
					<div className={styles.previewSection}>
						<h3 className={styles.previewTitle}>Предпросмотр</h3>
						<div className={styles.previewContainer}>
							<div className={styles.previewImage}>
								<LazyImage
									src={selectedAvatar}
									alt='Аватар'
                  priority={true}
									className={styles.previewAvatar}
								/>
								<LazyImage
									src={selectedFrame}
									alt='Рамка'
                  priority={true}
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
									{AVATARS.map((avatar, index) => (
										<button
											key={avatar}
											className={`${styles.option} ${selectedAvatar === avatar ? styles.selected : ''}`}
											onClick={() => setSelectedAvatar(avatar)}
										>
											<LazyImage 
                        src={avatar} 
                        alt='Аватар' 
                        className={styles.optionImage}
                        priority={index < 4} // Приоритетная загрузка первых 4
                      />
											{selectedAvatar === avatar && <div className={styles.selectedBadge}>✓</div>}
										</button>
									))}
								</div>
							</div>
						)}

						{activeTab === 'frames' && (
							<div>
								<h3 className={styles.sectionTitle}>Выберите рамку</h3>
								<div className={styles.grid}>
									{FRAMES.map((frame, index) => (
										<button
											key={frame}
											className={`${styles.option} ${selectedFrame === frame ? styles.selected : ''}`}
											onClick={() => setSelectedFrame(frame)}
										>
											<LazyImage 
                        src={frame} 
                        alt='Рамка' 
                        className={styles.optionImage}
                        priority={index < 4} // Приоритетная загрузка первых 4
                      />
											{selectedFrame === frame && <div className={styles.selectedBadge}>✓</div>}
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