'use client'

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameState } from '@station-eden/shared';
import TopHUD from '@/components/TopHUD/TopHUD';
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile';
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars';
import { useProfile } from '@/app/profile/hooks/useProfile';
import styles from './page.module.css';

// Расширяем типы, чтобы они соответствовали серверной логике
type ExtendedGamePlayer = {
  id: string
  name: string
  missions?: number
  hours?: number
  avatar?: string
  score: number
  order: number
  isActive: boolean
  isReady?: boolean
}

type ExtendedGameState = GameState & {
  creatorId?: string
  maxRounds?: number
  winnerId?: string
  finishedAt?: string
  settings?: {
    gameMode?: string
    difficulty?: string
    turnTime?: string
    tournamentMode?: boolean
    limitedResources?: boolean
  }
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { profile, assets } = useProfile();
  
  const [gameState, setGameState] = useState<ExtendedGameState | null>(null);
  const [players, setPlayers] = useState<ExtendedGamePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const handleWebSocketMessage = useCallback((data: any) => {
    if (!data?.type) return;

    console.log('Game WebSocket message:', data.type, data);

    switch (data.type) {
      case 'GAME_STATE':
        console.log('Received GAME_STATE:', data.gameState);
        setGameState(data.gameState || null);
        setPlayers(data.gameState?.players || []);
        setIsLoading(false);
        setError('');
        break;
        
      case 'GAME_UPDATE':
        console.log('Received GAME_UPDATE:', data.gameState);
        if (data.gameState) {
          setGameState(data.gameState);
          setPlayers(data.gameState.players || []);
        }
        break;
        
      case 'PLAYER_JOINED_GAME':
        console.log('Player joined:', data.playerName);
        // Можно показать уведомление
        break;
        
      case 'PLAYER_LEFT_GAME':
        console.log('Player left:', data.playerId);
        setPlayers(prev => prev.filter(p => p.id !== data.playerId));
        break;
        
      case 'ERROR':
        console.error('Game error:', data.message);
        setError(data.message || 'Ошибка в игре');
        setIsLoading(false);
        break;
        
      case 'GAME_FINISHED':
        console.log('Game finished:', data.reason);
        if (data.gameState) {
          setGameState(data.gameState);
          setPlayers(data.gameState.players || []);
        }
        break;
        
      case 'LEAVE_CONFIRMED':
        console.log('Leave confirmed');
        router.push('/lobby');
        break;
    }
  }, [router]);

  // ИСПРАВЛЕНО: Правильный WebSocket URL без двойного протокола
  const wsBase = process.env.NEXT_PUBLIC_WS_BASE;
  let wsUrl: string;
  
  if (process.env.NODE_ENV === 'development') {
    // Для локальной разработки
    wsUrl = 'ws://localhost:4000/lobby';
  } else if (wsBase) {
    // Для продакшена, обрабатываем разные варианты URL
    if (wsBase.startsWith('https://')) {
      wsUrl = wsBase.replace('https://', 'wss://') + '/lobby';
    } else if (wsBase.startsWith('http://')) {
      wsUrl = wsBase.replace('http://', 'ws://') + '/lobby';
    } else if (wsBase.startsWith('wss://')) {
      wsUrl = wsBase + (wsBase.endsWith('/lobby') ? '' : '/lobby');
    } else if (wsBase.startsWith('ws://')) {
      wsUrl = wsBase + (wsBase.endsWith('/lobby') ? '' : '/lobby');
    } else {
      // Если нет протокола, добавляем wss://
      wsUrl = 'wss://' + wsBase + '/lobby';
    }
  } else {
    // По умолчанию для продакшена
    wsUrl = 'wss://api.stationeden.ru/lobby';
  }
  
  console.log('Connecting to game WebSocket:', wsUrl, 'gameId:', gameId);

  const { sendMessage: sendWS, isConnected } = useWebSocket(
    wsUrl,
    handleWebSocketMessage,
    { gameId } // Этот параметр будет добавлен как query параметр
  );

  useEffect(() => {
    console.log('Game page mounted, gameId:', gameId);
    
    if (!gameId) {
      router.push('/');
      return;
    }

    // При подключении запрашиваем состояние игры
    if (isConnected) {
      console.log('WebSocket connected, joining game...');
      sendWS({ type: 'JOIN_GAME', gameId });
    } else {
      console.log('WebSocket not connected yet');
    }
  }, [gameId, isConnected, sendWS, router]);

  useEffect(() => {
    // Таймаут загрузки
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('Game loading timeout');
        setError('Таймаут загрузки игры. Проверьте подключение.');
        setIsLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  const handleLeaveGame = () => {
    if (window.confirm('Вы уверены, что хотите покинуть игру?')) {
      console.log('Leaving game...');
      sendWS({ type: 'LEAVE_GAME', gameId });
      // Дополнительно можно отключиться от WebSocket
      setTimeout(() => {
        router.push('/lobby');
      }, 1000);
    }
  };

  const handleSkipTurn = () => {
    if (!gameState || gameState.status !== 'active') {
      setError('Игра не активна');
      return;
    }
    
    if (gameState.currentPlayerId !== profile.data?.id) {
      setError('Не ваш ход');
      return;
    }
    
    sendWS({ 
      type: 'GAME_ACTION', 
      action: 'skip_turn',
      gameId 
    });
  };

  const handleEndGame = () => {
    if (window.confirm('Вы уверены, что хотите завершить игру досрочно?')) {
      sendWS({ 
        type: 'GAME_ACTION', 
        action: 'end_game',
        gameId 
      });
    }
  };

  // Функция для реконнекта
  const handleReconnect = () => {
    setError('');
    setIsLoading(true);
    // Хук useWebSocket автоматически переподключится
    setTimeout(() => {
      if (isConnected) {
        sendWS({ type: 'JOIN_GAME', gameId });
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <FirefliesProfile />
        <TwinklingStars />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка игры...</p>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.loadingButtons}>
            <button 
              className={styles.backButton}
              onClick={() => router.push('/lobby')}
            >
              Вернуться в лобби
            </button>
            <button 
              className={styles.retryButton}
              onClick={handleReconnect}
            >
              Повторить подключение
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (error && !gameState) {
    return (
      <main className={styles.page}>
        <FirefliesProfile />
        <TwinklingStars />
        <TopHUD 
          profile={{
            status: profile.status,
            userId: profile.data?.id,
            email: profile.data?.email,
            username: profile.data?.username,
            message: profile.message,
          }}
          avatar={assets.avatar}
        />
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <h2 className={styles.errorTitle}>Ошибка загрузки игры</h2>
            <p className={styles.errorMessage}>{error}</p>
            <p className={styles.errorDetails}>
              URL подключения: {wsUrl}
              <br />
              Game ID: {gameId}
              <br />
              Статус подключения: {isConnected ? 'Подключено' : 'Не подключено'}
            </p>
            <div className={styles.errorActions}>
              <button 
                className={styles.retryButton}
                onClick={handleReconnect}
              >
                Попробовать снова
              </button>
              <button 
                className={styles.backToLobbyButton}
                onClick={() => router.push('/lobby')}
              >
                Вернуться в лобби
              </button>
            </div>
          </div>
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

  const currentPlayer = players.find(p => p.id === profile.data?.id);
  const creatorId = (gameState as ExtendedGameState)?.creatorId || '';
  const maxRounds = (gameState as ExtendedGameState)?.maxRounds;
  const winnerId = (gameState as ExtendedGameState)?.winnerId;

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
          <h1 className={styles.title}>Игра #{gameId?.slice(0, 12) || '...'}</h1>
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
            <div className={styles.connectionStatus}>
              <span className={isConnected ? styles.connectedDot : styles.disconnectedDot}></span>
              {isConnected ? 'Подключено' : 'Не подключено'}
            </div>
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
            <button 
              className={styles.retryButton}
              onClick={handleReconnect}
            >
              Повторить
            </button>
          </div>
        )}

        <div className={styles.gameContent}>
          <div className={styles.playersPanel}>
            <h2 className={styles.panelTitle}>Игроки ({players.length})</h2>
            <div className={styles.playersList}>
              {players.map((player) => (
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
                      <span className={styles.playerName}>
                        {player.name}
                        {player.id === profile.data?.id && ' (Вы)'}
                      </span>
                      <span className={styles.playerScore}>Очки: {player.score || 0}</span>
                      {/* missions может быть undefined, поэтому проверяем */}
                      {(player.missions !== undefined) && (
                        <span className={styles.playerMissions}>Миссий: {player.missions}</span>
                      )}
                    </div>
                    <span className={styles.playerOrder}>#{player.order || 0}</span>
                  </div>
                  
                  {gameState?.currentPlayerId === player.id && (
                    <div className={styles.currentTurnIndicator}>
                      🎮 Сейчас ходит
                    </div>
                  )}
                  
                  {player.id === creatorId && (
                    <div className={styles.creatorBadge}>
                      Создатель
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.gameBoard}>
            <h2 className={styles.panelTitle}>Игровое поле</h2>
            <div className={styles.boardContent}>
              {gameState?.status === 'finished' && winnerId ? (
                <div className={styles.winnerAnnouncement}>
                  <h3>🎉 Игра завершена! 🎉</h3>
                  <p className={styles.winnerText}>
                    Победитель: {
                      players.find(p => p.id === winnerId)?.name || 'Неизвестно'
                    }
                  </p>
                  <div className={styles.finalScores}>
                    <h4>Итоговые очки:</h4>
                    {players
                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                      .map((player, index) => (
                        <div key={player.id} className={styles.finalScoreItem}>
                          <span className={styles.rank}>#{index + 1}</span>
                          <span className={styles.playerName}>{player.name}</span>
                          <span className={styles.score}>{player.score || 0} очков</span>
                        </div>
                      ))}
                  </div>
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
                    <span className={styles.roundLabel}>Раунд:</span>
                    <span className={styles.roundNumber}>{gameState?.round || 1}</span>
                    {maxRounds && (
                      <span className={styles.maxRounds}> / {maxRounds}</span>
                    )}
                  </div>
                  <div className={styles.gameArea}>
                    <div className={styles.currentPlayerInfo}>
                      {gameState?.currentPlayerId && (
                        <>
                          <span>Сейчас ходит: </span>
                          <strong>
                            {players.find(p => p.id === gameState.currentPlayerId)?.name || 'Неизвестно'}
                          </strong>
                          {gameState.currentPlayerId === profile.data?.id && (
                            <span className={styles.yourTurn}> (Ваш ход!)</span>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className={styles.gameActions}>
                      {gameState?.currentPlayerId === profile.data?.id && (
                        <button 
                          className={styles.actionButton}
                          onClick={handleSkipTurn}
                          disabled={!gameState || gameState.status !== 'active'}
                        >
                          Пропустить ход
                        </button>
                      )}
                      
                      <div className={styles.gameInstructions}>
                        <p>Игра началась! Добро пожаловать в игру.</p>
                        <p>Режим: <strong>{gameState?.settings?.gameMode || 'Стандартный'}</strong></p>
                        {gameState?.settings?.difficulty && (
                          <p>Сложность: <strong>{gameState.settings.difficulty}</strong></p>
                        )}
                      </div>
                    </div>
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
                onClick={handleSkipTurn}
                disabled={!gameState || gameState.status !== 'active' || gameState.currentPlayerId !== profile.data?.id}
              >
                Пропустить ход
              </button>
              
              {creatorId === profile.data?.id && (
                <button 
                  className={styles.controlButton}
                  onClick={handleEndGame}
                  disabled={!isConnected || gameState?.status === 'finished'}
                >
                  Завершить игру досрочно
                </button>
              )}
              
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
                <div className={styles.statItem}>
                  <span>Игроков онлайн:</span>
                  <span>{players.length}</span>
                </div>
                <div className={styles.statItem}>
                  <span>Ваши очки:</span>
                  <span>{currentPlayer?.score || 0}</span>
                </div>
              </div>
              
              <button 
                className={styles.refreshButton}
                onClick={() => sendWS({ type: 'JOIN_GAME', gameId })}
                disabled={!isConnected}
              >
                Обновить игру
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}