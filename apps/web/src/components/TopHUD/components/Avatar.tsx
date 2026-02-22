'use client'

import Image from 'next/image'
import React from 'react'
import styles from './Avatar.module.css'

interface AvatarProps {
	src?: string
	alt?: string
	username?: string
	size?: 'small' | 'medium' | 'large'
	className?: string
}

export function Avatar({
	src,
	alt,
	username,
	size = 'medium',
	className = '',
}: AvatarProps) {
	const [imgError, setImgError] = React.useState(false)

	const combinedClassName =
		`${styles.avatar} ${styles[`size-${size}`]} ${className}`.trim()
	const displayAlt =
		alt ||
		(username ? `Аватар пользователя ${username}` : 'Аватар пользователя')

	const handleError = () => {
		setImgError(true)
	}

	if (!src || imgError) {
		return (
			<span className={combinedClassName} role='img' aria-label={displayAlt}>
				{/* Placeholder Icon */}
				<div className='icon-placeholder' aria-hidden='true'></div>
			</span>
		)
	}

	return (
		<Image
			src={src}
			alt={displayAlt}
			className={combinedClassName}
			width={40} // Default size
			height={40} // Default size
			onError={handleError}
		/>
	)
}
