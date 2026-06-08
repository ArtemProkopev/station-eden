// apps/web/src/app/lobby/components/LobbyInfo/LobbyInfo.tsx
import { LobbySettings } from '@station-eden/shared'
import Image from 'next/image'
import styles from './LobbyInfo.module.css'

interface LobbyInfoProps {
	lobbySettings: LobbySettings
	playersCount: number
	hostName: string
	hostAvatar?: string
	onOpenSettings: () => void
}

function getLobbyTypeLabel(lobbySettings: LobbySettings) {
	if (lobbySettings.visibility === 'password') {
		return 'Лобби с паролем'
	}

	if (
		lobbySettings.visibility === 'hidden_password' ||
		lobbySettings.isPrivate
	) {
		return 'Скрытое лобби'
	}

	return 'Открытое лобби'
}

function HostFallbackIcon() {
	return (
		<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
			<path
				d='M12 12.4C14.2091 12.4 16 10.6091 16 8.4C16 6.19086 14.2091 4.4 12 4.4C9.79086 4.4 8 6.19086 8 8.4C8 10.6091 9.79086 12.4 12 12.4Z'
				stroke='currentColor'
				strokeWidth='2'
			/>
			<path
				d='M5.5 20C6.45 16.85 8.8 15.2 12 15.2C15.2 15.2 17.55 16.85 18.5 20'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
		</svg>
	)
}

export default function LobbyInfo({
	lobbySettings,
	hostName,
	hostAvatar,
	onOpenSettings,
}: LobbyInfoProps) {
	const lobbyTypeLabel = getLobbyTypeLabel(lobbySettings)

	return (
		<div className={styles.robotBlock}>
			<div className={styles.robotStage}>
				<div className={styles.robotImageContainer}>
					<div className={styles.robotShadow} aria-hidden='true' />

					<div className={styles.robotFloatLayer}>
						<Image
							src='https://cdn.assets.stationeden.ru/web/roboted-optimized.webp'
							alt='Robot'
							className={styles.robotImage}
							width={240}
							height={240}
							priority
						/>
					</div>
				</div>

				<div className={styles.robotMeta}>
					<div className={styles.robotMetaRow}>
						<span className={styles.hostIcon} aria-hidden='true'>
							{hostAvatar ? (
								<Image
									src={hostAvatar}
									alt=''
									width={22}
									height={22}
									className={styles.hostAvatar}
								/>
							) : (
								<HostFallbackIcon />
							)}
						</span>

						<span className={styles.robotMetaLabel}>Хост:</span>
						<span className={styles.robotMetaValue}>{hostName}</span>
					</div>

					<div className={styles.robotMetaSubline}>{lobbyTypeLabel}</div>
				</div>
			</div>

			<button className={styles.lobbySettingsBtn} onClick={onOpenSettings}>
				настройки лобби
			</button>
		</div>
	)
}
