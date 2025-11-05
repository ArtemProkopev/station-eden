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
	const [lobbyId] = useState<string>(lobbyIdFromProps || 'default-lobby')

	const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
		maxPlayers: 4,
		gameMode: 'standard',
		isPrivate: false,
		password: '',
	})

	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
		{
			id: '1',
			playerId: 'system',
			playerName: 'Система',
			text: 'Добро пожаловать в лобби!',
			timestamp: new Date(Date.now() - 300000),
			type: 'system',
		},
	])

	const [newMessage, setNewMessage] = useState('')
	const [isLoading, setIsLoading] = useState(true)
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
	const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)

	const chatContainerRef = useRef<HTMLDivElement>(null)
	const shouldScrollRef = useRef(true)
	const userAddedRef = useRef(false)
	const pendingJoinRef = useRef<Player | null>(null)

	// защита от дублей (optimistic + broadcast)
	const seenMsgIdsRef = useRef<Set<string>>(new Set())

	useScrollPrevention()

	const handleWebSocketMessage = useCallback(
		(data: WebSocketMessage) => {
			if (!data?.type) return
			switch (data.type) {
				case 'PLAYER_JOINED':
					setPlayers(prev => {
						const exists = prev.some(p => p.id === data.player.id)
						if (!exists && prev.length < lobbySettings.maxPlayers)
							return [...prev, data.player]
						return prev
					})
					break

				case 'PLAYER_LEFT':
					setPlayers(prev => prev.filter(p => p.id !== data.playerId))
					break

				case 'CHAT_MESSAGE': {
					const msg = data.message || {}
					const id: string =
						msg.id ||
						`srv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
					if (seenMsgIdsRef.current.has(id)) break
					seenMsgIdsRef.current.add(id)

					const normalized: ChatMessage = {
						id,
						playerId: msg.playerId ?? 'unknown',
						playerName: msg.playerName ?? 'Игрок',
						text: String(msg.text ?? ''),
						timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
						type: (msg.type as any) ?? 'player', // важно: 'player', а не 'user'
					}
					setChatMessages(prev => [...prev, normalized])
					shouldScrollRef.current = true
					break
				}

				case 'LOBBY_STATE':
					setPlayers(data.players || [])
					if (data.settings) setLobbySettings(data.settings)
					break

				case 'PLAYER_READY':
					setPlayers(prev =>
						prev.map(p =>
							p.id === data.playerId ? { ...p, isReady: data.isReady } : p
						)
					)
					if (data.playerId !== profile?.userId) {
						const p = players.find(x => x.id === data.playerId)
						if (p) {
							setChatMessages(prev => [
								...prev,
								{
									id: `system-${Date.now()}`,
									playerId: 'system',
									playerName: 'Система',
									text: `${p.name} ${data.isReady ? 'готов' : 'не готов'} к игре`,
									timestamp: new Date(),
									type: 'system',
								},
							])
						}
					}
					break

				case 'LOBBY_SETTINGS_UPDATED':
					setLobbySettings(data.settings)
					break
			}
		},
		[profile?.userId, players, lobbySettings.maxPlayers]
	)

	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:4000'
	const wsUrl = new URL('/lobby', wsBase).toString()
	const wsParams = useMemo(() => ({ lobbyId }), [lobbyId])

	const { sendMessage: sendWS, isConnected } = useWebSocket(
		wsUrl,
		handleWebSocketMessage,
		wsParams
	)

	const joinIfPending = useCallback(() => {
		if (!isConnected || !pendingJoinRef.current) return
		sendWS({ type: 'JOIN_LOBBY', lobbyId, player: pendingJoinRef.current })
		pendingJoinRef.current = null
	}, [isConnected, sendWS, lobbyId])

	useEffect(() => {
		joinIfPending()
	}, [isConnected, joinIfPending])

	const handlePlayerMenuClick = useCallback((player: Player) => {
		setSelectedPlayer(player)
		setIsPlayerModalOpen(true)
	}, [])

	const handleClosePlayerModal = useCallback(() => {
		setIsPlayerModalOpen(false)
		setSelectedPlayer(null)
	}, [])

	const handleOpenLobbySettings = useCallback(
		() => setShowLobbySettingsModal(true),
		[]
	)

	const handleSaveLobbySettings = useCallback(
		(settings: LobbySettings) => {
			setLobbySettings(settings)
			sendWS({ type: 'UPDATE_LOBBY_SETTINGS', lobbyId, settings })
			const msg = settings.isPrivate
				? settings.password
					? 'Настройки лобби обновлены (лобби приватное)'
					: 'Настройки лобби обновлены (лобби приватное, без пароля)'
				: 'Настройки лобби обновлены (лобби открытое)'
			setChatMessages(prev => [
				...prev,
				{
					id: `system-${Date.now()}`,
					playerId: 'system',
					playerName: 'Система',
					text: msg,
					timestamp: new Date(),
					type: 'system',
				},
			])
		},
		[lobbyId, sendWS]
	)

	const handleMutePlayer = useCallback((playerId: string, muted: boolean) => {
		console.log(`Player ${playerId} ${muted ? 'muted' : 'unmuted'}`)
	}, [])

	const handleVolumeChange = useCallback((playerId: string, volume: number) => {
		console.log(`Player ${playerId} volume changed to ${volume}%`)
	}, [])

	const handleAddFriend = useCallback(() => {
		alert(`Игрок ${selectedPlayer?.name} добавлен в друзья!`)
	}, [selectedPlayer])

	const handleRemovePlayer = useCallback(
		(playerId: string) => {
			setPlayers(prev => prev.filter(p => p.id !== playerId))
			setChatMessages(prev => [
				...prev,
				{
					id: `system-${Date.now()}`,
					playerId: 'system',
					playerName: 'Система',
					text: `Игрок ${selectedPlayer?.name} удален из лобби`,
					timestamp: new Date(),
					type: 'system',
				},
			])
			sendWS({
				type: 'PLAYER_LEFT',
				lobbyId,
				playerId,
				playerName: selectedPlayer?.name,
			})
			handleClosePlayerModal()
		},
		[lobbyId, selectedPlayer, sendWS, handleClosePlayerModal]
	)

	const addNewPlayer = useCallback(
		(playerData?: { id?: string; name?: string; avatar?: string }) => {
			if (players.length >= lobbySettings.maxPlayers) {
				alert(`Достигнут лимит игроков: ${lobbySettings.maxPlayers}`)
				return
			}
			const newPlayer: Player = {
				id:
					playerData?.id ||
					`player-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				name: playerData?.name || `Игрок${players.length + 1}`,
				missions: Math.floor(Math.random() * 50),
				hours: Math.floor(Math.random() * 200),
				avatar: playerData?.avatar,
				isReady: false,
			}
			setPlayers(prev => [...prev, newPlayer])
			setChatMessages(prev => [
				...prev,
				{
					id: `system-${Date.now()}`,
					playerId: 'system',
					playerName: 'Система',
					text: `Игрок ${newPlayer.name} присоединился к лобби`,
					timestamp: new Date(),
					type: 'system',
				},
			])
			sendWS({ type: 'PLAYER_JOINED', lobbyId, player: newPlayer })
			setShowAddPlayerModal(false)
		},
		[players.length, lobbySettings.maxPlayers, lobbyId, sendWS]
	)

	const toggleReady = useCallback(() => {
		if (!profile || profile.status !== 'ok' || !profile.userId) return
		const current = players.find(p => p.id === profile.userId)
		if (!current) return
		const isReady = !current.isReady
		setPlayers(prev =>
			prev.map(p => (p.id === profile.userId ? { ...p, isReady } : p))
		)
		setChatMessages(prev => [
			...prev,
			{
				id: `system-${Date.now()}`,
				playerId: 'system',
				playerName: 'Система',
				text: `Вы ${isReady ? 'готовы' : 'не готовы'} к игре`,
				timestamp: new Date(),
				type: 'system',
			},
		])
		sendWS({ type: 'TOGGLE_READY', lobbyId, playerId: profile.userId, isReady })
	}, [profile, players, lobbyId, sendWS])

	const handleSendMessage = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (!newMessage.trim()) return
			const playerName = profile?.username || 'Игрок'
			const playerId = profile?.userId
			if (!playerId) return

			const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			const message = {
				id,
				playerId,
				playerName,
				text: newMessage.trim(),
				timestamp: new Date().toISOString(),
				type: 'player' as const, // <-- совпадает с ChatMessage
			}

			if (!seenMsgIdsRef.current.has(id)) {
				seenMsgIdsRef.current.add(id)
				setChatMessages(prev => [
					...prev,
					{ ...message, timestamp: new Date() },
				])
			}

			const sent = sendWS({ type: 'SEND_MESSAGE', lobbyId, message })
			if (sent) {
				setNewMessage('')
				shouldScrollRef.current = true
			}
		},
		[newMessage, profile, lobbyId, sendWS]
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

	// автодобавление + отложенный JOIN
	useEffect(() => {
		if (
			!profile ||
			profile.status !== 'ok' ||
			isLoading ||
			userAddedRef.current ||
			!profile.userId
		)
			return
		const currentUser: Player = {
			id: profile.userId,
			name: profile.username || 'Игрок',
			missions: (profile as any).missionsCompleted || 0,
			hours: (profile as any).playTime || 0,
			avatar: assets.avatar,
			isReady: false,
		}
		setPlayers(prev =>
			prev.some(p => p.id === currentUser.id) ? prev : [currentUser, ...prev]
		)
		userAddedRef.current = true

		if (!isConnected) pendingJoinRef.current = currentUser
		else sendWS({ type: 'JOIN_LOBBY', lobbyId, player: currentUser })

		setChatMessages(prev => [
			...prev,
			{
				id: `system-${Date.now()}`,
				playerId: 'system',
				playerName: 'Система',
				text: 'Вы присоединились к лобби',
				timestamp: new Date(),
				type: 'system',
			},
		])
	}, [profile, isLoading, isConnected, lobbyId, assets.avatar, sendWS])

	useEffect(() => {
		if (shouldScrollRef.current && chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	})

	const currentUser = players.find(p => p.id === profile?.userId)
	const currentUserReadyState = currentUser?.isReady || false
	const isLobbyCreator = true

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

		isLobbyCreator,
	}
}