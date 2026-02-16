// apps/web/src/app/game/[gameId]/components/screens/NarrationScreen.tsx
import { useEffect } from 'react'
import styles from '../../page.module.css'

interface NarrationScreenProps {
  narration: { title: string; text: string }
  phaseTimeLeft: number
  canSkipNarration: boolean
  onSkip: () => void
}

export default function NarrationScreen({ 
  narration, 
  phaseTimeLeft, 
  canSkipNarration, 
  onSkip 
}: NarrationScreenProps) {
  
  // Автоматический переход по окончании таймера
  useEffect(() => {
    if (phaseTimeLeft <= 0) {
      console.log('Timer finished, auto-skipping narration')
      onSkip()
    }
  }, [phaseTimeLeft, onSkip])

  return (
    <div className={styles.narrationOverlay}>
      <div className={styles.narrationContent}>
        <h2>{narration?.title}</h2>
        <div className={styles.narrationText}>
          {narration?.text.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className={styles.narrationTimer}>
          {formatTime(phaseTimeLeft)}
          {canSkipNarration && (
            <button
              className={styles.skipButton}
              onClick={onSkip}
            >
              Пропустить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}