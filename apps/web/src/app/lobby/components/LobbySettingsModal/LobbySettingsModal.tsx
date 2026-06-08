import { LobbySettings } from '@station-eden/shared'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './LobbySettingsModal.module.css'

interface LobbySettingsModalProps {
	isOpen: boolean
	onClose: () => void
	currentSettings: LobbySettings
	onSaveSettings: (settings: LobbySettings) => void
	playersCount?: number
}

type LobbyAccessType = 'public' | 'password' | 'hidden_password'

type SelectOption<T extends string = string> = {
	value: T
	label: string
}

type AccessOption = {
	value: LobbyAccessType
	title: string
	description: string
	badge: string
	icon: ReactNode
}

function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, Math.trunc(value)))
}

function getAccessSummaryTitle(visibility?: string) {
	switch (visibility) {
		case 'password':
			return 'Лобби с паролем'
		case 'hidden_password':
			return 'Скрытое лобби'
		default:
			return 'Открытое лобби'
	}
}

function getAccessDescription(visibility?: string) {
	switch (visibility) {
		case 'password':
			return 'Видно в списке, вход по паролю'
		case 'hidden_password':
			return 'Не видно в списке, вход по ссылке и паролю'
		default:
			return 'Видно в списке лобби'
	}
}

function getDifficultyLabel(difficulty?: string) {
	switch (difficulty) {
		case 'easy':
			return 'Лёгкая'
		case 'hard':
			return 'Сложная'
		default:
			return 'Средняя'
	}
}

function getGameModeName(mode?: string) {
	const modes: Record<string, string> = {
		standard: 'Стандартный',
		extended: 'Расширенный',
		competitive: 'Соревновательный',
		cooperative: 'Кооперативный',
	}

	return modes[mode || 'standard'] || mode || 'Стандартный'
}

function getTurnTimeLabel(turnTime?: number) {
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

function getCrisisLabel(enableCrises?: boolean) {
	return enableCrises === false ? 'выкл' : 'вкл'
}

function getHiddenRolesLabel(hiddenRolesCount?: number) {
	return hiddenRolesCount && hiddenRolesCount > 0 ? '1 роль' : 'выкл'
}

function getOpenSlotsCount(maxPlayers?: number, playersCount = 0) {
	return Math.max(0, (maxPlayers || 4) - playersCount)
}

function PublicLobbyIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M12 1.5C9.9233 1.5 7.89323 2.11581 6.16652 3.26957C4.4398 4.42332 3.09399 6.0632 2.29927 7.98182C1.50455 9.90045 1.29661 12.0116 1.70176 14.0484C2.1069 16.0852 3.10693 17.9562 4.57538 19.4246C6.04383 20.8931 7.91475 21.8931 9.95155 22.2982C11.9884 22.7034 14.0996 22.4955 16.0182 21.7007C17.9368 20.906 19.5767 19.5602 20.7304 17.8335C21.8842 16.1068 22.5 14.0767 22.5 12C22.4969 9.21618 21.3897 6.54726 19.4212 4.5788C17.4527 2.61035 14.7838 1.5031 12 1.5ZM2.96512 12C2.9669 10.9884 3.13995 9.98448 3.47693 9.0307C4.08252 13.4358 7.94652 13.808 8.11256 14.5102C8.20414 15.3012 8.22702 16.0986 8.18093 16.8935C8.24931 18.2512 10.1247 18.2707 10.8474 19.3451C11.1015 19.854 11.2003 20.4263 11.1317 20.9909C8.89749 20.7728 6.82423 19.7317 5.31492 18.07C3.8056 16.4083 2.96807 14.2448 2.96512 12ZM14.4516 20.693C15.1168 18.6096 17.1142 17.9034 17.3174 16.6991C17.4805 15.7331 16.2107 15.234 15.0709 15.0982C13.931 14.9625 14.1059 13.7845 13.302 12.9494C12.4981 12.1143 11.9746 12.1602 10.8455 12.3018C9.71637 12.4434 8.75038 12.3506 8.43489 11.6562C8.1194 10.9617 8.52182 10.6296 7.69158 9.76911C7.5795 9.66171 7.49898 9.52566 7.45876 9.37572C7.41854 9.22579 7.42017 9.0677 7.46345 8.91862C7.50673 8.76955 7.59003 8.63517 7.70429 8.53009C7.81855 8.42501 7.95941 8.35323 8.11158 8.32256C8.69763 8.18093 9.73982 9.20163 10.3503 9.08149C12.1885 8.70251 9.98498 5.10223 12.7472 4.19777C13.2543 4.02457 13.6724 3.65806 13.9105 3.17805C15.4599 3.51632 16.8925 4.25757 18.0636 5.32688C18.4045 6.10989 18.5263 6.97074 18.4162 7.81758C18.048 8.95744 17.1201 9.7779 18.132 11.6425C19.1879 13.5901 19.8393 13.8548 20.314 13.3186C20.4997 13.1148 20.7319 12.9589 20.9909 12.8644C20.8145 14.6755 20.0961 16.3914 18.9295 17.788C17.763 19.1846 16.2024 20.197 14.4516 20.693Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function PasswordLobbyIcon() {
	return (
		<svg
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M12 16.5563V18.2156M12 16.5563C11.0835 16.5563 10.3406 15.8133 10.3406 14.8969C10.3406 13.9804 11.0835 13.2375 12 13.2375C12.9165 13.2375 13.6593 13.9804 13.6593 14.8969C13.6593 15.8133 12.9165 16.5563 12 16.5563ZM16.9781 9.64782V5.41879C16.9781 3.55482 15.4671 2.0438 13.6031 2.0438H10.3969C8.5329 2.0438 7.02188 3.55482 7.02188 5.41879V9.64782M8.04745 9.52501H15.9525C17.598 9.52501 19.1023 10.4547 19.8382 11.9265C20.1398 12.5297 20.2968 13.1949 20.2969 13.8693V17.612C20.2968 18.2864 20.1398 18.9515 19.8382 19.5548C19.1023 21.0266 17.598 21.9562 15.9525 21.9562H8.04745C6.40194 21.9562 4.89766 21.0266 4.16179 19.5548C3.86017 18.9515 3.70314 18.2864 3.70312 17.612V13.8693C3.70312 13.1949 3.86019 12.5297 4.16179 11.9265C4.89766 10.4547 6.40194 9.52501 8.04745 9.52501Z'
				stroke='currentColor'
				strokeWidth='2'
				strokeMiterlimit='10'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
		</svg>
	)
}

function HiddenLobbyIcon() {
	return (
		<svg
			viewBox='0 0 32 32'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M28.2071 28.2071C28.5976 27.8166 28.5976 27.1834 28.2071 26.7929L5.20711 3.79289C4.81658 3.40237 4.18342 3.40237 3.79289 3.79289C3.40237 4.18342 3.40237 4.81658 3.79289 5.20711L26.7929 28.2071C27.1834 28.5976 27.8166 28.5976 28.2071 28.2071Z'
				fill='currentColor'
			/>
			<path
				fillRule='evenodd'
				clipRule='evenodd'
				d='M24.3628 23.9842C22.0396 25.6555 19.1861 26.9999 16.0001 26.9999C12.3561 26.9999 9.14706 25.2412 6.6689 23.2462C4.18104 21.2433 2.32859 18.9216 1.37718 17.6103C0.675056 16.6426 0.675056 15.3573 1.37718 14.3896C2.32859 13.0783 4.18104 10.7566 6.6689 8.75377C7.11685 8.39315 7.58869 8.04025 8.08266 7.70406L9.52495 9.14635C8.96973 9.50735 8.43489 9.89963 7.92307 10.3117C5.62696 12.1601 3.89368 14.3269 2.99598 15.5641C2.80212 15.8313 2.80212 16.1686 2.99598 16.4358C3.89368 17.6731 5.62696 19.8398 7.92307 21.6883C10.2289 23.5445 13.002 24.9999 16.0001 24.9999C18.5154 24.9999 20.8724 23.9755 22.928 22.5494L24.3628 23.9842ZM20.4278 20.0492C19.3308 21.2481 17.7533 21.9999 16.0001 21.9999C12.6864 21.9999 10.0002 19.3137 10.0002 16C10.0002 14.2468 10.752 12.6693 11.9509 11.5723L13.3672 12.9886C12.5293 13.7218 12.0002 14.7991 12.0002 16C12.0002 18.2091 13.791 19.9999 16.0001 19.9999C17.201 19.9999 18.2783 19.4708 19.0115 18.6329L20.4278 20.0492ZM19.9428 15.3216L21.87 17.2487C21.9553 16.8459 22.0001 16.4282 22.0001 16C22.0001 12.6862 19.3139 9.99997 16.0001 9.99997C15.5719 9.99997 15.1542 10.0448 14.7514 10.1301L16.6785 12.0573C18.3441 12.3418 19.6583 13.656 19.9428 15.3216ZM12.3259 7.7047C13.4979 7.2617 14.7288 7 16.0001 7C18.9982 7 21.7713 8.4554 24.0771 10.3117C26.3733 12.1601 28.1065 14.3269 29.0042 15.5641C29.1981 15.8313 29.1981 16.1686 29.0042 16.4358C28.2701 17.4476 26.9773 19.0809 25.2748 20.6535L26.69 22.0687C28.4962 20.3904 29.854 18.6703 30.623 17.6103C31.3252 16.6426 31.3252 15.3573 30.623 14.3896C29.6716 13.0783 27.8192 10.7566 25.3313 8.75377C22.8532 6.75875 19.6441 5 16.0001 5C14.1385 5 12.3904 5.45901 10.7953 6.17404L12.3259 7.7047Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function SearchPlayersIcon() {
	return (
		<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
			<path
				d='M4.5 7.5C3.55 8.7 3 10.25 3 12C3 13.75 3.55 15.3 4.5 16.5'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M19.5 7.5C20.45 8.7 21 10.25 21 12C21 13.75 20.45 15.3 19.5 16.5'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M8 9.5C7.45 10.15 7.15 11 7.15 12C7.15 13 7.45 13.85 8 14.5'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M16 9.5C16.55 10.15 16.85 11 16.85 12C16.85 13 16.55 13.85 16 14.5'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M12 13.6C12.8837 13.6 13.6 12.8837 13.6 12C13.6 11.1163 12.8837 10.4 12 10.4C11.1163 10.4 10.4 11.1163 10.4 12C10.4 12.8837 11.1163 13.6 12 13.6Z'
				fill='currentColor'
			/>
			<path
				d='M12 13.5L10.8 21H13.2L12 13.5Z'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinejoin='round'
			/>
		</svg>
	)
}

function CrisisIcon() {
	return (
		<svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
			<path
				d='M12 3L21 19H3L12 3Z'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinejoin='round'
			/>
			<path
				d='M12 9V13'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M12 17H12.01'
				stroke='currentColor'
				strokeWidth='3'
				strokeLinecap='round'
			/>
		</svg>
	)
}

function InfoIcon() {
	return (
		<svg
			width='20'
			height='20'
			viewBox='0 0 20 20'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M9.99958 0C4.47746 0 0 4.47746 0 9.99958C0 15.5217 4.47746 20 9.99958 20C15.5217 20 20 15.5217 20 9.99958C20 4.47746 15.5217 0 9.99958 0ZM12.0813 15.498C11.5666 15.7012 11.1568 15.8552 10.8495 15.9619C10.5431 16.0686 10.1867 16.1219 9.78116 16.1219C9.1581 16.1219 8.67302 15.9695 8.32762 15.6656C7.98222 15.3617 7.81037 14.9765 7.81037 14.5084C7.81037 14.3263 7.82307 14.1401 7.84847 13.9505C7.87471 13.7608 7.91619 13.5475 7.97291 13.3079L8.61714 11.0324C8.67386 10.814 8.72296 10.6066 8.7619 10.4135C8.80085 10.2188 8.81947 10.0402 8.81947 9.87767C8.81947 9.58815 8.75937 9.38497 8.64 9.27069C8.51894 9.1564 8.29122 9.10053 7.95175 9.10053C7.78582 9.10053 7.61481 9.12508 7.43958 9.17672C7.26603 9.23005 7.11534 9.27831 6.99175 9.32571L7.1619 8.62476C7.58349 8.45291 7.9873 8.30561 8.37249 8.1837C8.75767 8.06011 9.12169 7.99915 9.46455 7.99915C10.0834 7.99915 10.5608 8.14984 10.8969 8.44783C11.2313 8.74667 11.3998 9.13524 11.3998 9.6127C11.3998 9.71175 11.3879 9.88614 11.3651 10.135C11.3422 10.3848 11.299 10.6125 11.2364 10.8216L10.5956 13.0904C10.5431 13.2724 10.4965 13.4806 10.4542 13.7134C10.4127 13.9462 10.3924 14.124 10.3924 14.2434C10.3924 14.5448 10.4593 14.7505 10.5947 14.8597C10.7285 14.9689 10.963 15.0239 11.2948 15.0239C11.4514 15.0239 11.6267 14.996 11.8248 14.9418C12.0212 14.8876 12.1634 14.8394 12.2531 14.7979L12.0813 15.498ZM11.9678 6.2891C11.669 6.56677 11.3092 6.70561 10.8885 6.70561C10.4686 6.70561 10.1062 6.56677 9.80487 6.2891C9.50519 6.01143 9.35365 5.67365 9.35365 5.27915C9.35365 4.8855 9.50603 4.54688 9.80487 4.26667C10.1062 3.98561 10.4686 3.84593 10.8885 3.84593C11.3092 3.84593 11.6698 3.98561 11.9678 4.26667C12.2667 4.54688 12.4165 4.8855 12.4165 5.27915C12.4165 5.6745 12.2667 6.01143 11.9678 6.2891Z'
				fill='currentColor'
			/>
		</svg>
	)
}

function LobbySummaryIcon() {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width='24'
			height='24'
			viewBox='0 0 24 24'
			fill='none'
			aria-hidden='true'
		>
			<g clipPath='url(#lobbySummaryIconClipSettings)'>
				<path
					d='M5.5 9C6.0332 9 6.54858 9.04859 7.03613 9.13867C6.8189 9.71776 6.7002 10.345 6.7002 11C6.7002 12.4422 7.2764 13.7495 8.21094 14.7051C7.73753 14.8953 7.28944 15.1217 6.87598 15.3848C6.60216 15.559 6.33285 15.7579 6.07617 15.9795C5.88678 15.992 5.69461 16 5.5 16C2.46255 16 0.000181415 14.4329 0 12.5C0.000181414 10.5671 2.46255 9 5.5 9ZM18.5 9C21.5375 9 23.9998 10.5671 24 12.5C23.9998 14.4329 21.5375 16 18.5 16C18.3051 16 18.1126 15.9921 17.9229 15.9795C17.6663 15.7581 17.3976 15.5589 17.124 15.3848C16.7103 15.1215 16.2618 14.8953 15.7881 14.7051C16.7229 13.7494 17.2998 12.4424 17.2998 11C17.2998 10.3449 17.1802 9.71785 16.9629 9.13867C17.4507 9.04848 17.9665 9 18.5 9ZM5.5 0.700195C7.15685 0.700195 8.5 2.04334 8.5 3.7002C8.49988 5.35695 7.15678 6.7002 5.5 6.7002C3.84322 6.7002 2.50012 5.35695 2.5 3.7002C2.5 2.04334 3.84315 0.700195 5.5 0.700195ZM18.5 0.700195C20.1569 0.700195 21.5 2.04334 21.5 3.7002C21.4999 5.35695 20.1568 6.7002 18.5 6.7002C16.8432 6.7002 15.5001 5.35695 15.5 3.7002C15.5 2.04334 16.8431 0.700195 18.5 0.700195Z'
					fill='currentColor'
				/>
				<path
					d='M15 11C15 12.6569 13.6569 14 12 14C10.3431 14 9 12.6569 9 11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11Z'
					fill='currentColor'
				/>
				<path
					d='M17.5 19.8C17.5 21.733 15.0376 23.3 12 23.3C8.96243 23.3 6.5 21.733 6.5 19.8C6.5 17.867 8.96243 16.3 12 16.3C15.0376 16.3 17.5 17.867 17.5 19.8Z'
					fill='currentColor'
				/>
			</g>
			<defs>
				<clipPath id='lobbySummaryIconClipSettings'>
					<rect width='24' height='24' fill='white' />
				</clipPath>
			</defs>
		</svg>
	)
}

function ChevronIcon() {
	return (
		<svg
			viewBox='0 0 512 512'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M233.4 406.6C245.9 419.1 266.2 419.1 278.7 406.6L470.7 214.6C483.2 202.1 483.2 181.8 470.7 169.3C458.2 156.8 437.9 156.8 425.4 169.3L256 338.7L86.6 169.4C74.1 156.9 53.8 156.9 41.3 169.4C28.8 181.9 28.8 202.2 41.3 214.7L233.4 406.6Z'
				fill='currentColor'
			/>
		</svg>
	)
}

const ACCESS_OPTIONS: AccessOption[] = [
	{
		value: 'public',
		title: 'Открытое лобби',
		description: 'Видно в общем списке, войти может любой игрок',
		badge: 'Открытое',
		icon: <PublicLobbyIcon />,
	},
	{
		value: 'password',
		title: 'Лобби с паролем',
		description: 'Видно в списке, но для входа нужен пароль',
		badge: 'С паролем',
		icon: <PasswordLobbyIcon />,
	},
	{
		value: 'hidden_password',
		title: 'Скрытое лобби',
		description: 'Не видно в списке, вход по ссылке и паролю',
		badge: 'Скрытое',
		icon: <HiddenLobbyIcon />,
	},
]

function CustomSelect<T extends string>({
	value,
	options,
	onChange,
	ariaLabel,
}: {
	value: T
	options: SelectOption<T>[]
	onChange: (value: T) => void
	ariaLabel: string
}) {
	const [isOpen, setIsOpen] = useState(false)
	const selectedOption =
		options.find(option => option.value === value) || options[0]

	return (
		<div
			className={`${styles.customSelect} ${
				isOpen ? styles.customSelectOpen : ''
			}`}
			onBlur={event => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					setIsOpen(false)
				}
			}}
		>
			<button
				type='button'
				className={styles.customSelected}
				onClick={() => setIsOpen(prev => !prev)}
				aria-label={ariaLabel}
				aria-expanded={isOpen}
			>
				<span>{selectedOption.label}</span>
				<span className={styles.customArrow}>
					<ChevronIcon />
				</span>
			</button>

			<div className={styles.customOptions}>
				{options.map(option => (
					<button
						key={option.value}
						type='button'
						className={`${styles.customOption} ${
							option.value === value ? styles.customOptionActive : ''
						}`}
						onMouseDown={event => event.preventDefault()}
						onClick={() => {
							onChange(option.value)
							setIsOpen(false)
						}}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	)
}

function AccessDropdown({
	value,
	onChange,
}: {
	value: LobbyAccessType
	onChange: (value: LobbyAccessType) => void
}) {
	const [isOpen, setIsOpen] = useState(false)
	const selectedOption =
		ACCESS_OPTIONS.find(option => option.value === value) || ACCESS_OPTIONS[0]

	return (
		<div
			className={`${styles.accessDropdown} ${
				isOpen ? styles.accessDropdownOpen : ''
			}`}
			onBlur={event => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					setIsOpen(false)
				}
			}}
		>
			<button
				type='button'
				className={styles.accessSelected}
				onClick={() => setIsOpen(prev => !prev)}
				aria-label='Выбрать тип лобби'
				aria-expanded={isOpen}
			>
				<span className={styles.accessIcon}>{selectedOption.icon}</span>

				<span className={styles.accessSelectedText}>
					<span className={styles.accessSelectedTitle}>
						{selectedOption.title}
					</span>
					<span className={styles.accessSelectedDescription}>
						{selectedOption.description}
					</span>
				</span>

				<span
					className={`${styles.accessBadge} ${
						value === 'public'
							? styles.accessBadgePublic
							: styles.accessBadgePrivate
					}`}
				>
					{selectedOption.badge}
				</span>

				<span className={styles.accessArrow}>
					<ChevronIcon />
				</span>
			</button>

			<div className={styles.accessOptions}>
				{ACCESS_OPTIONS.map(option => (
					<button
						key={option.value}
						type='button'
						className={`${styles.accessOption} ${
							option.value === value ? styles.accessOptionActive : ''
						}`}
						onMouseDown={event => event.preventDefault()}
						onClick={() => {
							onChange(option.value)
							setIsOpen(false)
						}}
					>
						<span className={styles.accessOptionIcon}>{option.icon}</span>

						<span className={styles.accessOptionText}>
							<span className={styles.accessOptionTitle}>{option.title}</span>
							<span className={styles.accessOptionDescription}>
								{option.description}
							</span>
						</span>
					</button>
				))}
			</div>
		</div>
	)
}

export function LobbySettingsModal({
	isOpen,
	onClose,
	currentSettings,
	onSaveSettings,
	playersCount = 0,
}: LobbySettingsModalProps) {
	const [settings, setSettings] = useState<LobbySettings>(currentSettings)
	const modalBodyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isOpen) {
			setSettings(currentSettings)
		}
	}, [isOpen, currentSettings])

	useEffect(() => {
		if (!isOpen) return

		const container = modalBodyRef.current
		if (!container) return

		const handleWheel = (event: WheelEvent) => {
			if (container.scrollHeight <= container.clientHeight) return

			container.scrollTop += event.deltaY
			event.preventDefault()
		}

		container.addEventListener('wheel', handleWheel, { passive: false })

		return () => {
			container.removeEventListener('wheel', handleWheel)
		}
	}, [isOpen])

	const visibility = (settings.visibility || 'public') as LobbyAccessType
	const hiddenRolesCount = settings.hiddenRolesCount ? 1 : 0
	const passwordValue = settings.password || ''
	const accessNeedsPassword =
		visibility === 'password' || visibility === 'hidden_password'
	const hasExistingPassword = !!settings.hasPassword
	const hasNewPassword = passwordValue.trim().length >= 4
	const passwordIsValid =
		!accessNeedsPassword || hasExistingPassword || hasNewPassword
	const searchingPlayers =
		visibility === 'hidden_password' ? false : !!settings.searchingPlayers
	const maxPlayersForPreview = settings.maxPlayers || 4
	const openSlotsCount = getOpenSlotsCount(maxPlayersForPreview, playersCount)

	const handleSelectVisibility = (nextVisibility: LobbyAccessType) => {
		setSettings(prev => {
			const currentPassword = prev.password || ''
			const hasValidPassword = currentPassword.trim().length >= 4

			if (nextVisibility === 'public') {
				return {
					...prev,
					visibility: 'public',
					isPrivate: false,
					hasPassword: false,
					password: '',
				}
			}

			if (nextVisibility === 'password') {
				return {
					...prev,
					visibility: 'password',
					isPrivate: false,
					hasPassword: !!prev.hasPassword || hasValidPassword,
				}
			}

			return {
				...prev,
				visibility: 'hidden_password',
				isPrivate: true,
				hasPassword: !!prev.hasPassword || hasValidPassword,
				searchingPlayers: false,
			}
		})
	}

	const handlePasswordChange = (value: string) => {
		setSettings(prev => ({
			...prev,
			password: value,
			hasPassword:
				prev.visibility === 'password' || prev.visibility === 'hidden_password'
					? !!prev.hasPassword || value.trim().length >= 4
					: false,
		}))
	}

	const handleSave = () => {
		const normalizedMaxPlayers = clampNumber(settings.maxPlayers || 4, 2, 6)
		const normalizedVisibility = (settings.visibility ||
			'public') as LobbyAccessType
		const normalizedPassword = (settings.password || '').trim()
		const normalizedHiddenRolesCount = settings.hiddenRolesCount ? 1 : 0
		const normalizedSearchingPlayers =
			normalizedVisibility === 'hidden_password'
				? false
				: !!settings.searchingPlayers

		onSaveSettings({
			...settings,
			maxPlayers: normalizedMaxPlayers,
			visibility: normalizedVisibility,
			isPrivate: normalizedVisibility === 'hidden_password',
			password:
				normalizedVisibility === 'password' ||
				normalizedVisibility === 'hidden_password'
					? normalizedPassword
					: '',
			hasPassword:
				normalizedVisibility === 'password' ||
				normalizedVisibility === 'hidden_password'
					? !!settings.hasPassword || normalizedPassword.length >= 4
					: false,
			difficulty: settings.difficulty || 'normal',
			gameMode: settings.gameMode || 'standard',
			turnTime: settings.turnTime ?? 180,
			maxRounds: clampNumber(settings.maxRounds ?? 10, 3, 20),
			discussionTime: clampNumber(settings.discussionTime ?? 180, 30, 600),
			votingTime: clampNumber(settings.votingTime ?? 60, 15, 300),
			hiddenRolesCount: normalizedHiddenRolesCount,
			enableCrises: settings.enableCrises !== false,
			searchingPlayers: normalizedSearchingPlayers,
		})

		onClose()
	}

	if (!isOpen) return null

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modalContent} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<div className={styles.headerCopy}>
						<p className={styles.modalEyebrow}>STATION EDEN</p>
						<h2 className={styles.modalTitle}>Настройки лобби</h2>
						<p className={styles.modalSubtitle}>
							Выберите доступ и правила перед запуском игры
						</p>
					</div>

					<button
						className={styles.closeButton}
						onClick={onClose}
						type='button'
						aria-label='Закрыть настройки'
					>
						<span className={styles.closeIcon} aria-hidden='true' />
					</button>
				</div>

				<div className={styles.modalBody} ref={modalBodyRef}>
					<div className={styles.contentGrid}>
						<div className={styles.mainColumn}>
							<section className={styles.section}>
								<div className={styles.sectionHeader}>
									<div>
										<h3>Тип лобби</h3>
										<p>Определяет, кто увидит лобби и как сможет войти</p>
									</div>
								</div>

								<AccessDropdown
									value={visibility}
									onChange={handleSelectVisibility}
								/>

								{accessNeedsPassword && (
									<div className={styles.passwordBox}>
										<label className={styles.settingLabel}>Пароль лобби</label>
										<input
											type='password'
											value={passwordValue}
											onChange={e => handlePasswordChange(e.target.value)}
											placeholder={
												hasExistingPassword
													? 'Оставьте пустым, чтобы сохранить текущий пароль'
													: 'Минимум 4 символа'
											}
											className={styles.passwordInput}
										/>
									</div>
								)}
							</section>

							<section className={styles.section}>
								<div className={styles.sectionHeader}>
									<div>
										<h3>Поиск игроков</h3>
										<p>
											Показывает другим, что в лобби ещё есть свободные места
										</p>
									</div>
								</div>

								<label
									className={`${styles.searchToggleCard} ${
										searchingPlayers ? styles.searchToggleCardActive : ''
									} ${
										visibility === 'hidden_password' ? styles.disabledCard : ''
									}`}
								>
									<span className={styles.searchToggleIcon}>
										<SearchPlayersIcon />
									</span>

									<span className={styles.searchToggleInfo}>
										<span className={styles.searchToggleTitle}>
											Ищем игроков
										</span>
										<span className={styles.searchToggleHint}>
											Лобби получит заметную пометку в списке активных комнат
										</span>
									</span>

									{searchingPlayers && openSlotsCount > 0 && (
										<span className={styles.searchSlotsBadge}>
											+{openSlotsCount}
										</span>
									)}

									<span className={styles.switch}>
										<input
											type='checkbox'
											checked={searchingPlayers}
											disabled={visibility === 'hidden_password'}
											onChange={e =>
												setSettings(prev => ({
													...prev,
													searchingPlayers:
														prev.visibility === 'hidden_password'
															? false
															: e.target.checked,
												}))
											}
										/>
										<span className={styles.switchTrack}>
											<span className={styles.switchThumb} />
										</span>
									</span>
								</label>

								{visibility === 'hidden_password' && (
									<p className={styles.settingHint}>
										Для скрытого лобби поиск игроков недоступен, потому что оно
										не показывается в общем списке
									</p>
								)}
							</section>

							<section className={styles.section}>
								<div className={styles.sectionHeader}>
									<div>
										<h3>Параметры матча</h3>
										<p>Основные правила сессии до запуска игры</p>
									</div>
								</div>

								<div className={styles.formGrid}>
									<div className={styles.settingItem}>
										<label className={styles.settingLabel}>
											Максимум игроков
										</label>
										<CustomSelect
											value={String(settings.maxPlayers || 4)}
											ariaLabel='Максимум игроков'
											onChange={value =>
												setSettings(prev => ({
													...prev,
													maxPlayers: Number(value),
												}))
											}
											options={[
												{ value: '2', label: '2 игрока' },
												{ value: '3', label: '3 игрока' },
												{ value: '4', label: '4 игрока' },
												{ value: '5', label: '5 игроков' },
												{ value: '6', label: '6 игроков' },
											]}
										/>
									</div>

									<div className={styles.settingItem}>
										<label className={styles.settingLabel}>Режим игры</label>
										<CustomSelect
											value={settings.gameMode || 'standard'}
											ariaLabel='Режим игры'
											onChange={value =>
												setSettings(prev => ({
													...prev,
													gameMode: value,
												}))
											}
											options={[
												{ value: 'standard', label: 'Стандартный' },
												{ value: 'extended', label: 'Расширенный' },
												{ value: 'competitive', label: 'Соревновательный' },
												{ value: 'cooperative', label: 'Кооперативный' },
											]}
										/>
									</div>

									<div className={styles.settingItem}>
										<label className={styles.settingLabel}>Сложность</label>
										<CustomSelect
											value={settings.difficulty || 'normal'}
											ariaLabel='Сложность'
											onChange={value => {
												const difficulty = value as 'easy' | 'normal' | 'hard'

												setSettings(prev => ({
													...prev,
													difficulty,
												}))
											}}
											options={[
												{ value: 'easy', label: 'Лёгкая' },
												{ value: 'normal', label: 'Средняя' },
												{ value: 'hard', label: 'Сложная' },
											]}
										/>
									</div>

									<div className={styles.settingItem}>
										<label className={styles.settingLabel}>Время на ход</label>
										<CustomSelect
											value={String(settings.turnTime ?? 180)}
											ariaLabel='Время на ход'
											onChange={value =>
												setSettings(prev => ({
													...prev,
													turnTime: Number(value),
												}))
											}
											options={[
												{ value: '60', label: '1 минута' },
												{ value: '180', label: '3 минуты' },
												{ value: '300', label: '5 минут' },
											]}
										/>
									</div>

									<div className={styles.settingItem}>
										<label className={styles.settingLabel}>
											Раундов до финала
										</label>
										<CustomSelect
											value={String(settings.maxRounds ?? 10)}
											ariaLabel='Раундов до финала'
											onChange={value =>
												setSettings(prev => ({
													...prev,
													maxRounds: Number(value),
												}))
											}
											options={[
												{ value: '3', label: '3 раунда' },
												{ value: '5', label: '5 раундов' },
												{ value: '10', label: '10 раундов' },
												{ value: '15', label: '15 раундов' },
												{ value: '20', label: '20 раундов' },
											]}
										/>
									</div>

									<div className={styles.settingItem}>
										<div className={styles.settingLabelRow}>
											<label className={styles.settingLabel}>
												Скрытые роли
											</label>

											<span
												className={styles.infoTooltip}
												tabIndex={0}
												aria-label='Добавляют тайные цели одному из игроков после старта игры'
											>
												<InfoIcon />
												<span className={styles.infoTooltipText}>
													Добавляют тайные цели одному из игроков после старта
													игры
												</span>
											</span>
										</div>

										<CustomSelect
											value={String(hiddenRolesCount > 0 ? 1 : 0)}
											ariaLabel='Скрытые роли'
											onChange={value =>
												setSettings(prev => ({
													...prev,
													hiddenRolesCount: Number(value),
												}))
											}
											options={[
												{ value: '0', label: 'Выключены' },
												{ value: '1', label: '1 случайная роль' },
											]}
										/>
									</div>
								</div>

								<div className={styles.ruleCards}>
									<label
										className={`${styles.ruleCard} ${
											settings.enableCrises !== false
												? styles.ruleCardActive
												: ''
										}`}
									>
										<span className={styles.ruleIcon}>
											<CrisisIcon />
										</span>
										<span className={styles.ruleText}>
											<strong>Кризисы станции</strong>
											<span>
												Случайные события усложняют обсуждение и выживание
											</span>
										</span>

										<span className={styles.switch}>
											<input
												type='checkbox'
												checked={settings.enableCrises !== false}
												onChange={e =>
													setSettings(prev => ({
														...prev,
														enableCrises: e.target.checked,
													}))
												}
											/>
											<span className={styles.switchTrack}>
												<span className={styles.switchThumb} />
											</span>
										</span>
									</label>
								</div>
							</section>
						</div>

						<aside className={styles.previewPanel}>
							<div className={styles.previewHeader}>
								<span className={styles.previewIcon}>
									<LobbySummaryIcon />
								</span>
								<div>
									<h3>Сводка лобби</h3>
									<p>Итог выбранных параметров</p>
								</div>
							</div>

							<div className={styles.previewLobbyCard}>
								<div className={styles.previewLobbyTop}>
									<div>
										<strong>{getAccessSummaryTitle(visibility)}</strong>
										<span>{getAccessDescription(visibility)}</span>
									</div>
								</div>

								<div className={styles.previewSummaryLine}>
									{playersCount}/{maxPlayersForPreview} игроков ·{' '}
									{getGameModeName(settings.gameMode)} ·{' '}
									{getDifficultyLabel(settings.difficulty)}
								</div>

								<div className={styles.previewFacts}>
									<div>
										<span>Ход</span>
										<strong>{getTurnTimeLabel(settings.turnTime)}</strong>
									</div>

									<div>
										<span>Кризисы</span>
										<strong>{getCrisisLabel(settings.enableCrises)}</strong>
									</div>

									<div>
										<span>Скрытые роли</span>
										<strong>{getHiddenRolesLabel(hiddenRolesCount)}</strong>
									</div>

									<div>
										<span>Поиск игроков</span>
										<strong>
											{searchingPlayers && openSlotsCount > 0
												? `+${openSlotsCount}`
												: 'выкл'}
										</strong>
									</div>
								</div>
							</div>
						</aside>
					</div>
				</div>

				<div className={styles.modalActions}>
					<button
						className={styles.saveButton}
						onClick={handleSave}
						disabled={!passwordIsValid}
						type='button'
					>
						Сохранить настройки
					</button>
				</div>
			</div>
		</div>
	)
}
