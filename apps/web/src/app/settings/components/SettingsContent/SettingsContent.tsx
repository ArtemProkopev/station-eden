// apps/web/src/app/settings/components/SettingsContent/SettingsContent.tsx
'use client'

import { SoundSettings, UserSettings } from '@station-eden/shared'
import { LanguageSettings } from '../sections/LanguageSettings/LanguageSettings'
import { PurchasesSettings } from '../sections/PurchasesSettings/PurchasesSettings'
import { SessionsSettings } from '../sections/SessionsSettings/SessionsSettings'
// Импортируем компонент (а тип SoundSettings уже взяли из shared)
import { SoundSettings as SoundSettingsComponent } from '../sections/SoundSettings/SoundSettings'
import { SettingsSection } from '../SettingsSidebar/SettingsSidebar'
import styles from './SettingsContent.module.css'

interface SettingsContentProps {
	activeSection: SettingsSection
	settings: UserSettings
	onVolumeChange: (type: keyof SoundSettings, value: number) => void
	onDeviceChange: (device: string) => void
	onToggleChange: (setting: string, value: boolean) => void
	onLanguageChange: (language: string) => void
	onSessionHistoryChange: (enabled: boolean) => void
	onPurchaseHistoryChange: (enabled: boolean) => void
}

export function SettingsContent({
	activeSection,
	settings,
	onVolumeChange,
	onDeviceChange,
	onToggleChange,
	onLanguageChange,
	onSessionHistoryChange,
	onPurchaseHistoryChange,
}: SettingsContentProps) {
	const renderContent = () => {
		switch (activeSection) {
			case 'sound':
				return (
					<SoundSettingsComponent
						settings={settings.sound}
						onVolumeChange={onVolumeChange}
						onDeviceChange={onDeviceChange}
						onToggleChange={onToggleChange}
					/>
				)
			case 'language':
				return (
					<LanguageSettings
						language={settings.language}
						onChange={onLanguageChange}
					/>
				)
			case 'sessions':
				return (
					<SessionsSettings
						sessionHistory={settings.sessionHistory}
						onChange={onSessionHistoryChange}
					/>
				)
			case 'purchases':
				return (
					<PurchasesSettings
						purchaseHistory={settings.purchaseHistory}
						onChange={onPurchaseHistoryChange}
					/>
				)
			default:
				return null
		}
	}

	return (
		<div className={styles.content}>
			<div className={styles.contentSection}>{renderContent()}</div>
		</div>
	)
}
