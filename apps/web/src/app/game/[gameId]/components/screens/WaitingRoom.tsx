// apps/web/src/app/game/[gameId]/components/screens/WaitingRoom.tsx
import { GameState } from '../types/game.types'
import styles from '../../page.module.css'

interface WaitingRoomProps {
  gameState: GameState
  gameId: string
  userId?: string
  isConnected: boolean
  onStartGame: () => void
  onLeaveGame: () => void
}

export default function WaitingRoom({ 
  gameState, 
  gameId, 
  userId, 
  isConnected, 
  onStartGame, 
  onLeaveGame 
}: WaitingRoomProps) {
  return (
    <div className={styles.waitingRoom}>
      <h1>Ожидание начала игры</h1>
      <p>Игра: {gameId}</p>
      <p>Игроков: {gameState.players?.length || 0}</p>

      <div className={styles.playersList}>
        <h2>Игроки в комнате:</h2>
        {gameState.players?.map(player => (
          <div key={player.id} className={styles.waitingPlayer}>
            <span>
              {player.name}
              {userId && player.id === userId && ' (Вы)'}
              {player.id === gameState.creatorId && ' 👑'}
            </span>
          </div>
        ))}
      </div>

      {userId && gameState.creatorId === userId && (
        <button
          className={styles.startButton}
          onClick={onStartGame}
          disabled={!isConnected || (gameState.players?.length || 0) < 2}
        >
          {(gameState.players?.length || 0) < 2
            ? `Ждем игроков (${gameState.players?.length || 0}/2)`
            : 'Начать игру'}
        </button>
      )}

      <button className={styles.leaveButton} onClick={onLeaveGame}>
        Покинуть игру
      </button>
    </div>
  )
}