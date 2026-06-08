'use client'

import dynamic from 'next/dynamic'
import { memo } from 'react'
import styles from './GameAtmosphere.module.css'

const Galaxy = dynamic(() => import('./IntroCinematic/Galaxy/Galaxy'), {
	ssr: false,
	loading: () => null,
})

const GALAXY_FOCAL: [number, number] = [0.5, 0.42]
const GALAXY_ROTATION: [number, number] = [1.0, 0.025]

function GameAtmosphere() {
	return (
		<div className={styles.gameAtmosphere} aria-hidden='true'>
			<div className={styles.gameAtmosphereImage} />

			<div className={styles.gameAtmosphereGalaxy}>
				<Galaxy
					mouseInteraction={false}
					mouseRepulsion={false}
					transparent
					density={1.15}
					glowIntensity={0.78}
					saturation={0.5}
					hueShift={210}
					starSpeed={0.22}
					speed={0.38}
					twinkleIntensity={0.22}
					rotationSpeed={0.012}
					starScale={0.78}
					flareIntensity={0.36}
					focal={GALAXY_FOCAL}
					rotation={GALAXY_ROTATION}
				/>
			</div>

			<div className={styles.gameAtmosphereCore} />
			<div className={styles.gameAtmosphereGrid} />
			<div className={styles.gameAtmosphereVignette} />
		</div>
	)
}

export default memo(GameAtmosphere)
