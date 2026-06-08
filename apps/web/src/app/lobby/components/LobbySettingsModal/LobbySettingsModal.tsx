// apps/web/src/app/lobby/components/LobbySettingsModal/LobbySettingsModal.tsx
import { LobbySettings } from '@station-eden/shared'
import { useEffect, useState } from 'react'
import styles from './LobbySettingsModal.module.css'

interface LobbySettingsModalProps {
	isOpen: boolean
	onClose: () => void
	currentSettings: LobbySettings
	onSaveSettings: (settings: LobbySettings) => void
}

type SettingsTab = 'basic' | 'advanced' | 'roles'

function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, Math.trunc(value)))
}

export function LobbySettingsModal({
	isOpen,
	onClose,
	currentSettings,
	onSaveSettings,
}: LobbySettingsModalProps) {
	const [settings, setSettings] = useState<LobbySettings>(currentSettings)
	const [activeTab, setActiveTab] = useState<SettingsTab>('basic')

	useEffect(() => {
		if (isOpen) setSettings(currentSettings)
	}, [isOpen, currentSettings])

	const hiddenRolesCount = settings.hiddenRolesCount ? 1 : 0

	const handleSave = () => {
		const normalizedMaxPlayers = clampNumber(settings.maxPlayers || 4, 2, 6)
		const normalizedHiddenRolesCount = settings.hiddenRolesCount ? 1 : 0

		onSaveSettings({
			...settings,
			maxPlayers: normalizedMaxPlayers,
			difficulty: settings.difficulty || 'normal',
			turnTime: settings.turnTime ?? 180,
			maxRounds: clampNumber(settings.maxRounds ?? 10, 3, 20),
			discussionTime: clampNumber(settings.discussionTime ?? 180, 30, 600),
			votingTime: clampNumber(settings.votingTime ?? 60, 15, 300),
			hiddenRolesCount: normalizedHiddenRolesCount,
			enableCrises: settings.enableCrises !== false,
		})

		onClose()
	}

	const handleCancel = () => {
		setSettings(currentSettings)
		onClose()
	}

	const getGameModeName = (mode: string) => {
		const modes: Record<string, string> = {
			standard: 'Стандартный',
			extended: 'Расширенный',
			competitive: 'Соревновательный',
			cooperative: 'Кооперативный',
		}

		return modes[mode] || mode
	}

	const getTurnTimeLabel = (turnTime?: number) => {
		if (turnTime == null) return '3 минуты'

		switch (turnTime) {
			case 60:
				return '1 минута'
			case 180:
				return '3 минуты'
			case 300:
				return '5 минут'
			default:
				return `${turnTime} сек`
		}
	}

	const getAccessLabel = () => {
		if (settings.visibility === 'hidden_password') {
			return '🔒 Скрытое лобби по паролю'
		}

		if (settings.visibility === 'password' || settings.hasPassword) {
			return '🔒 Лобби по паролю'
		}

		return '🔓 Публичное лобби'
	}

	const getHiddenRolesLabel = () => {
		if (hiddenRolesCount <= 0) return 'Выключены'
		if (hiddenRolesCount === 1) return '1 скрытая роль'

		return `${hiddenRolesCount} скрытые роли`
	}

	const isAccessRestricted =
		settings.visibility === 'hidden_password' ||
		settings.visibility === 'password' ||
		!!settings.hasPassword

	if (!isOpen) return null

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>Настройки лобби</h2>

					<button
						className={styles.closeButton}
						onClick={onClose}
						type='button'
					>
						×
					</button>
				</div>

				<div className={styles.tabs}>
					<button
						type='button'
						className={`${styles.tab} ${
							activeTab === 'basic' ? styles.activeTab : ''
						}`}
						onClick={() => setActiveTab('basic')}
					>
						Основные
					</button>

					<button
						type='button'
						className={`${styles.tab} ${
							activeTab === 'advanced' ? styles.activeTab : ''
						}`}
						onClick={() => setActiveTab('advanced')}
					>
						Дополнительно
					</button>

					<button
						type='button'
						className={`${styles.tab} ${
							activeTab === 'roles' ? styles.activeTab : ''
						}`}
						onClick={() => setActiveTab('roles')}
					>
						Скрытые роли
					</button>
				</div>

				<div className={styles.tabContent}>
					{activeTab === 'basic' && (
						<div className={styles.settingGroup}>
							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Максимум игроков</label>

								<select
									value={String(settings.maxPlayers)}
									onChange={e => {
										const nextMaxPlayers = Number(e.target.value)

										setSettings(prev => ({
											...prev,
											maxPlayers: nextMaxPlayers,
											hiddenRolesCount: Math.min(
												prev.hiddenRolesCount ?? 0,
												Math.max(0, nextMaxPlayers - 1),
											),
										}))
									}}
									className={styles.select}
								>
									<option value='2'>2 игрока</option>
									<option value='3'>3 игрока</option>
									<option value='4'>4 игрока</option>
									<option value='5'>5 игроков</option>
									<option value='6'>6 игроков</option>
								</select>
							</div>

							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Режим игры</label>

								<select
									value={settings.gameMode}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											gameMode: e.target.value,
										}))
									}
									className={styles.select}
								>
									<option value='standard'>Стандартный</option>
									<option value='extended'>Расширенный</option>
									<option value='competitive'>Соревновательный</option>
									<option value='cooperative'>Кооперативный</option>
								</select>
							</div>
						</div>
					)}

					{activeTab === 'advanced' && (
						<div className={styles.settingGroup}>
							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Сложность</label>

								<select
									value={settings.difficulty || 'normal'}
									onChange={e => {
										const val = e.target.value as 'easy' | 'normal' | 'hard'

										setSettings(prev => ({
											...prev,
											difficulty: val,
										}))
									}}
									className={styles.select}
								>
									<option value='easy'>Лёгкая</option>
									<option value='normal'>Средняя</option>
									<option value='hard'>Сложная</option>
								</select>
							</div>

							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Время на ход</label>

								<select
									value={String(settings.turnTime ?? 180)}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											turnTime: Number(e.target.value),
										}))
									}
									className={styles.select}
								>
									<option value='60'>1 минута</option>
									<option value='180'>3 минуты</option>
									<option value='300'>5 минут</option>
								</select>
							</div>

							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Раундов до финала</label>

								<select
									value={String(settings.maxRounds ?? 10)}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											maxRounds: Number(e.target.value),
										}))
									}
									className={styles.select}
								>
									<option value='3'>3 раунда</option>
									<option value='5'>5 раундов</option>
									<option value='10'>10 раундов</option>
									<option value='15'>15 раундов</option>
									<option value='20'>20 раундов</option>
								</select>
							</div>

							<label className={styles.checkboxLabel}>
								<input
									type='checkbox'
									className={styles.checkbox}
									checked={settings.enableCrises !== false}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											enableCrises: e.target.checked,
										}))
									}
								/>
								<span>Кризисы станции включены</span>
							</label>
						</div>
					)}

					{activeTab === 'roles' && (
						<div className={styles.settingGroup}>
							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Скрытые роли</label>

								<select
									value={String(hiddenRolesCount > 0 ? 1 : 0)}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											hiddenRolesCount: Number(e.target.value),
										}))
									}
									className={styles.select}
								>
									<option value='0'>Выключены</option>
									<option value='1'>Включены — 1 случайная роль</option>
								</select>

								<p className={styles.settingHint}>
									Скрытые роли добавляют личные цели, саботаж, заражение и
									подозрения. Если режим включён, одну случайную скрытую роль
									получает один случайный участник лобби
								</p>
							</div>

							<div className={styles.rolesInfo}>
								<div className={styles.roleInfoCard}>
									<strong>Саботажник</strong>
									<span>
										Пытается сорвать эвакуацию и уменьшить число мест.
									</span>
								</div>

								<div className={styles.roleInfoCard}>
									<strong>Агент ксенофагов</strong>
									<span>
										Распространяет заражение и хочет доставить его дальше.
									</span>
								</div>

								<div className={styles.roleInfoCard}>
									<strong>Серый кардинал</strong>
									<span>
										Побеждает через хаос, исключения и чужие подозрения.
									</span>
								</div>

								<div className={styles.roleInfoCard}>
									<strong>Ложный свидетель</strong>
									<span>Подставляет других и запутывает обсуждение.</span>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className={styles.preview}>
					<h3 className={styles.previewTitle}>Предпросмотр настроек</h3>

					<div className={styles.previewContent}>
						<div className={styles.previewItem}>
							<span>Игроков:</span>
							<span>{settings.maxPlayers}</span>
						</div>

						<div className={styles.previewItem}>
							<span>Режим:</span>
							<span>{getGameModeName(settings.gameMode)}</span>
						</div>

						<div className={styles.previewItem}>
							<span>Доступ:</span>
							<span
								className={isAccessRestricted ? styles.private : styles.public}
							>
								{getAccessLabel()}
							</span>
						</div>

						<div className={styles.previewItem}>
							<span>Сложность:</span>
							<span>
								{(settings.difficulty || 'normal') === 'easy' && 'Лёгкая'}
								{(settings.difficulty || 'normal') === 'normal' && 'Средняя'}
								{(settings.difficulty || 'normal') === 'hard' && 'Сложная'}
							</span>
						</div>

						<div className={styles.previewItem}>
							<span>Время на ход:</span>
							<span>{getTurnTimeLabel(settings.turnTime)}</span>
						</div>

						<div className={styles.previewItem}>
							<span>Кризисы:</span>
							<span>
								{settings.enableCrises === false ? 'Выключены' : 'Включены'}
							</span>
						</div>

						<div className={styles.previewItem}>
							<span>Скрытые роли:</span>
							<span
								className={
									hiddenRolesCount > 0 ? styles.private : styles.public
								}
							>
								{getHiddenRolesLabel()}
							</span>
						</div>
					</div>
				</div>

				<div className={styles.modalActions}>
					<button
						className={styles.cancelButton}
						onClick={handleCancel}
						type='button'
					>
						Отмена
					</button>

					<button
						className={styles.saveButton}
						onClick={handleSave}
						type='button'
					>
						Сохранить настройки
					</button>
				</div>
			</div>
		</div>
	)
}
