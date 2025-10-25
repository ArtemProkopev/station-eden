// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

class MockWebSocket implements WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readonly url: string;
  readyState: number;
  bufferedAmount: number = 0;
  extensions: string = '';
  protocol: string = '';
  binaryType: BinaryType = 'blob';

  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;

  private eventListeners: { [key: string]: EventListenerOrEventListenerObject[] } = {};

  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    console.log('MockWebSocket connecting to:', url);
    
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen.call(this, new Event('open'));
      }
      this.dispatchEvent(new Event('open'));
    }, 500);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const dataString = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
    console.log('MockWebSocket sending:', dataString);
    
    setTimeout(() => {
      try {
        const parsedData = JSON.parse(dataString);
        
        if (parsedData.type === 'JOIN_LOBBY') {
          const joinMessage = {
            type: 'LOBBY_STATE',
            players: [parsedData.player],
            settings: {
              maxPlayers: 4,
              gameMode: 'standard',
              isPrivate: false,
              password: ''
            }
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(joinMessage)
          });

          if (this.onmessage) {
            this.onmessage.call(this, messageEvent);
          }
          this.dispatchEvent(messageEvent);
        }

        if (parsedData.type === 'SEND_MESSAGE') {
          const echoMessage = {
            type: 'MESSAGE_SENT',
            messageId: parsedData.message.id
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(echoMessage)
          });

          if (this.onmessage) {
            this.onmessage.call(this, messageEvent);
          }
          this.dispatchEvent(messageEvent);
        }

        if (parsedData.type === 'TOGGLE_READY') {
          const response = {
            type: 'PLAYER_READY',
            playerId: parsedData.playerId,
            isReady: parsedData.isReady
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });

          if (this.onmessage) {
            this.onmessage.call(this, messageEvent);
          }
          this.dispatchEvent(messageEvent);
        }

        if (parsedData.type === 'UPDATE_LOBBY_SETTINGS') {
          const response = {
            type: 'LOBBY_SETTINGS_UPDATE_SUCCESS',
            settings: parsedData.settings
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });

          const settingsUpdate = {
            type: 'LOBBY_SETTINGS_UPDATED',
            settings: parsedData.settings
          };

          const settingsEvent = new MessageEvent('message', {
            data: JSON.stringify(settingsUpdate)
          });

          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage.call(this, messageEvent);
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage.call(this, settingsEvent);
                }
              }, 50);
            }
          }, 100);
        }

        if (parsedData.type === 'PLAYER_JOINED') {
          const response = {
            type: 'PLAYER_JOINED',
            player: parsedData.player
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });

          if (this.onmessage) {
            this.onmessage.call(this, messageEvent);
          }
          this.dispatchEvent(messageEvent);
        }


        if (parsedData.type === 'PLAYER_LEFT') {
          const response = {
            type: 'PLAYER_LEFT',
            playerId: parsedData.playerId,
            playerName: parsedData.playerName
          };

          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(response)
          });

          if (this.onmessage) {
            this.onmessage.call(this, messageEvent);
          }
          this.dispatchEvent(messageEvent);
        }

      } catch (err) {
        console.error('Error parsing mock data:', err);
      }
    }, 100);
  }

  close(code?: number, reason?: string) {
    console.log('MockWebSocket closing', { code, reason });

    this.readyState = WebSocket.CLOSING;
    
    setTimeout(() => {
      this.readyState = WebSocket.CLOSED;
      const closeEvent = new CloseEvent('close', {
        code: code || 1000,
        reason: reason || 'Normal closure',
        wasClean: true
      });

      if (this.onclose) {
        this.onclose.call(this, closeEvent);
      }
      this.dispatchEvent(closeEvent);
    }, 100);
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(type: any, listener: any, options?: any): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(type: any, listener: any, options?: any): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(l => l !== listener);
    }
  }

  dispatchEvent(event: Event): boolean {
    const type = event.type;
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach(listener => {
        try {
          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (typeof listener === 'object' && listener.handleEvent) {
            listener.handleEvent(event);
          }
        } catch (err) {
          console.error('Error in event listener:', err);
        }
      });
    }
    return true;
  }
}

export const useWebSocket = (url: string, onMessage: (data: WebSocketMessage) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    try {
      // В development режиме используем mock без спама
      if (process.env.NODE_ENV === 'development') {
        console.log('Using MockWebSocket for development');
        ws.current = new MockWebSocket(url);
      } else {
        console.log('Using real WebSocket');
        ws.current = new WebSocket(url);
      }
      
      ws.current.onopen = (event: Event) => {
        console.log('WebSocket connected');
        setIsConnected(true);
        clearTimeout(reconnectTimeout.current!);
      };

      ws.current.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.current.onclose = (event: CloseEvent) => {
        console.log('WebSocket disconnected, reconnecting...');
        setIsConnected(false);
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setIsConnected(false);
    }
  }, [url, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeout.current!);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  }, []);

  return { sendMessage, isConnected };
};
