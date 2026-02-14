// apps/web/src/app/profile/components/EditProfileModal.tsx
'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import ImgCdn from '../../../components/ImgCdn'
import { asset } from '../../../lib/asset'
import styles from './EditProfileModal.module.css'

interface EditProfileModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (avatar: string, frame: string) => Promise<void> | void
	currentAvatar?: string
	currentFrame?: string
}

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
]

function useImagePreload(urls: string[], enabled: boolean) {
	useEffect(() => {
		if (!enabled) return
		urls.forEach(url => {
			const img = new Image()
			img.src = url
		})
	}, [urls, enabled])
}

const LazyImage = ({
	src,
	alt,
	className,
	priority = false,
}: {
	src: string
	alt: string
	className?: string
	priority?: boolean
}) => {
	const [loaded, setLoaded] = useState(priority)

	useEffect(() => {
		let cancelled = false
		if (priority) {
			const img = new Image()
			img.src = src
			img.onload = () => {
				if (!cancelled) setLoaded(true)
			}
		} else {
			setLoaded(true)
		}

		return () => {
			cancelled = true
		}
	}, [src, priority])

	return (
		<ImgCdn
			src={src}
			alt={alt}
			className={`${className ?? ''} ${!loaded ? styles.loading : ''}`.trim()}
		/>
	)
}

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
	const initialAvatar = useMemo(
		() => toAbsolute(currentAvatar) ?? AVATARS[0],
		[currentAvatar],
	)
	const initialFrame = useMemo(
		() => toAbsolute(currentFrame) ?? FRAMES[0],
		[currentFrame],
	)

	const [selectedAvatar, setSelectedAvatar] = useState(initialAvatar)
	const [selectedFrame, setSelectedFrame] = useState(initialFrame)
	const [activeTab, setActiveTab] = useState<'avatars' | 'frames'>('avatars')

	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!isOpen) return
		setSelectedAvatar(initialAvatar)
		setSelectedFrame(initialFrame)
		setActiveTab('avatars')
		setIsSaving(false)
		setError(null)
	}, [isOpen, initialAvatar, initialFrame])

	useImagePreload([initialAvatar, initialFrame], isOpen)

	useEffect(() => {
		if (!isOpen) return
		const avatarsToPreload = AVATARS.slice(0, 4)
		const framesToPreload = FRAMES.slice(0, 4)

		;[...avatarsToPreload, ...framesToPreload].forEach(url => {
			const img = new Image()
			img.src = url
		})
	}, [isOpen])

	if (!isOpen) return null

	const handleTabChange = (tab: 'avatars' | 'frames') => {
		setActiveTab(tab)

		const urlsToPreload = tab === 'avatars' ? AVATARS.slice(4) : FRAMES.slice(4)
		setTimeout(() => {
			urlsToPreload.forEach(url => {
				const img = new Image()
				img.src = url
			})
		}, 100)
	}

	const handleSave = async () => {
		setError(null)
		try {
			setIsSaving(true)
			await onSave(selectedAvatar, selectedFrame)
			onClose()
		} catch (e: unknown) {
			const msg =
				e instanceof Error
					? e.message
					: 'Не удалось сохранить. Попробуйте ещё раз.'
			setError(msg)
		} finally {
			setIsSaving(false)
		}
	}

	const onBackdrop = () => {
		if (!isSaving) onClose()
	}

	const stop = (e: MouseEvent) => e.stopPropagation()

	return (
		<div className={styles.modalOverlay} onClick={onBackdrop}>
			<div className={styles.modalContent} onClick={stop}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>Редактирование профиля</h2>
					<button
						className={styles.closeButton}
						onClick={onClose}
						disabled={isSaving}
						type='button'
					>
						×
					</button>
				</div>

				<div className={styles.tabs}>
					<button
						type='button'
						className={`${styles.tab} ${
							activeTab === 'avatars' ? styles.activeTab : ''
						}`}
						onClick={() => handleTabChange('avatars')}
						disabled={isSaving}
					>
						Аватары
					</button>
					<button
						type='button'
						className={`${styles.tab} ${
							activeTab === 'frames' ? styles.activeTab : ''
						}`}
						onClick={() => handleTabChange('frames')}
						disabled={isSaving}
					>
						Рамки
					</button>
				</div>

				<div className={styles.tabContent}>
					<div className={styles.previewSection}>
						<h3 className={styles.previewTitle}>Предпросмотр</h3>
						<div className={styles.previewContainer}>
							<div className={styles.previewWrapper}>
								<div className={styles.previewImage}>
									<div className={styles.avatarFrameContainer}>
										<div className={styles.avatarImageContainer}>
											<LazyImage
												src={selectedAvatar}
												alt='Аватар'
												priority={true}
												className={styles.previewAvatar}
											/>
										</div>
										<LazyImage
											src={selectedFrame}
											alt='Рамка'
											priority={true}
											className={styles.previewFrame}
										/>
									</div>
								</div>
							</div>

							<div className={styles.previewInfo}>
								<div className={styles.previewItem}>
									<span>Аватар:</span>
									<span className={styles.previewValue}>выбран</span>
								</div>
								<div className={styles.previewItem}>
									<span>Рамка:</span>
									<span className={styles.previewValue}>выбрана</span>
								</div>
							</div>
						</div>
					</div>

					<div className={styles.selectionSection}>
						{activeTab === 'avatars' && (
							<div>
								<h3 className={styles.sectionTitle}>Выберите аватар</h3>
								<div className={styles.grid}>
									{AVATARS.map((avatarUrl, index) => (
										<button
											key={avatarUrl}
											type='button'
											className={`${styles.option} ${
												selectedAvatar === avatarUrl ? styles.selected : ''
											}`}
											onClick={() => setSelectedAvatar(avatarUrl)}
											disabled={isSaving}
										>
											<LazyImage
												src={avatarUrl}
												alt='Аватар'
												className={styles.optionImage}
												priority={index < 4}
											/>
											{selectedAvatar === avatarUrl && (
												<div className={styles.selectedBadge}>✓</div>
											)}
										</button>
									))}
								</div>
							</div>
						)}

						{activeTab === 'frames' && (
							<div>
								<h3 className={styles.sectionTitle}>Выберите рамку</h3>
								<div className={styles.grid}>
									{FRAMES.map((frameUrl, index) => (
										<button
											key={frameUrl}
											type='button'
											className={`${styles.option} ${
												selectedFrame === frameUrl ? styles.selected : ''
											}`}
											onClick={() => setSelectedFrame(frameUrl)}
											disabled={isSaving}
										>
											<LazyImage
												src={frameUrl}
												alt='Рамка'
												className={styles.optionImage}
												priority={index < 4}
											/>
											{selectedFrame === frameUrl && (
												<div className={styles.selectedBadge}>✓</div>
											)}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{error && <p className={styles.errorText}>{error}</p>}

				<div className={styles.modalActions}>
					<button
						className={styles.cancelButton}
						onClick={onClose}
						disabled={isSaving}
						type='button'
					>
						Отмена
					</button>
					<button
						className={styles.saveButton}
						onClick={handleSave}
						disabled={isSaving}
						type='button'
					>
						{isSaving ? 'сохранение…' : 'Сохранить изменения'}
					</button>
				</div>
			</div>
		</div>
	)
}
