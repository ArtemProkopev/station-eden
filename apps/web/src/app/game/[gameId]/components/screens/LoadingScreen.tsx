// apps/web/src/app/game/[gameId]/components/screens/LoadingScreen.tsx
import styles from '../../page.module.css'

interface LoadingScreenProps {
  isConnected: boolean
  profile: any
  gameId: string
  onRetryJoin: () => void
}

export default function LoadingScreen({ isConnected, profile, gameId, onRetryJoin }: LoadingScreenProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Загрузка игры...</p>
      <p>
        Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}
      </p>
      <p>
        Профиль:{' '}
        {profile.status === 'ok'
          ? `OK (${profile.data?.username})`
          : profile.status}
      </p>
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