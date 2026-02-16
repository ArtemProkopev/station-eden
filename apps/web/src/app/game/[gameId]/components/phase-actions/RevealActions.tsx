// apps/web/src/app/game/[gameId]/components/phase-actions/RevealActions.tsx
import { RevealedPlayer } from '../types/game.types'
import { getCardTypeDisplayName } from '../utils/game.utils'
import styles from '../../page.module.css'

interface RevealActionsProps {
  revealedPlayer: RevealedPlayer
  revealingCards: string[]
  currentRevealIndex: number
  isRevealing: boolean
}

export default function RevealActions({ 
  revealedPlayer, 
  revealingCards, 
  currentRevealIndex, 
  isRevealing 
}: RevealActionsProps) {
  return (
    <div className={styles.phaseActions}>
      <div className={styles.revealPhaseInfo}>
        <h3>Раскрытие карт выбывшего игрока</h3>
        <p>Карты раскрываются по очереди...</p>
        {revealedPlayer && (
          <div className={styles.currentReveal}>
            <p>
              Раскрываются карты игрока: <strong>{revealedPlayer.name}</strong>
            </p>
            {isRevealing && (
              <p>
                Карта {currentRevealIndex} из {revealingCards.length}:{' '}
                <span className={styles.currentCard}>
                  {getCardTypeDisplayName(
                    revealingCards[currentRevealIndex] || '',
                  )}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}