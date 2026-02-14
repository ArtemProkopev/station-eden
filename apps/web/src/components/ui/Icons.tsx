// apps/web/src/components/ui/Icons.tsx
import { memo } from 'react'

interface IconProps {
	className?: string
}

export const EyeIcon = memo(function EyeIcon({ className }: IconProps) {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
			strokeLinejoin='round'
			focusable='false'
			className={className}
		>
			<path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z' />
			<circle cx='12' cy='12' r='3' />
		</svg>
	)
})
EyeIcon.displayName = 'EyeIcon'

export const EyeOffIcon = memo(function EyeOffIcon({ className }: IconProps) {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2.5'
			strokeLinecap='round'
			strokeLinejoin='round'
			focusable='false'
			className={className}
		>
			<path d='M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.8 21.8 0 0 1 4.22-4.92' />
			<path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
			<path d='M10.58 4.1A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.12 3.91' />
			<line x1='1' y1='1' x2='23' y2='23' />
		</svg>
	)
})
EyeOffIcon.displayName = 'EyeOffIcon'

export const ClockIcon = memo(function ClockIcon({ className }: IconProps) {
	return (
		<svg
			viewBox='0 0 24 24'
			aria-hidden='true'
			width='16'
			height='16'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
			focusable='false'
			className={className}
		>
			<circle cx='12' cy='12' r='9' />
			<path d='M12 7v5l3 2' />
		</svg>
	)
})
ClockIcon.displayName = 'ClockIcon'
