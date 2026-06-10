'use client'

import { memo } from 'react'
import styles from './GameAtmosphere.module.css'

function GameAtmosphere() {
	return (
		<div className={styles.gameAtmosphere} aria-hidden='true'>
			<div className={styles.gameAtmosphereImage} />
			<div className={styles.gameAtmosphereCore} />
			<div className={styles.gameAtmosphereGrid} />
			<div className={styles.gameAtmosphereVignette} />
		</div>
	)
}

export default memo(GameAtmosphere)
