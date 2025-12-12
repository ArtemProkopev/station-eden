'use client'

import { Crisis } from '../../types/game.types'
import styles from './CrisisSystem.module.css'

interface CrisisSystemProps {
  crisis: Crisis
  onResolve: (solution: string) => void
  timeLeft: number
}

export default function CrisisSystem({ 
  crisis, 
  onResolve, 
  timeLeft 
}: CrisisSystemProps) {
  const getCrisisColor = (type: string) => {
    const colors: Record<string, string> = {
      technological: '#4dabf7',
      biological: '#66ff99',
      external: '#ff6b6b'
    }
    return colors[type] || '#63efff'
  }

  const color = getCrisisColor(crisis.type)
  const progress = Math.max(0, Math.min(100, (timeLeft / crisis.duration) * 100))

  return (
    <div 
      className={styles.crisisContainer}
      style={{ borderColor: color }}
    >
      <div className={styles.crisisHeader}>
        <h3 className={styles.crisisTitle} style={{ color }}>
          КРИЗИС: {crisis.title}
        </h3>
        <div className={styles.crisisTimer}>
          <div className={styles.timerBar}>
            <div 
              className={styles.timerFill}
              style={{ 
                width: `${progress}%`,
                backgroundColor: color
              }}
            />
          </div>
          <span className={styles.timerText}>{timeLeft}с</span>
        </div>
      </div>

      <div className={styles.crisisContent}>
        <p className={styles.crisisDescription}>{crisis.description}</p>
        
        <div className={styles.crisisInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Приоритет:</span>
            <span className={styles.infoValue}>{crisis.priority.join(', ')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Штраф:</span>
            <span className={styles.infoValue} style={{ color: '#ff6666' }}>
              {crisis.penalty}
            </span>
          </div>
        </div>

        <div className={styles.solutionsSection}>
          <h4 className={styles.solutionsTitle}>Варианты решения:</h4>
          <div className={styles.solutionsGrid}>
            {crisis.solutions.map((solution, index) => (
              <button
                key={index}
                className={styles.solutionButton}
                style={{ borderColor: color }}
                onClick={() => onResolve(solution)}
              >
                {solution}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}