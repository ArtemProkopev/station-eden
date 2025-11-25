// apps/web/src/app/settings/SettingsPageClient.tsx
'use client'

import { useScrollPrevention } from '@/hooks/useScrollPrevention' // ← Обновленный импорт
import { useEffect, useState } from 'react'
import TopHUD from '../../components/TopHUD/TopHUD'
import { ScaleContainer } from '../../components/ui/ScaleContainer/ScaleContainer'
import type { SoundSettingsType } from './components/sections/SoundSettings/SoundSettings'
import { SettingsContent } from './components/SettingsContent/SettingsContent'
import { SettingsLayout } from './components/SettingsLayout/SettingsLayout'
import {
	SettingsSidebar,
	type SettingsSection,
} from './components/SettingsSidebar/SettingsSidebar'
import { useSettings } from './hooks/useSettings'
import styles from './page.module.css'

export default function SettingsPageClient() {
	const [activeSection, setActiveSection] = useState<SettingsSection>('sound')

	const {
		profile,
		avatar,
		settings,
		loadUserData,
		loadSettings,
		updateSettings,
		updateSoundSettings,
	} = useSettings()

	useScrollPrevention() // ← Теперь использует общий хук

	// Инициализация данных
	useEffect(() => {
		const initializeData = async () => {
			try {
				await loadUserData()
				loadSettings()
			} catch (error) {
				console.error('Settings initialization failed:', error)
			}
		}
		initializeData()
	}, [loadUserData, loadSettings])

	const handleVolumeChange = (type: keyof SoundSettingsType, value: number) => {
		updateSoundSettings({ [type]: value })
	}

	const handleDeviceChange = (device: string) => {
		updateSoundSettings({ outputDevice: device })
	}

	const handleToggleChange = (setting: string, value: boolean) => {
		if (setting === 'muteWhenMinimized') {
			updateSoundSettings({ muteWhenMinimized: value })
		} else if (setting === 'sessionHistory' || setting === 'purchaseHistory') {
			updateSettings({ [setting]: value })
		}
	}

	const handleLanguageChange = (language: string) => {
		updateSettings({ language })
	}

	const handleSessionHistoryChange = (enabled: boolean) => {
		updateSettings({ sessionHistory: enabled })
	}

	const handlePurchaseHistoryChange = (enabled: boolean) => {
		updateSettings({ purchaseHistory: enabled })
	}

	return (
		<main className={styles.root}>
			<TopHUD profile={profile} avatar={avatar} />

			<ScaleContainer
				baseWidth={1200}
				baseHeight={800}
				minScale={0.5}
				maxScale={1}
			>
				<div className={styles.container}>
					<SettingsLayout
						sidebar={
							<SettingsSidebar
								activeSection={activeSection}
								onSectionChange={setActiveSection}
							/>
						}
						content={
							<SettingsContent
								activeSection={activeSection}
								settings={settings}
								onVolumeChange={handleVolumeChange}
								onDeviceChange={handleDeviceChange}
								onToggleChange={handleToggleChange}
								onLanguageChange={handleLanguageChange}
								onSessionHistoryChange={handleSessionHistoryChange}
								onPurchaseHistoryChange={handlePurchaseHistoryChange}
							/>
						}
					/>
				</div>
			</ScaleContainer>
		</main>
	)
}