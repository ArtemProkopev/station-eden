'use client'

import { useState } from 'react'
import styles from './AbilitesPanel.module.css'

interface Ability {
  id: string
  name: string
  description: string
  available: boolean
  used: boolean
  targetType?: 'self' | 'other' | 'profession' | 'resource'
}

interface AbilitiesPanelProps {
  abilities: Ability[]
  onUseAbility: (abilityId: string, targetId?: string, extraData?: string) => void
  players: Array<{ id: string; name: string; isAlive: boolean }>
  professions: Array<{ id: string; name: string }>
  resources: Array<{ id: string; name: string }>
  disabled?: boolean
}

export default function AbilitiesPanel({
  abilities,
  onUseAbility,
  players,
  professions,
  resources,
  disabled = false,
}: AbilitiesPanelProps) {
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [selectedProfession, setSelectedProfession] = useState<string>('')
  const [selectedResource, setSelectedResource] = useState<string>('')

  const handleAbilityClick = (abilityId: string) => {
    const ability = abilities.find(a => a.id === abilityId)
    if (!ability || !ability.available || ability.used || disabled) return

    if (ability.targetType) {
      setSelectedAbility(abilityId)
    } else {
      onUseAbility(abilityId)
    }
  }

  const handleConfirm = () => {
    if (!selectedAbility) return

    const ability = abilities.find(a => a.id === selectedAbility)
    if (!ability) return

    if (ability.targetType === 'other' && selectedTarget) {
      onUseAbility(selectedAbility, selectedTarget)
    } else if (ability.targetType === 'profession' && selectedProfession) {
      onUseAbility(selectedAbility, undefined, selectedProfession)
    } else if (ability.targetType === 'resource' && selectedResource) {
      onUseAbility(selectedAbility, undefined, selectedResource)
    } else if (ability.targetType === 'self') {
      onUseAbility(selectedAbility)
    }

    setSelectedAbility(null)
    setSelectedTarget('')
    setSelectedProfession('')
    setSelectedResource('')
  }

  const handleCancel = () => {
    setSelectedAbility(null)
    setSelectedTarget('')
    setSelectedProfession('')
    setSelectedResource('')
  }

  const getAbilityButtonClass = (ability: Ability) => {
    if (!ability.available) return styles.abilityDisabled
    if (ability.used) return styles.abilityUsed
    if (selectedAbility === ability.id) return styles.abilitySelected
    return styles.abilityButton
  }

  const renderTargetSelector = () => {
    const ability = abilities.find(a => a.id === selectedAbility)
    if (!ability) return null

    switch (ability.targetType) {
      case 'other':
        return (
          <div className={styles.targetSelector}>
            <h4>Выберите цель:</h4>
            <div className={styles.targetList}>
              {players.filter(p => p.isAlive).map(player => (
                <button
                  key={player.id}
                  className={`${styles.targetButton} ${selectedTarget === player.id ? styles.targetSelected : ''}`}
                  onClick={() => setSelectedTarget(player.id)}
                >
                  {player.name}
                </button>
              ))}
            </div>
          </div>
        )

      case 'profession':
        return (
          <div className={styles.targetSelector}>
            <h4>Выберите профессию для маскировки:</h4>
            <div className={styles.targetList}>
              {professions.map(prof => (
                <button
                  key={prof.id}
                  className={`${styles.targetButton} ${selectedProfession === prof.id ? styles.targetSelected : ''}`}
                  onClick={() => setSelectedProfession(prof.id)}
                >
                  {prof.name}
                </button>
              ))}
            </div>
          </div>
        )

      case 'resource':
        return (
          <div className={styles.targetSelector}>
            <h4>Выберите ресурс для обмена:</h4>
            <div className={styles.targetList}>
              {resources.map(res => (
                <button
                  key={res.id}
                  className={`${styles.targetButton} ${selectedResource === res.id ? styles.targetSelected : ''}`}
                  onClick={() => setSelectedResource(res.id)}
                >
                  {res.name}
                </button>
              ))}
            </div>
          </div>
        )

      case 'self':
        return (
          <div className={styles.targetSelector}>
            <p>Применить способность на себя?</p>
          </div>
        )

      default:
        return null
    }
  }

  const hasAvailableAbilities = abilities.some(a => a.available && !a.used)

  if (!hasAvailableAbilities) {
    return (
      <div className={styles.abilitiesPanel}>
        <h3>Способности</h3>
        <p className={styles.noAbilities}>Нет доступных способностей</p>
      </div>
    )
  }

  return (
    <div className={styles.abilitiesPanel}>
      <h3>Способности</h3>
      <div className={styles.abilitiesList}>
        {abilities.map(ability => (
          <button
            key={ability.id}
            className={getAbilityButtonClass(ability)}
            onClick={() => handleAbilityClick(ability.id)}
            disabled={!ability.available || ability.used || disabled}
            title={ability.description}
          >
            <span className={styles.abilityName}>{ability.name}</span>
            {ability.used && <span className={styles.abilityUsedBadge}>Использовано</span>}
          </button>
        ))}
      </div>

      {selectedAbility && (
        <div className={styles.abilityModal}>
          <div className={styles.abilityModalContent}>
            <h3>{abilities.find(a => a.id === selectedAbility)?.name}</h3>
            <p>{abilities.find(a => a.id === selectedAbility)?.description}</p>
            {renderTargetSelector()}
            <div className={styles.modalActions}>
              <button className={styles.confirmButton} onClick={handleConfirm}>
                Применить
              </button>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}