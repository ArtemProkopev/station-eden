import styles from './LobbyHeader.module.css';

interface LobbyHeaderProps {
  title: string;
  lobbyId: string;
  isConnected: boolean;
}

export default function LobbyHeader({ title, lobbyId, isConnected }: LobbyHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.headerInfo}>
        <span className={styles.lobbyId}>ID: {lobbyId}</span>
        <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
          {isConnected ? 'Подключено' : 'Не подключено'}
        </div>
      </div>
    </div>
  );
}