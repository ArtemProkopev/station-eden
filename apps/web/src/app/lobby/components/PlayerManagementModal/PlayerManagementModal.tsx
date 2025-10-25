// components/PlayerManagementModal/PlayerManagementModal.tsx
import { useState, useEffect } from 'react';
import styles from './PlayerManagementModal.module.css';

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isReady: boolean;
}

interface PlayerManagementModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  isLobbyCreator?: boolean;
  isCurrentUser?: boolean;
  onMutePlayer?: (playerId: string, muted: boolean) => void;
  onVolumeChange?: (playerId: string, volume: number) => void;
  onAddFriend?: (playerId: string) => void;
  onRemovePlayer?: (playerId: string) => void;
}

export const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  player,
  isOpen,
  onClose,
  isLobbyCreator = false,
  isCurrentUser = false,
  onMutePlayer,
  onVolumeChange,
  onAddFriend,
  onRemovePlayer
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);

  useEffect(() => {
    if (isOpen) {
      // Сброс состояний при открытии модального окна
      setIsMuted(false);
      setVolume(100);
    }
  }, [isOpen]);

  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    onMutePlayer?.(player.id, newMutedState);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    onVolumeChange?.(player.id, newVolume);
  };

  const handleAddFriend = () => {
    if (isCurrentUser) {
      alert('Нельзя добавить самого себя в друзья!');
      return;
    }
    onAddFriend?.(player.id);
  };

  const handleRemovePlayer = () => {
    if (isCurrentUser) {
      alert('Нельзя удалить самого себя из лобби!');
      return;
    }
    
    if (confirm(`Вы уверены, что хотите удалить ${player.name} из лобби?`)) {
      onRemovePlayer?.(player.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {isCurrentUser ? 'Управление профилем' : 'Управление игроком'}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.playerInfo}>
          <div 
            className={styles.playerAvatar}
            style={player.avatar ? { 
              backgroundImage: `url(${player.avatar})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          />
          <div className={styles.playerDetails}>
            <h3 className={styles.playerName}>{player.name}</h3>
            <div className={styles.playerStatus}>
              <span className={`${styles.statusIndicator} ${player.isReady ? styles.ready : styles.notReady}`}></span>
              <span className={styles.statusText}>
                {player.isReady ? 'Готов к игре' : 'Не готов'}
              </span>
              {isCurrentUser && <span className={styles.youBadge}>Вы</span>}
            </div>
          </div>
        </div>

        <div className={styles.controlsSection}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Громкость микрофона</label>
            <div className={styles.volumeControl}>
              <button 
                className={`${styles.muteButton} ${isMuted ? styles.muted : ''}`}
                onClick={handleMuteToggle}
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
                disabled={isMuted}
              />
              <span className={styles.volumeValue}>{volume}%</span>
            </div>
          </div>

          <div className={styles.actionsGroup}>
            {!isCurrentUser && (
              <button 
                className={styles.actionButton}
                onClick={handleAddFriend}
              >
                <span className={styles.actionIcon}>+</span>
                Добавить в друзья
              </button>
            )}

            {isLobbyCreator && !isCurrentUser && (
              <button 
                className={`${styles.actionButton} ${styles.removeButton}`}
                onClick={handleRemovePlayer}
              >
                <span className={styles.actionIcon}>×</span>
                Удалить из лобби
              </button>
            )}

            {isCurrentUser && (
              <div className={styles.currentUserMessage}>
                Это ваш профиль. Вы можете настроить громкость микрофона.
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.closeButtonSecondary} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};