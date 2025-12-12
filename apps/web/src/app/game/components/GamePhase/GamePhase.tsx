'use client'

import styles from './GamePhase.module.css'

interface GamePhaseProps {
  phase: string
  round: number
  timeLeft: number
  onPhaseAction: () => void
}

export default function GamePhase({ 
  phase, 
  round, 
  timeLeft, 
  onPhaseAction 
}: GamePhaseProps) {
  const getPhaseConfig = () => {
    const configs: Record<string, {
      title: string
      description: string
      actionText: string
      color: string
    }> = {
      preparation: {
        title: 'Фаза подготовки',
        description: 'Изучите свои карты и роли',
        actionText: 'Я готов к обсуждению',
        color: '#4dabf7'
      },
      discussion: {
        title: 'Фаза обсуждения',
        description: 'Раскройте 1 карту и обсудите с командой',
        actionText: 'Запустить голосование',
        color: '#ffa94d'
      },
      voting: {
        title: 'Фаза голосования',
        description: 'Проголосуйте за исключение игрока',
        actionText: 'Проголосовать',
        color: '#ff6b6b'
      },
      reveal: {
        title: 'Фаза раскрытия',
        description: 'Выбывший игрок открывает свои карты',
        actionText: 'Продолжить',
        color: '#9775fa'
      },
      crisis: {
        title: 'Кризисная ситуация',
        description: 'Команда должна решить проблему',
        actionText: 'Решить кризис',
        color: '#f06595'
      }
    }
    
    return configs[phase] || {
      title: phase,
      description: '',
      actionText: 'Продолжить',
      color: '#63efff'
    }
  }

  const config = getPhaseConfig()
  const progress = Math.max(0, Math.min(100, (timeLeft / 60) * 100))

  return (
    <div 
      className={styles.phaseContainer}
      style={{ borderColor: config.color }}
    >
      <div className={styles.phaseHeader}>
        <h2 className={styles.phaseTitle} style={{ color: config.color }}>
          {config.title}
        </h2>
        <div className={styles.roundBadge}>
          Раунд {round}
        </div>
      </div>
      
      <div className={styles.phaseContent}>
        <p className={styles.phaseDescription}>{config.description}</p>
        
        <div className={styles.timerProgress}>
          <div className={styles.timerLabel}>
            Осталось времени: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${progress}%`,
                backgroundColor: config.color
              }}
            />
          </div>
        </div>
        
        {phase === 'discussion' && (
          <div className={styles.discussionInfo}>
            <div className={styles.infoCard}>
              <h4>Правила обсуждения:</h4>
              <ul>
                <li>Каждый игрок должен раскрыть 1 карту</li>
                <li>Обсудите подозрительных игроков</li>
                <li>Приготовьте аргументы для голосования</li>
              </ul>
            </div>
          </div>
        )}
        
        {phase === 'voting' && (
          <div className={styles.votingInfo}>
            <div className={styles.infoCard}>
              <h4>Правила голосования:</h4>
              <ul>
                <li>Голосование тайное</li>
                <li>Игрок с большинством голосов выбывает</li>
                <li>При ничьей - голос капитана решает</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      
      <button 
        className={styles.actionButton}
        onClick={onPhaseAction}
        style={{ 
          backgroundColor: config.color,
          borderColor: config.color
        }}
      >
        {config.actionText}
      </button>
    </div>
  )
}