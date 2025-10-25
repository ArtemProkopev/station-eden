import styles from './StartGameButton.module.css';

interface StartGameButtonProps {
  readyPlayersCount: number;
  totalPlayersCount: number;
  isConnected: boolean;
  minPlayersRequired: number;
  onStartGame?: () => void;
}

export default function StartGameButton({
  readyPlayersCount,
  totalPlayersCount,
  isConnected,
  minPlayersRequired,
  onStartGame
}: StartGameButtonProps) {
  const canStartGame = isConnected && 
    totalPlayersCount >= minPlayersRequired && 
    readyPlayersCount === totalPlayersCount;

  const getButtonText = () => {
    if (!isConnected) return 'Нет подключения';
    if (totalPlayersCount < minPlayersRequired) return `Минимум ${minPlayersRequired} игрока`;
    if (readyPlayersCount !== totalPlayersCount) return 'Не все готовы';
    return 'начать игру';
  };

  return (
    <button 
      className={styles.startBtn}
      onClick={onStartGame}
      disabled={!canStartGame}
      title={getButtonText()}
    >
      {getButtonText()} ({readyPlayersCount}/{totalPlayersCount})
    </button>
  );
}