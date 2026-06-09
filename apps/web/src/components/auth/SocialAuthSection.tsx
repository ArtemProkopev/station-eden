'use client'

import VkOneTapAuthButton from '@/components/auth/vk/VkOneTapAuthButton'
import YandexAuthButton from '@/components/auth/yandex/YandexAuthButton'
import styles from './SocialAuthSection.module.css'

type Props = {
	mode: 'login' | 'register'
	next: string
	vkEnabled: boolean
	yandexEnabled: boolean
}

export default function SocialAuthSection({
	mode,
	next,
	vkEnabled,
	yandexEnabled,
}: Props) {
	if (!vkEnabled && !yandexEnabled) return null

	return (
		<section className={styles.section} aria-label='Социальный вход'>
			<div className={styles.divider} role='separator'>
				<span>Или</span>
			</div>

			<div className={styles.grid}>
				{vkEnabled && <VkOneTapAuthButton mode={mode} next={next} />}

				{yandexEnabled && (
					<YandexAuthButton
						mode={mode}
						next={next}
						size='m'
						fullWidth
						label={
							mode === 'login' ? 'Войти с Яндекс ID' : 'Продолжить с Яндекс ID'
						}
					/>
				)}
			</div>
		</section>
	)
}
