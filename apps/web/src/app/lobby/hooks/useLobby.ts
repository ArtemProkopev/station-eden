import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from '@/app/profile/hooks/useProfile';
import { useScrollPrevention } from '@/app/profile/hooks/useScrollPrevention';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AddPlayerModal } from '../components/AddPlayerModal/AddPlayerModal';
import { PlayerManagementModal } from '../components/PlayerManagementModal/PlayerManagementModal';
import { LobbySettingsModal } from '../components/LobbySettingsModal/LobbySettingsModal';
import { LobbySettings, Player, ChatMessage, WebSocketMessage } from '../types/lobby';

type ProfileType = ReturnType<typeof useProfile>['profile'];

export function useLobby() {
  const { profile, assets, loadSavedAssets, loadUserData, checkIconsAvailability } = useProfile();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showLobbySettingsModal, setShowLobbySettingsModal] = useState(false);
  const [lobbyId] = useState<string>('default-lobby');
  
  const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
    maxPlayers: 4,
    gameMode: 'standard',
    isPrivate: false,
    password: ''
  });
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      playerId: 'system',
      playerName: 'Система', 
      text: 'Добро пожаловать в лобби!', 
      timestamp: new Date(Date.now() - 300000),
      type: 'system'
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const userAddedRef = useRef(false);

  useScrollPrevention();

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    console.log('WebSocket message received:', data);
    
    switch (data.type) {
      case 'PLAYER_JOINED':
        setPlayers(prev => {
          const playerExists = prev.some(p => p.id === data.player.id);
          if (!playerExists && prev.length < lobbySettings.maxPlayers) {
            return [...prev, data.player];
          }
          return prev;
        });
        break;

      case 'PLAYER_LEFT':
        setPlayers(prev => prev.filter(p => p.id !== data.playerId));
        break;

      case 'CHAT_MESSAGE':
        if (!data.message.id.includes('mock-')) {
          setChatMessages(prev => [...prev, {
            ...data.message,
            timestamp: new Date(data.message.timestamp)
          }]);
        }
        break;

      case 'LOBBY_STATE':
        setPlayers(data.players);
        if (data.settings) {
          setLobbySettings(data.settings);
        }
        break;

      case 'PLAYER_READY':
        setPlayers(prev => prev.map(player =>
          player.id === data.playerId 
            ? { ...player, isReady: data.isReady }
            : player
        ));
        
        if (data.playerId !== profile?.userId) {
          const player = players.find(p => p.id === data.playerId);
          if (player) {
            setChatMessages(prev => [...prev, {
              id: `system-${Date.now()}`,
              playerId: 'system',
              playerName: 'Система',
              text: `${player.name} ${data.isReady ? 'готов' : 'не готов'} к игре`,
              timestamp: new Date(),
              type: 'system'
            }]);
          }
        }
        break;

      case 'LOBBY_SETTINGS_UPDATED':
        setLobbySettings(data.settings);
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }, [profile?.userId, players, lobbySettings.maxPlayers]);

  const { sendMessage: sendWebSocketMessage, isConnected } = useWebSocket(
    'ws://localhost:3001/lobby',
    handleWebSocketMessage
  );

  const handlePlayerMenuClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setIsPlayerModalOpen(true);
  }, []);

  const handleClosePlayerModal = useCallback(() => {
    setIsPlayerModalOpen(false);
    setSelectedPlayer(null);
  }, []);

  const handleOpenLobbySettings = useCallback(() => {
    setShowLobbySettingsModal(true);
  }, []);

  const handleSaveLobbySettings = useCallback((settings: LobbySettings) => {
    setLobbySettings(settings);
    
    if (isConnected) {
      sendWebSocketMessage({
        type: 'UPDATE_LOBBY_SETTINGS',
        lobbyId: lobbyId,
        settings: settings
      });
    }
    
    let settingsMessage = 'Настройки лобби обновлены';
    if (settings.isPrivate && settings.password) {
      settingsMessage += ' (лобби приватное)';
    } else if (settings.isPrivate) {
      settingsMessage += ' (лобби приватное, без пароля)';
    } else {
      settingsMessage += ' (лобби открытое)';
    }
    
    setChatMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      playerId: 'system',
      playerName: 'Система',
      text: settingsMessage,
      timestamp: new Date(),
      type: 'system'
    }]);
  }, [isConnected, sendWebSocketMessage, lobbyId]);

  const handleMutePlayer = useCallback((playerId: string, muted: boolean) => {
    console.log(`Player ${playerId} ${muted ? 'muted' : 'unmuted'}`);
  }, []);

  const handleVolumeChange = useCallback((playerId: string, volume: number) => {
    console.log(`Player ${playerId} volume changed to ${volume}%`);
  }, []);

  const handleAddFriend = useCallback((playerId: string) => {
    console.log(`Adding player ${playerId} to friends`);
    alert(`Игрок ${selectedPlayer?.name} добавлен в друзья!`);
  }, [selectedPlayer]);

  const handleRemovePlayer = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(player => player.id !== playerId));
    
    setChatMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      playerId: 'system',
      playerName: 'Система',
      text: `Игрок ${selectedPlayer?.name} удален из лобби`,
      timestamp: new Date(),
      type: 'system'
    }]);

    if (isConnected) {
      sendWebSocketMessage({
        type: 'PLAYER_LEFT',
        lobbyId: lobbyId,
        playerId: playerId,
        playerName: selectedPlayer?.name
      });
    }
    
    handleClosePlayerModal();
  }, [isConnected, sendWebSocketMessage, lobbyId, selectedPlayer, handleClosePlayerModal]);

  const addNewPlayer = useCallback((playerData?: { id?: string; name?: string; avatar?: string }) => {
    if (players.length >= lobbySettings.maxPlayers) {
      alert(`Достигнут лимит игроков: ${lobbySettings.maxPlayers}`);
      return;
    }

    const newPlayer: Player = {
      id: playerData?.id || `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: playerData?.name || `Игрок${players.length + 1}`,
      missions: Math.floor(Math.random() * 50),
      hours: Math.floor(Math.random() * 200),
      avatar: playerData?.avatar,
      isReady: false
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    
    setChatMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      playerId: 'system',
      playerName: 'Система',
      text: `Игрок ${newPlayer.name} присоединился к лобби`,
      timestamp: new Date(),
      type: 'system'
    }]);
    
    if (isConnected) {
      sendWebSocketMessage({
        type: 'PLAYER_JOINED',
        lobbyId: lobbyId,
        player: newPlayer
      });
    }
    
    setShowAddPlayerModal(false);
  }, [players.length, lobbySettings.maxPlayers, isConnected, sendWebSocketMessage, lobbyId]);

  const toggleReady = useCallback(() => {
    if (!profile || profile.status !== 'ok' || !profile.userId) {
      console.error('Profile not loaded or user ID missing');
      return;
    }

    const currentPlayer = players.find(player => player.id === profile.userId);
    if (!currentPlayer) return;

    const newReadyState = !currentPlayer.isReady;
    
    setPlayers(prev => prev.map(player => 
      player.id === profile.userId 
        ? { ...player, isReady: newReadyState }
        : player
    ));

    setChatMessages(prev => [...prev, {
      id: `system-${Date.now()}`,
      playerId: 'system',
      playerName: 'Система',
      text: `Вы ${newReadyState ? 'готовы' : 'не готовы'} к игре`,
      timestamp: new Date(),
      type: 'system'
    }]);

    if (isConnected) {
      sendWebSocketMessage({
        type: 'TOGGLE_READY',
        lobbyId: lobbyId,
        playerId: profile.userId,
        isReady: newReadyState
      });
    }
  }, [profile, players, isConnected, sendWebSocketMessage, lobbyId]);

  // Чат
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const currentPlayerName = profile?.username || 'Игрок';
    const currentPlayerId = profile?.userId;
    
    if (!currentPlayerId) return;

    const messageData = {
      type: 'SEND_MESSAGE',
      lobbyId: lobbyId,
      message: {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playerId: currentPlayerId,
        playerName: currentPlayerName,
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      }
    };

    const sent = sendWebSocketMessage(messageData);
    
    if (sent) {
      setChatMessages(prev => [...prev, {
        ...messageData.message,
        timestamp: new Date()
      }]);
      
      setNewMessage('');
      shouldScrollRef.current = true;
    }
  }, [newMessage, profile, sendWebSocketMessage, lobbyId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

  const handleChatScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  }, []);

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
    if (profile && profile.status === 'ok' && !isLoading && !userAddedRef.current && profile.userId) {
      const currentUser: Player = {
        id: profile.userId,
        name: profile.username || 'Игрок',
        missions: (profile as any).missionsCompleted || 0,
        hours: (profile as any).playTime || 0,
        avatar: assets.avatar,
        isReady: false
      };

      setPlayers(prev => {
        const userExists = prev.some(player => player.id === currentUser.id);
        if (!userExists && prev.length < lobbySettings.maxPlayers) {
          return [currentUser, ...prev];
        }
        return prev;
      });

      userAddedRef.current = true;

      if (isConnected) {
        sendWebSocketMessage({
          type: 'JOIN_LOBBY',
          lobbyId: lobbyId,
          player: currentUser
        });
      }

      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        playerId: 'system',
        playerName: 'Система',
        text: `Вы присоединились к лобби`,
        timestamp: new Date(),
        type: 'system'
      }]);
    }
  }, [profile, isLoading, isConnected, lobbyId, assets.avatar, sendWebSocketMessage, lobbySettings.maxPlayers]);

  useEffect(() => {
    if (shouldScrollRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  });

  const currentUser = players.find(p => p.id === profile?.userId);
  const currentUserReadyState = currentUser?.isReady || false;
  const isLobbyCreator = true;

  return {
    profile,
    assets,
    players,
    chatMessages,
    newMessage,
    isLoading,
    lobbyId,
    lobbySettings,
    isConnected,
    currentUserReadyState,
    
    showAddPlayerModal,
    setShowAddPlayerModal,
    showLobbySettingsModal,
    setShowLobbySettingsModal,
    selectedPlayer,
    isPlayerModalOpen,
    
    chatContainerRef,
    
    handlePlayerMenuClick,
    handleClosePlayerModal,
    handleOpenLobbySettings,
    handleSaveLobbySettings,
    handleMutePlayer,
    handleVolumeChange,
    handleAddFriend,
    handleRemovePlayer,
    addNewPlayer,
    toggleReady,
    handleSendMessage,
    handleKeyPress,
    handleChatScroll,
    setNewMessage,
    
    AddPlayerModal,
    PlayerManagementModal,
    LobbySettingsModal,
    
    isLobbyCreator
  };
}