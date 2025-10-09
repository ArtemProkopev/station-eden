'use client'

import { useEffect, useState } from 'react'
import ImgCdn from '../../components/ImgCdn'
import { asset } from '../../lib/asset'
import CopyButton from './CopyButton'
import EditProfileModal from './EditProfileModal'
import LogoutButton from './LogoutButton'
import styles from './page.module.css'

interface ProfileData {
	status: 'loading' | 'error' | 'ok' | 'unauth'
	userId?: string
	email?: string
	username?: string | null
	message?: string
}

function formatId(id: string) {
	return id.replace(/-/g, '\u2009–\u2009')
}

const STORAGE_KEYS = { AVATAR: 'profile_avatar', FRAME: 'profile_frame' }
const DEFAULT_AVATAR = asset('/avatars/avatar1.png')
const DEFAULT_FRAME = asset('/frames/frame1.png')
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
				const username = payload?.username ?? null

				if (typeof userId === 'string' && typeof email === 'string') {
					setMe({ status: 'ok', userId, email, username })
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

		// ---- миграция старых значений в localStorage ----
		const savedAvatar = localStorage.getItem(STORAGE_KEYS.AVATAR)
		const savedFrame = localStorage.getItem(STORAGE_KEYS.FRAME)

		const toAbs = (val?: string | null) =>
			val && !/^https?:\/\//.test(val) ? asset(val) : val || undefined

		const migAvatar = toAbs(savedAvatar)
		const migFrame = toAbs(savedFrame)

		if (migAvatar) {
			setAvatar(migAvatar)
			localStorage.setItem(STORAGE_KEYS.AVATAR, migAvatar)
		}
		if (migFrame) {
			setFrame(migFrame)
			localStorage.setItem(STORAGE_KEYS.FRAME, migFrame)
		}

		loadUserData()
	}, [])

	const handleSaveProfile = (newAvatar: string, newFrame: string) => {
		setAvatar(newAvatar)
		setFrame(newFrame)
		localStorage.setItem(STORAGE_KEYS.AVATAR, newAvatar)
		localStorage.setItem(STORAGE_KEYS.FRAME, newFrame)
	}

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
										style={{ display: 'grid', gap: 10, justifyItems: 'center' }}
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
							<ImgCdn
								src={avatar}
								alt='Аватар'
								className={styles.avatarImage}
							/>
							<ImgCdn src={frame} alt='Рамка' className={styles.frameImage} />
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

								<div className={styles.emailRow}>
									<div className={styles.emailChip}>
										<svg
											className={styles.emailIcon}
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
										>
											<path d='M4 4h16v16H4z' />
											<path d='M22 6l-10 7L2 6' />
										</svg>
										<span className={styles.emailValue}>{me.email}</span>
									</div>

									<div className={styles.verifyPill} title='Email подтверждён'>
										<svg
											className={styles.verifyIcon}
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='3'
											strokeLinecap='round'
											strokeLinejoin='round'
											aria-hidden
										>
											<circle cx='12' cy='12' r='9' />
											<path d='M8 12l2.5 2.5L16 9' />
										</svg>
										ПОДТВЕРЖДЁН
									</div>
								</div>

								<LogoutButton />
							</div>
						) : (
							<div className={styles.error}>{me.message}</div>
						)}
					</aside>

					{/* правая колонка */}
					<section className={styles.main}>
						<div className={styles.headerRow}>
							<h1 className={styles.title}>Профиль</h1>

							{me.username && (
								<div className={styles.usernameChip} title='Ваш никнейм'>
									<span className={styles.at}>@</span>
									<span>{me.username}</span>
								</div>
							)}
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
