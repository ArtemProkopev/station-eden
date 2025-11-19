'use client'

// Исправлен импорт: используем ProfileState вместо ProfileData
import styles from '../page.module.css'
import { ProfileState } from '../types'
import CopyButton from './CopyButton'

interface ProfileInfoProps {
	profile: ProfileState
}

const formatId = (id: string): string => id.replace(/-/g, '\u2009–\u2009')

export const ProfileInfo = ({ profile }: ProfileInfoProps) => {
	// Данные пользователя теперь лежат внутри profile.data
	const user = profile.data

	return (
		<section className={styles.infoSection} aria-labelledby='profile-info'>
			<h3 id='profile-info' className={styles.visuallyHidden}>
				Информация профиля
			</h3>

			<div className={styles.loginCard}>
				<p className={styles.loginCaption}>Входит как</p>
				<p className={styles.loginEmail}>
					{/* Берем email из вложенного объекта data */}
					{user?.email ?? 'example@mail.ru'}
				</p>

				<div className={styles.idSection}>
					<div className={styles.idHeader}>
						<span className={styles.idLabel}>Игровой ID:</span>
						{/* Проверяем статус и наличие ID в data */}
						{profile.status === 'ok' && user?.id && (
							<CopyButton value={user.id} />
						)}
					</div>
					{profile.status === 'ok' && user?.id && (
						<output className={styles.idBadge} htmlFor='user-id'>
							{formatId(user.id)}
						</output>
					)}
				</div>

				<p className={styles.hint}>
					Используйте ID для поддержки и входа в игровые лобби.
				</p>
			</div>
		</section>
	)
}
