'use client'

import React from 'react'
import { useUserData } from '../../hooks/useUserData'
import styles from './TopHUD.module.css'
import { Currency } from './components/Currency'
import { Icon } from './components/Icon'
import { UserDropdown } from './components/UserDropdown'
import { useViewportScale } from './hooks/useViewportScale'

interface TopHUDProps {
	profile?: {
		status: 'loading' | 'error' | 'ok' | 'unauth'
		userId?: string
		email?: string
		username?: string | null
		message?: string
	}
	avatar?: string
	/**
	 * 'default' - показывает кнопку "На главную" (для внутренних страниц)
	 * 'main' - скрывает кнопку "На главную" (для главной страницы)
	 */
	variant?: 'default' | 'main'
}

export default function TopHUD({
	profile,
	avatar,
	variant = 'default',
}: TopHUDProps) {
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
	const scale = useViewportScale()
	const userData = useUserData()

	// Стабильные значения для предотвращения мигания
	const finalAvatar = avatar || userData.avatar
	const finalProfile = profile || {
		status:
			userData.status === 'ok'
				? 'ok'
				: userData.status === 'error'
					? 'error'
					: 'loading',
		username: userData.username,
		email: userData.email,
		userId: userData.userId,
	}

	const handleDropdownToggle = () => setIsDropdownOpen(!isDropdownOpen)
	const handleDropdownClose = () => setIsDropdownOpen(false)
	const handleAddCurrency = () => console.log('Add currency clicked')

	const hudStyle = {
		transform: `scale(${scale})`,
		transformOrigin: 'top center',
	} as React.CSSProperties

	// Скелетон при загрузке
	if (userData.status === 'loading') {
		return (
			<header
				className={styles.hud}
				style={hudStyle}
				aria-label='Загрузка верхней панели'
			>
				<SkeletonTopHUD showBackLink={variant === 'default'} />
			</header>
		)
	}

	return (
		<header
			className={styles.hud}
			style={hudStyle}
			aria-label='Верхняя панель управления'
		>
			{/* Левая часть: Навигация (или пустой блок для сохранения layout) */}
			<div className={styles.leftSection}>
				{variant === 'default' && (
					<nav aria-label='Основная навигация'>
						<a
							href='/'
							className={styles.backLink}
							aria-label='Вернуться на главную страницу'
						>
							<Icon
								type='rocket'
								size='medium'
								alt='Логотип - ракета'
								aria-hidden={true}
							/>
							<span className={styles.backText}>на главную</span>
						</a>
					</nav>
				)}
			</div>

			{/* Правая часть: Валюта и Профиль */}
			<div className={styles.hudRight}>
				<Currency value={128} onAdd={handleAddCurrency} />

				<UserDropdown
					profile={{
						username: finalProfile.username || undefined,
						email: finalProfile.email,
						userId: finalProfile.userId,
					}}
					avatar={finalAvatar}
					isOpen={isDropdownOpen}
					onToggle={handleDropdownToggle}
					onClose={handleDropdownClose}
				/>
			</div>
		</header>
	)
}

// Компонент-скелетон
function SkeletonTopHUD({ showBackLink }: { showBackLink: boolean }) {
	return (
		<>
			<div className={styles.leftSection}>
				{showBackLink && (
					<div className={styles.backLink}>
						<div className={styles.iconSkeleton}></div>
						<span className={styles.backText}>на главную</span>
					</div>
				)}
			</div>

			<div className={styles.hudRight}>
				<div className={styles.currency}>
					<span className={styles.backText}>128</span>
					<div className={styles.currencyContent}>
						<div className={styles.starSkeleton}></div>
					</div>
				</div>

				<div className={styles.avatarDropdown}>
					<button className={styles.avatarButton} disabled aria-hidden='true'>
						<div className={styles.avatarContainer}>
							<div className={styles.avatarSkeleton}></div>
						</div>
					</button>
				</div>
			</div>
		</>
	)
}
