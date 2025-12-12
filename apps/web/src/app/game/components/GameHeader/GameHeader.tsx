'use client'

import styles from './GameHeader.module.css'

interface GameHeaderProps {
  gameId: string
  phase: string
  round: number
  timeLeft: number
}

export default function GameHeader({ 
  gameId, 
  phase, 
  round, 
  timeLeft 
}: GameHeaderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const getPhaseLabel = (phase: string) => {
    const phases: Record<string, string> = {
      preparation: 'Подготовка',
      discussion: 'Обсуждение',
      voting: 'Голосование',
      reveal: 'Раскрытие',
      crisis: 'Кризис'
    }
    return phases[phase] || phase
  }

  return (
    <div className={styles.header}>
      <div className={styles.gameInfo}>
        <div className={styles.gameId}>
          <span className={styles.label}>ID игры:</span>
          <span className={styles.value}>{gameId}</span>
        </div>
        <div className={styles.round}>
          <span className={styles.label}>Раунд:</span>
          <span className={styles.value}>{round}</span>
        </div>
      </div>
      
      <div className={styles.phaseContainer}>
        <div className={styles.phase}>
          <span className={styles.label}>Фаза:</span>
          <span className={styles.value}>{getPhaseLabel(phase)}</span>
        </div>
        <div className={styles.timer}>
          <div className={styles.timerCircle}>
            <span className={styles.timerText}>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}