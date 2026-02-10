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

export function LobbySettingsModal({
	isOpen,
	onClose,
	currentSettings,
	onSaveSettings,
}: LobbySettingsModalProps) {
	const [settings, setSettings] = useState<LobbySettings>(currentSettings)
	const [showPassword, setShowPassword] = useState(false)
	const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic')

	useEffect(() => {
		if (isOpen) setSettings(currentSettings)
	}, [isOpen, currentSettings])

	const handleSave = () => {
		onSaveSettings(settings)
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
		if (turnTime == null) return null
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
						className={`${styles.tab} ${activeTab === 'basic' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('basic')}
					>
						Основные
					</button>
					<button
						type='button'
						className={`${styles.tab} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
						onClick={() => setActiveTab('advanced')}
					>
						Дополнительно
					</button>
				</div>

				<div className={styles.tabContent}>
					{activeTab === 'basic' && (
						<div className={styles.settingGroup}>
							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Максимум игроков</label>
								<select
									value={String(settings.maxPlayers)}
									onChange={e =>
										setSettings(prev => ({
											...prev,
											maxPlayers: Number(e.target.value),
										}))
									}
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
										setSettings(prev => ({ ...prev, gameMode: e.target.value }))
									}
									className={styles.select}
								>
									<option value='standard'>Стандартный</option>
									<option value='extended'>Расширенный</option>
									<option value='competitive'>Соревновательный</option>
									<option value='cooperative'>Кооперативный</option>
								</select>
							</div>

							<div className={styles.settingItem}>
								<label className={styles.checkboxLabel}>
									<input
										type='checkbox'
										checked={settings.isPrivate}
										onChange={e =>
											setSettings(prev => ({
												...prev,
												isPrivate: e.target.checked,
												// если выключили приватность — пароль можно почистить
												password: e.target.checked ? prev.password : undefined,
											}))
										}
										className={styles.checkbox}
									/>
									Приватное лобби
								</label>
							</div>

							{settings.isPrivate && (
								<div className={styles.settingItem}>
									<label className={styles.settingLabel}>Пароль доступа</label>
									<input
										type={showPassword ? 'text' : 'password'}
										value={settings.password || ''}
										onChange={e =>
											setSettings(prev => ({
												...prev,
												password: e.target.value,
											}))
										}
										className={styles.passwordInput}
										placeholder='Введите пароль...'
									/>
									<label className={styles.checkboxLabel}>
										<input
											type='checkbox'
											checked={showPassword}
											onChange={e => setShowPassword(e.target.checked)}
											className={styles.checkbox}
										/>
										Показать пароль
									</label>
								</div>
							)}
						</div>
					)}

					{activeTab === 'advanced' && (
						<div className={styles.settingGroup}>
							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Сложность</label>
								<select
									value={settings.difficulty || ''}
									onChange={e => {
										const val = e.target.value
										setSettings(prev => ({
											...prev,
											difficulty:
												val === ''
													? undefined
													: (val as 'easy' | 'medium' | 'hard'),
										}))
									}}
									className={styles.select}
								>
									<option value=''>Автоматическая</option>
									<option value='easy'>Лёгкая</option>
									<option value='medium'>Средняя</option>
									<option value='hard'>Сложная</option>
								</select>
							</div>

							<div className={styles.settingItem}>
								<label className={styles.settingLabel}>Время на ход</label>
								<select
									// select хранит string, а в состоянии держим number | undefined
									value={
										settings.turnTime == null
											? 'unlimited'
											: String(settings.turnTime)
									}
									onChange={e => {
										const v = e.target.value
										setSettings(prev => ({
											...prev,
											turnTime: v === 'unlimited' ? undefined : Number(v),
										}))
									}}
									className={styles.select}
								>
									<option value='unlimited'>Неограниченно</option>
									<option value='60'>1 минута</option>
									<option value='180'>3 минуты</option>
									<option value='300'>5 минут</option>
								</select>
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
								className={settings.isPrivate ? styles.private : styles.public}
							>
								{settings.isPrivate ? '🔒 Приватное' : '🔓 Публичное'}
								{settings.isPrivate && settings.password && ' (с паролем)'}
							</span>
						</div>

						{settings.difficulty && (
							<div className={styles.previewItem}>
								<span>Сложность:</span>
								<span>
									{settings.difficulty === 'easy' && 'Лёгкая'}
									{settings.difficulty === 'medium' && 'Средняя'}
									{settings.difficulty === 'hard' && 'Сложная'}
								</span>
							</div>
						)}

						{settings.turnTime != null && (
							<div className={styles.previewItem}>
								<span>Время на ход:</span>
								<span>{getTurnTimeLabel(settings.turnTime)}</span>
							</div>
						)}
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
