// apps/web/src/app/game/[gameId]/components/screens/LoadingScreen.tsx
import { avatarKey, frameKey } from '@profile/config'
import styles from '../../page.module.css'

type LoadingProfile = {
	status: string
	data?: {
		username?: string | null
	} | null
}

interface LoadingScreenProps {
	isConnected: boolean
	profile: LoadingProfile
	onRetryJoin: () => void
	gameId: string
	userId?: string // Добавлен userId для вызова функций ключей
}

export default function LoadingScreen({
	isConnected,
	profile,
	onRetryJoin,
	gameId,
	userId,
}: LoadingScreenProps) {
	return (
		<div className={styles.loadingContainer}>
			<div className={styles.loadingSpinner}></div>
			<p>Загрузка игры...</p>
			<p>Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}</p>
			<p>
				Профиль:{' '}
				{profile.status === 'ok'
					? `OK (${profile.data?.username ?? ''})`
					: profile.status}
			</p>
			{userId && (
				<>
					<p>Аватар ключ: {avatarKey(userId)}</p>
					<p>Рамка ключ: {frameKey(userId)}</p>
				</>
			)}
			<p>Game ID: {gameId}</p>
			<button
				className={styles.retryButton}
				onClick={onRetryJoin}
				disabled={!isConnected}
			>
				Повторить подключение
			</button>
		</div>
	)
}
