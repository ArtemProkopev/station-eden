'use client'

import { memo, useCallback } from 'react'
import styles from './PanelWithPlayButton.module.css'

interface PanelWithPlayButtonProps {
	onPlayClick?: () => void
	className?: string
}

const PANEL_IMAGE_URL =
	'https://cdn.assets.stationeden.ru/web/panel-optimized.webp'

function PanelWithPlayButton({
	onPlayClick,
	className = '',
}: PanelWithPlayButtonProps) {
	const handlePlayClick = useCallback(() => {
		onPlayClick?.()
	}, [onPlayClick])

	return (
		<div className={`${styles.mainButtonContainer} ${className}`}>
			<img
				src={PANEL_IMAGE_URL}
				alt=''
				aria-hidden='true'
				className={styles.panelBackground}
				width={600}
				height={400}
				loading='eager'
				decoding='async'
				fetchPriority='high'
			/>

			<button
				className={`${styles.mainPlayButton} cursor-target`}
				onClick={handlePlayClick}
				type='button'
				aria-label='Начать игру'
			>
				<span className={styles.playText}>Играть</span>
			</button>
		</div>
	)
}

export default memo(PanelWithPlayButton)
