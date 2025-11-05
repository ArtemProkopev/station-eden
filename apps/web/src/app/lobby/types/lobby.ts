export interface LobbySettings {
  maxPlayers: number;
  gameMode: string;
  isPrivate: boolean;
  password: string;
  // Добавляем новые поля для дополнительных настроек
  difficulty?: string;
  turnTime?: string;
  fastGame?: boolean;
  tournamentMode?: boolean;
  limitedResources?: boolean;
}
export interface Player {
  id: string;
  name: string;
  missions: number;
  hours: number;
  avatar?: string;
  isReady: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: Date;
  type?: 'system' | 'player';
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}