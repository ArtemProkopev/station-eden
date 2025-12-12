import styles from './StartGameButton.module.css'

interface StartGameButtonProps {
  readyPlayersCount: number
  totalPlayersCount: number
  isConnected: boolean
  minPlayersRequired: number
  lobbyId: string
  lobbySettings: any
  players: any[]
}

export default function StartGameButton({
  readyPlayersCount,
  totalPlayersCount,
  isConnected,
  minPlayersRequired,
  lobbyId,
  lobbySettings,
  players
}: StartGameButtonProps) {
  const canStartGame = isConnected && 
    totalPlayersCount >= minPlayersRequired && 
    readyPlayersCount === totalPlayersCount

  const getButtonText = () => {
    if (!isConnected) return 'Нет подключения'
    if (totalPlayersCount < minPlayersRequired) return `Минимум ${minPlayersRequired} игрока`
    if (readyPlayersCount !== totalPlayersCount) return 'Не все готовы'
    return 'Начать игру'
  }

  const handleStartGame = async () => {
    if (!canStartGame) return

    try {
      console.log('=== STARTING GAME ===')
      const readyPlayers = players.filter(p => p.isReady ?? true)
      console.log('Ready players:', readyPlayers)
      console.log('Lobby ID:', lobbyId)
      
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lobbyId,
          lobbySettings,
          players: readyPlayers
        })
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (data.success) {
        console.log('✅ Game created successfully:', data.gameId)
        console.log('Game data:', data.game)
        
        // Даем время на сохранение
        setTimeout(() => {
          window.location.href = `/game/${data.gameId}`
        }, 100)
      } else {
        console.error('❌ Failed to create game:', data.error)
        alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Ошибка при создании игры. Проверьте консоль.')
    }
  }

  return (
    <button 
      className={styles.startBtn}
      onClick={handleStartGame}
      disabled={!canStartGame}
      title={getButtonText()}
    >
      {getButtonText()} ({readyPlayersCount}/{totalPlayersCount})
    </button>
  )
}