// apps/web/src/app/lobby/components/LobbyInfo/LobbyInfo.tsx
import { LobbySettings } from '@station-eden/shared'
import Image from 'next/image'
import styles from './LobbyInfo.module.css'

interface LobbyInfoProps {
	lobbySettings: LobbySettings
	playersCount: number
	onOpenSettings: () => void
}

export default function LobbyInfo({
	lobbySettings,
	playersCount,
	onOpenSettings,
}: LobbyInfoProps) {
	return (
		<div className={styles.robotBlock}>
			<div className={styles.robotImageContainer}>
				<Image
					src='https://cdn.assets.stationeden.ru/web/roboted-optimized.webp'
					alt='Robot'
					className={styles.robotImage}
					width={240}
					height={240}
					priority
				/>
			</div>

			<div className={styles.currentSettings}>
				<div className={styles.settingItem}>
					<span className={styles.settingLabel}>Игроков:</span>
					<span className={styles.settingValue}>
						{playersCount}/{lobbySettings.maxPlayers}
					</span>
				</div>
				<div className={styles.settingItem}>
					<span className={styles.settingLabel}>Доступ:</span>
					<span className={styles.settingValue}>
						{lobbySettings.isPrivate ? 'Приватное' : 'Открытое'}
						{lobbySettings.isPrivate &&
							lobbySettings.password &&
							' (с паролем)'}
					</span>
				</div>
			</div>

			<button className={styles.lobbySettingsBtn} onClick={onOpenSettings}>
				настройки лобби
			</button>
		</div>
	)
}
