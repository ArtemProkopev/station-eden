// apps/web/src/app/game/[gameId]/page.tsx
'use client'

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameState, GamePlayer } from '@station-eden/shared';
import TopHUD from '@/components/TopHUD/TopHUD';
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile';
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars';
import { useProfile } from '@/app/profile/hooks/useProfile';
import styles from './page.module.css';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { profile, assets } = useProfile();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const handleWebSocketMessage = useCallback((data: any) => {
    if (!data?.type) return;

    switch (data.type) {
      case 'GAME_STATE':
        setGameState(data.gameState);
        setPlayers(data.gameState?.players || []);
        setIsLoading(false);
        break;
        
      case 'GAME_UPDATE':
        if (data.gameState) {
          setGameState(data.gameState);
          setPlayers(data.gameState.players || []);
        }
        break;
        
      case 'PLAYER_LEFT_GAME':
        setPlayers(prev => prev.filter(p => p.id !== data.playerId));
        break;
        
      case 'ERROR':
        setError(data.message || 'Ошибка в игре');
        break;
        
      case 'GAME_FINISHED':
        // Игра завершена
        if (data.gameState) {
          setGameState(data.gameState);
          setPlayers(data.gameState.players || []);
        }
        break;
    }
  }, []);

  const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000';
  const wsUrl = wsBase.startsWith('http') ? wsBase.replace('http', 'ws') : wsBase;
  const { sendMessage: sendWS, isConnected } = useWebSocket(
    wsUrl,
    handleWebSocketMessage,
    { gameId }
  );

  useEffect(() => {
    if (!gameId) {
      router.push('/');
      return;
    }

    // При подключении запрашиваем состояние игры
    if (isConnected) {
      sendWS({ type: 'JOIN_GAME', gameId });
    }
  }, [gameId, isConnected, sendWS, router]);

  const handleLeaveGame = () => {
    if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
      sendWS({ type: 'LEAVE_GAME', gameId });
      router.push('/lobby');
    }
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <FirefliesProfile />
        <TwinklingStars />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка игры...</p>
        </div>
      </main>
    );
  }

  // Приводим статус профиля к нужному формату для TopHUD
  const topHudProfile = {
    status: profile.status,
    userId: profile.data?.id,
    email: profile.data?.email,
    username: profile.data?.username,
    message: profile.message,
  };

  return (
    <main className={styles.page}>
      <FirefliesProfile />
      <TwinklingStars />
      
      <TopHUD 
        profile={topHudProfile}
        avatar={assets.avatar}
      />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Игра #{gameId}</h1>
          <div className={styles.gameInfo}>
            <span className={styles.gameMode}>
              Режим: {gameState?.settings?.gameMode || 'Стандартный'}
            </span>
            <span className={styles.gameStatus}>
              Статус: {
                gameState?.status === 'active' ? 'В процессе' :
                gameState?.status === 'finished' ? 'Завершена' :
                gameState?.status === 'cancelled' ? 'Отменена' : 'Ожидание'
              }
            </span>
            <button 
              className={styles.leaveButton}
              onClick={handleLeaveGame}
            >
              Покинуть игру
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.gameContent}>
          <div className={styles.playersPanel}>
            <h2 className={styles.panelTitle}>Игроки ({players.length})</h2>
            <div className={styles.playersList}>
              {players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`${styles.playerCard} ${
                    player.isActive ? styles.activePlayer : ''
                  } ${
                    gameState?.currentPlayerId === player.id ? styles.currentTurn : ''
                  }`}
                >
                  <div className={styles.playerHeader}>
                    <div 
                      className={styles.playerAvatar}
                      style={player.avatar ? { 
                        backgroundImage: `url(${player.avatar})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      } : {}}
                    />
                    <div className={styles.playerInfo}>
                      <span className={styles.playerName}>{player.name}</span>
                      <span className={styles.playerScore}>Очки: {player.score}</span>
                    </div>
                    <span className={styles.playerOrder}>#{player.order}</span>
                  </div>
                  
                  {gameState?.currentPlayerId === player.id && (
                    <div className={styles.currentTurnIndicator}>
                      Сейчас ходит
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.gameBoard}>
            <h2 className={styles.panelTitle}>Игровое поле</h2>
            <div className={styles.boardContent}>
              {gameState?.status === 'finished' && gameState.winnerId ? (
                <div className={styles.winnerAnnouncement}>
                  <h3>🎉 Игра завершена! 🎉</h3>
                  <p>
                    Победитель: {
                      players.find(p => p.id === gameState.winnerId)?.name || 'Неизвестно'
                    }
                  </p>
                  <p>
                    Результат: {
                      players.map(p => `${p.name}: ${p.score} очков`).join(', ')
                    }
                  </p>
                  <button 
                    className={styles.backToLobby}
                    onClick={() => router.push('/lobby')}
                  >
                    Вернуться в лобби
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.roundInfo}>
                    Раунд: {gameState?.round || 1}
                    {gameState?.maxRounds && ` / ${gameState.maxRounds}`}
                  </div>
                  <div className={styles.gameArea}>
                    <p className={styles.placeholder}>
                      Игровое поле для режима "{gameState?.settings?.gameMode || 'Стандартный'}"
                    </p>
                    <p className={styles.instructions}>
                      Игра началась! Добро пожаловать в игру.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.gameControls}>
            <h2 className={styles.panelTitle}>Управление</h2>
            <div className={styles.controlsContent}>
              <button 
                className={styles.controlButton}
                onClick={() => sendWS({ type: 'GAME_ACTION', action: 'skip_turn' })}
                disabled={!gameState || gameState.status !== 'active'}
              >
                Пропустить ход
              </button>
              
              <button 
                className={styles.controlButton}
                onClick={() => sendWS({ type: 'GAME_ACTION', action: 'end_game' })}
                disabled={!isConnected}
              >
                Завершить игру досрочно
              </button>
              
              <div className={styles.gameStats}>
                <div className={styles.statItem}>
                  <span>Статус подключения:</span>
                  <span className={isConnected ? styles.connected : styles.disconnected}>
                    {isConnected ? 'Подключено' : 'Не подключено'}
                  </span>
                </div>
                {gameState?.startedAt && (
                  <div className={styles.statItem}>
                    <span>Начало игры:</span>
                    <span>{new Date(gameState.startedAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}