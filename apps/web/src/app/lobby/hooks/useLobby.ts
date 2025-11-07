import { useProfile } from '@/app/profile/hooks/useProfile'
import { useScrollPrevention } from '@/app/profile/hooks/useScrollPrevention'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddPlayerModal } from '../components/AddPlayerModal/AddPlayerModal'
import { LobbySettingsModal } from '../components/LobbySettingsModal/LobbySettingsModal'
import { PlayerManagementModal } from '../components/PlayerManagementModal/PlayerManagementModal'
import {
	ChatMessage,
	LobbySettings,
	Player,
	WebSocketMessage,
} from '../types/lobby'

const DEFAULT_LOBBY_SETTINGS: LobbySettings = {
	maxPlayers: 4,
	gameMode: 'standard',
	isPrivate: false,
	password: '',
}

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
	{
		id: '1',
		playerId: 'system',
		playerName: 'Система',
		text: 'Добро пожаловать в лобби!',
		timestamp: new Date(Date.now() - 300000),
		type: 'system',
	},
]

export function useLobby(lobbyIdFromProps?: string) {
	const {
		profile,
		assets,
		loadSavedAssets,
		loadUserData,
		checkIconsAvailability,
	} = useProfile()

	const [players, setPlayers] = useState<Player[]>([])
	const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
	const [showLobbySettingsModal, setShowLobbySettingsModal] = useState(false)
	const [lobbySettings, setLobbySettings] = useState<LobbySettings>(
		DEFAULT_LOBBY_SETTINGS
	)
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
		INITIAL_CHAT_MESSAGES
	)
	const [newMessage, setNewMessage] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
	const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)

	const chatContainerRef = useRef<HTMLDivElement>(null)
	const shouldScrollRef = useRef(true)
	const seenMsgIdsRef = useRef<Set<string>>(new Set())
	const playersRef = useRef<Player[]>([])
	const lobbySettingsRef = useRef<LobbySettings>(DEFAULT_LOBBY_SETTINGS)
	const lobbyIdRef = useRef<string>(lobbyIdFromProps || 'default-lobby')
	const hasProfileUpdatedRef = useRef(false)

	useEffect(() => {
		playersRef.current = players
	}, [players])
	useEffect(() => {
		lobbySettingsRef.current = lobbySettings
	}, [lobbySettings])
	useEffect(() => {
		lobbyIdRef.current = lobbyIdFromProps || 'default-lobby'
	}, [lobbyIdFromProps])

	useScrollPrevention()

	const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
		console.log('WebSocket message received:', data.type, data)

		if (!data?.type) {
			console.warn('WebSocket message without type:', data)
			return
		}

		switch (data.type) {
			case 'PLAYER_JOINED':
				console.log('Player joined:', data.player)
				setPlayers(prev => {
					const exists = prev.some((p: Player) => p.id === data.player?.id)
					if (
						data.player &&
						!exists &&
						prev.length < lobbySettingsRef.current.maxPlayers
					) {
						return [...prev, data.player]
					}
					return prev
				})
				break

			case 'PLAYER_LEFT':
				console.log('Player left:', data.playerId)
				setPlayers(prev => prev.filter((p: Player) => p.id !== data.playerId))
				break

			case 'CHAT_MESSAGE': {
				const msg = data.message || {}
				const id =
					msg.id ||
					`srv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

				if (seenMsgIdsRef.current.has(id)) break
				seenMsgIdsRef.current.add(id)

				setChatMessages(prev => [
					...prev,
					{
						id,
						playerId: msg.playerId ?? 'unknown',
						playerName: msg.playerName ?? 'Игрок',
						text: String(msg.text ?? ''),
						timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
						type: msg.type ?? 'player',
					},
				])
				shouldScrollRef.current = true
				break
			}

			case 'LOBBY_STATE':
				console.log(
					'Lobby state received:',
					data.players,
					'settings:',
					data.settings
				)
				if (data.players && Array.isArray(data.players)) {
					setPlayers(data.players)
				}
				if (data.settings) {
					setLobbySettings(data.settings)
				}
				break

			case 'PLAYER_READY':
				console.log('Player ready:', data.playerId, data.isReady)
				setPlayers(prev =>
					prev.map((p: Player) =>
						p.id === data.playerId ? { ...p, isReady: data.isReady } : p
					)
				)
				break

			case 'LOBBY_SETTINGS_UPDATED':
				console.log('Lobby settings updated:', data.settings)
				if (data.settings) {
					setLobbySettings(data.settings)
				}
				break

			case 'ERROR':
				console.error('WebSocket error:', data.message)
				break

			default:
				console.log('Unknown WebSocket message type:', data.type)
		}
	}, [])

	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'
	const wsUrl = wsBase.startsWith('http')
		? wsBase.replace('http', 'ws')
		: wsBase
	const wsParams = useMemo(
		() => ({ lobbyId: lobbyIdFromProps || 'default-lobby' }),
		[lobbyIdFromProps]
	)

	const { sendMessage: sendWS, isConnected } = useWebSocket(
		wsUrl,
		handleWebSocketMessage,
		wsParams
	)

	// Обновляем профиль игрока после загрузки данных
	useEffect(() => {
		if (
			!profile?.userId ||
			!assets.avatar ||
			!isConnected ||
			hasProfileUpdatedRef.current
		)
			return

		const updatePlayerProfile = () => {
			const currentUser: Partial<Player> = {
				id: profile.userId,
				name: profile.username || 'Игрок',
				missions: (profile as any).missionsCompleted || 0,
				hours: (profile as any).playTime || 0,
				avatar: assets.avatar,
			}

			console.log('Updating player profile:', currentUser.name)
			sendWS({
				type: 'UPDATE_PLAYER_PROFILE',
				player: currentUser,
			})
			hasProfileUpdatedRef.current = true
		}

		// Небольшая задержка чтобы убедиться что соединение установлено
		const timer = setTimeout(updatePlayerProfile, 100)
		return () => clearTimeout(timer)
	}, [profile, assets.avatar, isConnected, sendWS])

	const handlePlayerMenuClick = useCallback((player: Player) => {
		setSelectedPlayer(player)
		setIsPlayerModalOpen(true)
	}, [])

	const handleClosePlayerModal = useCallback(() => {
		setIsPlayerModalOpen(false)
		setSelectedPlayer(null)
	}, [])

	const handleOpenLobbySettings = useCallback(() => {
		setShowLobbySettingsModal(true)
	}, [])

	const handleSaveLobbySettings = useCallback(
		(settings: LobbySettings) => {
			setLobbySettings(settings)
			sendWS({ type: 'UPDATE_LOBBY_SETTINGS', settings })
		},
		[sendWS]
	)

	const handleMutePlayer = useCallback((playerId: string, muted: boolean) => {
		// Реализация mute функциональности
		console.log(`Player ${playerId} muted: ${muted}`)
	}, [])

	const handleVolumeChange = useCallback((playerId: string, volume: number) => {
		// Реализация изменения громкости
		console.log(`Player ${playerId} volume: ${volume}`)
	}, [])

	const handleAddFriend = useCallback(() => {
		if (selectedPlayer) {
			alert(`Игрок ${selectedPlayer.name} добавлен в друзья!`)
		}
	}, [selectedPlayer])

	const handleRemovePlayer = useCallback(
		(playerId: string) => {
			setPlayers(prev => prev.filter((p: Player) => p.id !== playerId))
			sendWS({ type: 'PLAYER_LEFT', playerId })
			handleClosePlayerModal()
		},
		[sendWS, handleClosePlayerModal]
	)

	const addNewPlayer = useCallback(
		(playerData?: { id?: string; name?: string; avatar?: string }) => {
			if (playersRef.current.length >= lobbySettingsRef.current.maxPlayers) {
				alert(`Достигнут лимит игроков: ${lobbySettingsRef.current.maxPlayers}`)
				return
			}

			const newPlayer: Player = {
				id:
					playerData?.id ||
					`player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				name: playerData?.name || `Игрок${playersRef.current.length + 1}`,
				missions: Math.floor(Math.random() * 50),
				hours: Math.floor(Math.random() * 200),
				avatar: playerData?.avatar,
				isReady: false,
			}

			console.log('Adding new player:', newPlayer.name)
			sendWS({ type: 'JOIN_LOBBY', player: newPlayer })
			setShowAddPlayerModal(false)
		},
		[sendWS]
	)

	const toggleReady = useCallback(() => {
		if (!profile?.userId) return

		const currentPlayer = playersRef.current.find(
			(p: Player) => p.id === profile.userId
		)
		if (!currentPlayer) return

		const isReady = !currentPlayer.isReady

		// Мгновенное локальное обновление
		setPlayers(prev =>
			prev.map((p: Player) => (p.id === profile.userId ? { ...p, isReady } : p))
		)

		sendWS({
			type: 'TOGGLE_READY',
			playerId: profile.userId,
			isReady,
			lobbyId: lobbyIdRef.current,
		})
	}, [profile?.userId, sendWS])

	const handleSendMessage = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()

			if (!newMessage.trim() || !profile?.userId) return

			const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			const message = {
				id,
				playerId: profile.userId,
				playerName: profile.username || 'Игрок',
				text: newMessage.trim(),
				timestamp: new Date().toISOString(),
				type: 'player' as const,
			}

			if (!seenMsgIdsRef.current.has(id)) {
				seenMsgIdsRef.current.add(id)
				setChatMessages(prev => [
					...prev,
					{ ...message, timestamp: new Date() },
				])
			}

			const sent = sendWS({ type: 'SEND_MESSAGE', message })
			if (sent) {
				setNewMessage('')
				shouldScrollRef.current = true
			}
		},
		[newMessage, profile, sendWS]
	)

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSendMessage(e as any)
			}
		},
		[handleSendMessage]
	)

	const handleChatScroll = useCallback(() => {
		if (!chatContainerRef.current) return
		const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
		shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100
	}, [])

	useEffect(() => {
		if (shouldScrollRef.current && chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	})

	useEffect(() => {
		const init = async () => {
			try {
				setIsLoading(true)
				loadSavedAssets()
				await Promise.all([checkIconsAvailability(), loadUserData()])
			} finally {
				setIsLoading(false)
			}
		}
		init()
	}, [loadSavedAssets, loadUserData, checkIconsAvailability])

	const currentUserReadyState = useMemo(
		() =>
			players.find((p: Player) => p.id === profile?.userId)?.isReady || false,
		[players, profile?.userId]
	)

	const lobbyId = lobbyIdFromProps || 'default-lobby'
	const isLobbyCreator = true

	console.log('Current lobby state:', {
		players: players.map(p => ({ id: p.id, name: p.name, isReady: p.isReady })),
		currentUser: profile?.userId,
		isConnected,
		hasProfileUpdated: hasProfileUpdatedRef.current,
	})

	return {
		profile,
		assets,
		players,
		chatMessages,
		newMessage,
		isLoading,
		lobbySettings,
		isConnected,
		currentUserReadyState,
		showAddPlayerModal,
		showLobbySettingsModal,
		selectedPlayer,
		isPlayerModalOpen,
		lobbyId,
		chatContainerRef,
		setShowAddPlayerModal,
		setShowLobbySettingsModal,
		setNewMessage,
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
		AddPlayerModal,
		PlayerManagementModal,
		LobbySettingsModal,
		isLobbyCreator,
	}
}
