'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import TopHUD from '@/components/TopHUD/TopHUD';
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile';
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars';
import { useProfile } from '@/app/profile/hooks/useProfile';
import { useScrollPrevention } from '@/app/profile/hooks/useScrollPrevention';

interface Player {
  id: number;
  name: string;
  missions: number;
  hours: number;
}

interface ChatMessage {
  id: number;
  playerName: string;
  text: string;
  timestamp: Date;
}

export default function LobbyPage() {
  const { profile, assets, loadSavedAssets, loadUserData, checkIconsAvailability } = useProfile();
  
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, playerName: 'northnorthnorthnorth', text: 'Привет всем! Готов к игре?', timestamp: new Date(Date.now() - 300000) },
    { id: 2, playerName: 'North', text: 'Да, я готов! Ждем остальных', timestamp: new Date(Date.now() - 180000) },
    { id: 3, playerName: 'North', text: 'Можно начинать когда все соберутся', timestamp: new Date(Date.now() - 60000) },
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  useScrollPrevention();

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setIsLoading(true);
        loadSavedAssets();
        await Promise.all([checkIconsAvailability(), loadUserData()]);
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, [loadSavedAssets, loadUserData, checkIconsAvailability]);

  useEffect(() => {
    if (profile && !isLoading) {
      const currentUser: Player = {
        id: Date.now(),
        name: profile.username || 'Игрок',
        missions: (profile as any).missionsCompleted || Math.floor(Math.random() * 50),
        hours: (profile as any).playTime || Math.floor(Math.random() * 200),
      };
      
      setPlayers(prev => {
        const userExists = prev.some(player => player.name === currentUser.name);
        if (!userExists) {
          return [currentUser, ...prev];
        }
        return prev;
      });
    }
  }, [profile, isLoading]);

  useEffect(() => {
    if (shouldScrollRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const currentPlayerName = profile?.username || 'Игрок';
    
    const message: ChatMessage = {
      id: Date.now(),
      playerName: currentPlayerName,
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    shouldScrollRef.current = true;
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const addNewPlayer = () => {
    const newPlayer: Player = {
      id: Date.now() + Math.random(),
      name: `Игрок${players.length + 1}`,
      missions: Math.floor(Math.random() * 50),
      hours: Math.floor(Math.random() * 200),
    };
    
    setPlayers(prev => [...prev, newPlayer]);
  };

  if (isLoading) {
    return (
      <main className={styles.page}>
        <FirefliesProfile />
        {/* <TwinklingStars /> */}
        <TopHUD />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка лобби...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <FirefliesProfile />
      {/* <TwinklingStars /> */}
      <TopHUD profile={profile} avatar={assets.avatar} />

      <div className={styles.container}>
        <h1 className={styles.title}>Создание лобби</h1>

        <div className={styles.columns}>
          <div className={styles.playersBlock}>
            <h2 className={styles.blockTitle}>Игроки</h2>
            <div className={styles.playersListContainer}>
              <div className={styles.playersList}>
                {players.map((player) => (
                  <div key={player.id} className={styles.playerCard}>
                    <div className={styles.playerInfo}>
                      <div className={styles.playerAvatar}></div>
                      <div>
                        <p className={styles.playerName}>{player.name}</p>
                        <p className={styles.playerStats}>
                          {player.missions} миссий | {player.hours} ч на станции
                        </p>
                      </div>
                    </div>
                    <button className={styles.dots}>•••</button>
                  </div>
                ))}
              </div>
            </div>
            <button
              className={styles.addPlayerBtn}
              onClick={addNewPlayer}
            >
              добавить игрока
            </button>
          </div>

          <div className={styles.robotBlock}>
            <img 
              src="/roboted.png" 
              alt="Robot" 
              className={styles.robotImage}
            />
            <button className={styles.lobbySettingsBtn}>настройки лобби</button>
          </div>

          <div className={styles.chatBlock}>
            <h2 className={styles.blockTitle}>Чат</h2>
            <div 
              className={styles.chatMessagesContainer}
              ref={chatContainerRef}
              onScroll={handleChatScroll}
            >
              <div className={styles.chatMessages}>
                {chatMessages.map((message) => (
                  <div key={message.id} className={styles.chatMessage}>
                    <div className={styles.chatMessageHeader}>
                      <span className={styles.chatName}>{message.playerName}</span>
                      <span className={styles.chatTime}>{formatTime(message.timestamp)}</span>
                    </div>
                    <p className={styles.chatText}>{message.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={handleSendMessage} className={styles.chatForm}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Написать сообщение..."
                className={styles.chatInput}
                maxLength={200}
              />
              <button 
                type="submit" 
                className={styles.sendButton}
                disabled={!newMessage.trim()}
              >
                →
              </button>
            </form>
          </div>
        </div>

        <div className={styles.bottomSection}>
          <button className={styles.startBtn}>начать игру</button>
        </div>
      </div>
    </main>
  );
}