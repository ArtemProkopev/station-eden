/* eslint-disable @next/next/no-img-element */
interface IconProps {
	className?: string
	onError?: () => void
}

export const PlanetIcon = ({ className }: IconProps) => (
	<svg
		viewBox='0 0 24 24'
		width='34'
		height='34'
		aria-hidden='true'
		className={className}
	>
		<circle cx='12' cy='12' r='10' fill='#63EFFF' opacity='0.8' />
		<ellipse cx='8' cy='9' rx='3' ry='2' fill='#4A90E2' />
		<path
			d='M5 15c2-1 4-1 6 0 2 1 4 1 6 0'
			stroke='#4A90E2'
			strokeWidth='1.5'
			fill='none'
		/>
	</svg>
)

export const PolygonIcon = ({ className }: IconProps) => (
	<svg
		viewBox='0 0 24 24'
		width='34'
		height='34'
		aria-hidden='true'
		className={className}
	>
		<polygon
			points='12,2 22,8 22,16 12,22 2,16 2,8'
			fill='#63EFFF'
			opacity='0.8'
			stroke='#4A90E2'
			strokeWidth='1.5'
		/>
	</svg>
)

interface FallbackIconProps extends IconProps {
	type: 'planet' | 'polygon'
	fallbackUrl: string
}

export const FallbackIcon = ({
	fallbackUrl,
	onError,
	className,
}: FallbackIconProps) => {
	return (
		<img
			src={fallbackUrl}
			alt=''
			role='presentation'
			className={className}
			onError={onError}
		/>
	)
}
