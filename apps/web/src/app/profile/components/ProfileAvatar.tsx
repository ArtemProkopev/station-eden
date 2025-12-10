'use client'

import ImgCdn from '@/components/ImgCdn'
import { asset } from '@/lib/asset'
import { PROFILE_CONFIG } from '../config'
import styles from '../page.module.css'

interface ProfileAvatarProps {
	avatar: string
	frame: string
	username?: string | null
	/** клик по кнопке «сменить» под ником */
	onChangeUsernameClick?: () => void
}

export const ProfileAvatar = ({
	avatar,
	frame,
	username,
	onChangeUsernameClick,
}: ProfileAvatarProps) => {
	const handle = username && username.trim().length > 0 ? username : 'Никнейм'

	return (
		<section className={styles.avatarSection} aria-labelledby='user-handle'>
			<div className={styles.avatarWrapper}>
				<div className={styles.leavesWrapper}>
					<img
						src={asset(PROFILE_CONFIG.ASSETS.DECOR.leaves)}
						alt=''
						role='presentation'
						className={styles.leavesImage}
					/>
				</div>

				<div className={styles.avatarFrameContainer}>
					<div className={styles.avatarImageContainer}>
						<ImgCdn
							src={avatar}
							alt={`Аватар пользователя ${handle}`}
							className={styles.avatar}
						/>
					</div>
					<ImgCdn src={frame} alt='Рамка профиля' className={styles.frame} />
				</div>
			</div>

			<div className={styles.handleRow}>
				<h2 id='user-handle' className={styles.handle}>
					@{handle}
				</h2>

				{onChangeUsernameClick && (
					<button
						type='button'
						className={styles.changeUsernameBtn}
						onClick={onChangeUsernameClick}
					>
						сменить
					</button>
				)}
			</div>
		</section>
	)
}
