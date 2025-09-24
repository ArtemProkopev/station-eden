'use client'

import { useEffect, useState } from 'react'
import CopyButton from './CopyButton'
import EditProfileModal from './EditProfileModal'
import LogoutButton from './LogoutButton'
import styles from './page.module.css'

interface ProfileData {
	status: 'loading' | 'error' | 'ok' | 'unauth'
	userId?: string
	email?: string
	message?: string
}

function formatId(id: string) {
	return id.replace(/-/g, '\u2009–\u2009')
}

// Локальное хранилище для аватарок и рамок
const STORAGE_KEYS = {
	AVATAR: 'profile_avatar',
	FRAME: 'profile_frame',
}

const DEFAULT_AVATAR = '/avatars/avatar1.png'
const DEFAULT_FRAME = '/frames/frame1.png'

const DEFAULT_PROFILE_DATA: ProfileData = { status: 'loading' }

export default function ProfilePage() {
	const [me, setMe] = useState<ProfileData>(DEFAULT_PROFILE_DATA)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
	const [frame, setFrame] = useState(DEFAULT_FRAME)

	useEffect(() => {
		const loadUserData = async () => {
			try {
				const API_BASE =
					process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
				const r = await fetch(`${API_BASE}/auth/me`, {
					credentials: 'include',
					cache: 'no-store',
				})

				// Красиво обрабатываем неавторизованного пользователя
				if (r.status === 401) {
					setMe({
						status: 'unauth',
						message:
							'Вы не авторизованы. Войдите в аккаунт, чтобы открыть профиль.',
					})
					return
				}

				if (!r.ok) throw new Error(`HTTP ${r.status}`)

				const raw = await r.json()
				const payload = raw?.data ?? raw
				const userId = payload?.userId
				const email = payload?.email

				if (typeof userId === 'string' && typeof email === 'string') {
					setMe({ status: 'ok', userId, email })
				} else {
					throw new Error('Malformed response')
				}
			} catch (e: any) {
				setMe({
					status: 'error',
					message: e?.message || 'Не удалось загрузить профиль',
				})
			}
		}

		// Подтягиваем локально сохранённые аватар/рамку
		const savedAvatar = localStorage.getItem(STORAGE_KEYS.AVATAR)
		const savedFrame = localStorage.getItem(STORAGE_KEYS.FRAME)
		if (savedAvatar) setAvatar(savedAvatar)
		if (savedFrame) setFrame(savedFrame)

		loadUserData()
	}, [])

	const handleSaveProfile = (newAvatar: string, newFrame: string) => {
		setAvatar(newAvatar)
		setFrame(newFrame)
		localStorage.setItem(STORAGE_KEYS.AVATAR, newAvatar)
		localStorage.setItem(STORAGE_KEYS.FRAME, newFrame)
	}

	// Скелетон
	if (me.status === 'loading') {
		return (
			<div className={styles.scene}>
				<div className={styles.panel}>
					<div className={styles.grid}>
						<div className={styles.skel} aria-hidden />
					</div>
				</div>
			</div>
		)
	}

	// Экран для неавторизованного (401)
	if (me.status === 'unauth') {
		return (
			<div className={styles.scene}>
				<div className={styles.panel}>
					<div className={styles.grid}>
						<section className={styles.main}>
							<div className={styles.headerRow}>
								<h1 className={styles.title}>Профиль</h1>
							</div>

							<div className={styles.card}>
								<div className={styles.cardContent}>
									<div style={{ textAlign: 'center' }}>
										<div
											style={{
												fontFamily: 'RussoOne, sans-serif',
												fontSize: 64,
												color: '#fff',
												WebkitTextStroke: '3px #7050d5',
												textShadow:
													'0 3px 0 #5a3fb5, 0 6px 10px rgba(0,0,0,0.25)',
												lineHeight: 1,
												marginBottom: 8,
											}}
										>
											401
										</div>
										<p
											style={{
												margin: '0 0 12px',
												color: '#eaeaff',
												fontFamily: 'Nunito, sans-serif',
											}}
										>
											{me.message}
										</p>

										<div
											style={{
												display: 'grid',
												gap: 10,
												justifyItems: 'center',
											}}
										>
											<a
												className={styles.editButton}
												href='/login?next=/profile'
											>
												Войти
											</a>
											<a href='/' className={styles.exitLink}>
												На главную
											</a>
										</div>
									</div>
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={styles.scene}>
			<div className={styles.panel}>
				<div className={styles.grid}>
					{/* левая колонка */}
					<aside className={styles.side}>
						<div className={styles.avatarContainer}>
							<img src={avatar} alt='Аватар' className={styles.avatarImage} />
							<img src={frame} alt='Рамка' className={styles.frameImage} />
						</div>

						<button
							className={styles.editButton}
							onClick={() => setIsEditModalOpen(true)}
						>
							Редактировать профиль
						</button>

						{me.status === 'ok' ? (
							<div className={styles.emailBlock} title={me.email}>
								<div className={styles.emailCaption}>Входит как</div>
								<div className={styles.emailValue}>{me.email}</div>
								<LogoutButton />
							</div>
						) : (
							<div className={styles.errorMini}>{me.message}</div>
						)}
					</aside>

					{/* правая колонка */}
					<section className={styles.main}>
						<div className={styles.headerRow}>
							<h1 className={styles.title}>Профиль</h1>
						</div>

						{me.status === 'error' && (
							<div className={styles.error}>{me.message}</div>
						)}

						{me.status === 'ok' && (
							<div className={styles.card}>
								<div className={styles.row}>
									<div className={styles.label}>Игровой ID</div>
									<CopyButton value={me.userId!} />
								</div>

								<code
									className={styles.idBadge}
									title={me.userId}
									aria-describedby='id-hint'
								>
									{formatId(me.userId!)}
								</code>
								<p id='id-hint' className={styles.hint}>
									Используйте ID для поддержки и входа в игровые лобби.
								</p>
							</div>
						)}
					</section>
				</div>
			</div>

			<EditProfileModal
				isOpen={isEditModalOpen}
				onClose={() => setIsEditModalOpen(false)}
				onSave={handleSaveProfile}
				currentAvatar={avatar}
				currentFrame={frame}
			/>
		</div>
	)
}
