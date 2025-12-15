import { useProfile } from '@/app/profile/hooks/useProfile'
import { useLobbySocket } from '@/hooks/useLobbySocket'
import { useScrollPrevention } from '@/hooks/useScrollPrevention'
import {
	ChatMessage,
	LobbySettings,
	LobbyPlayer as Player,
} from '@station-eden/shared'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddPlayerModal } from '../components/AddPlayerModal/AddPlayerModal'
import { LobbySettingsModal } from '../components/LobbySettingsModal/LobbySettingsModal'
import { PlayerManagementModal } from '../components/PlayerManagementModal/PlayerManagementModal'

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
	const router = useRouter()
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
	const [lobbyCreatorId, setLobbyCreatorId] = useState<string>('')
	const [error, setError] = useState<string>('')

	const chatContainerRef = useRef<HTMLDivElement>(null)
	const shouldScrollRef = useRef(true)
	const seenMsgIdsRef = useRef<Set<string>>(new Set())
	const playersRef = useRef<Player[]>([])
	const lobbySettingsRef = useRef<LobbySettings>(DEFAULT_LOBBY_SETTINGS)
	const lobbyIdRef = useRef<string>(lobbyIdFromProps || 'default-lobby')
	const hasJoinedRef = useRef(false)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
	const didInitRef = useRef(false)

	const currentUserId = profile.data?.id

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

	const handleWebSocketMessage = useCallback(
		(data: any) => {
			if (!data?.type) return

			switch (data.type) {
				case 'PLAYER_JOINED':
					setPlayers(prev => {
						const exists = prev.some((p: Player) => p.id === data.player.id)
						return !exists && prev.length < lobbySettingsRef.current.maxPlayers
							? [...prev, data.player]
							: prev
					})
					break

				case 'PLAYER_LEFT':
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
							text: String(msg.text ?? '').slice(0, 300),
							timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
							type: msg.type ?? 'player',
						},
					])
					shouldScrollRef.current = true
					break
				}

				case 'LOBBY_STATE':
					setPlayers(Array.isArray(data.players) ? data.players : [])
					if (data.settings) setLobbySettings(data.settings)
					if (data.creatorId) setLobbyCreatorId(data.creatorId)
					break

				case 'PLAYER_READY':
					setPlayers(prev =>
						prev.map((p: Player) =>
							p.id === data.playerId ? { ...p, isReady: data.isReady } : p
						)
					)
					break

				case 'LOBBY_SETTINGS_UPDATED':
					setLobbySettings(data.settings)
					break

				case 'GAME_STARTED':
					if (data.redirectUrl) {
						const systemMessage: ChatMessage = {
							id: `system-${Date.now()}`,
							playerId: 'system',
							playerName: 'Система',
							text: 'Игра началась! Перенаправление...',
							timestamp: new Date(),
							type: 'system',
						}
						setChatMessages(prev => [...prev, systemMessage])
						setTimeout(() => router.push(data.redirectUrl), 1000)
					}
					break

				case 'ERROR':
					console.error('Server error:', data.message)
					setError(data.message || 'Произошла ошибка')
					break
			}
		},
		[router]
	)

	// ✅ socket.io-client нужен http(s)
	const wsBase = process.env.NEXT_PUBLIC_WS_BASE || 'http://localhost:4000'
	const lobbyId = lobbyIdFromProps || 'default-lobby'

	const { sendMessage: sendWS, isConnected } = useLobbySocket(
		wsBase,
		handleWebSocketMessage,
		lobbyId
	)

	useEffect(() => {
		if (!isConnected && hasJoinedRef.current) {
			reconnectTimeoutRef.current = setTimeout(() => {
				if (currentUserId) hasJoinedRef.current = false
			}, 2000)
		}

		return () => {
			if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
		}
	}, [isConnected, currentUserId])

	useEffect(() => {
		if (isConnected) setError('')
	}, [isConnected])

	useEffect(() => {
		if (isConnected && !hasJoinedRef.current && currentUserId && profile.data) {
			const currentUser: Player = {
				id: currentUserId,
				name: profile.data.username || 'Игрок',
				missions: (profile.data as any)?.missionsCompleted || 0,
				hours: (profile.data as any)?.playTime || 0,
				avatar: assets.avatar,
				isReady: false,
			}

			const success = sendWS({ type: 'JOIN_LOBBY', player: currentUser })
			if (success) {
				hasJoinedRef.current = true
			} else {
				setTimeout(() => {
					hasJoinedRef.current = false
				}, 1000)
			}
		}
	}, [profile.data, isConnected, assets.avatar, sendWS, currentUserId])

	const handlePlayerMenuClick = useCallback((player: Player) => {
		setSelectedPlayer(player)
		setIsPlayerModalOpen(true)
	}, [])

	const handleClosePlayerModal = useCallback(() => {
		setIsPlayerModalOpen(false)
		setSelectedPlayer(null)
	}, [])

	const isLobbyCreator = useMemo(
		() => lobbyCreatorId === currentUserId,
		[lobbyCreatorId, currentUserId]
	)

	const handleOpenLobbySettings = useCallback(() => {
		if (!isLobbyCreator) {
			alert('Только создатель лобби может менять настройки')
			return
		}
		setShowLobbySettingsModal(true)
	}, [isLobbyCreator])

	const handleSaveLobbySettings = useCallback(
		(settings: LobbySettings) => {
			setLobbySettings(settings)
			sendWS({
				type: 'UPDATE_LOBBY_SETTINGS',
				settings,
				__userId: currentUserId,
			})
		},
		[sendWS, currentUserId]
	)

	const handleMutePlayer = useCallback(
		(_playerId: string, _muted: boolean) => {},
		[]
	)
	const handleVolumeChange = useCallback(
		(_playerId: string, _volume: number) => {},
		[]
	)

	const handleAddFriend = useCallback(() => {
		if (selectedPlayer) alert(`Игрок ${selectedPlayer.name} добавлен в друзья!`)
	}, [selectedPlayer])

	const handleRemovePlayer = useCallback(
		(playerId: string) => {
			sendWS({ type: 'PLAYER_LEFT', playerId })
			handleClosePlayerModal()
		},
		[sendWS, handleClosePlayerModal]
	)

	const addNewPlayer = useCallback(
		(playerData?: { id?: string; name?: string; avatar?: string }) => {
			const useMock =
				process.env.NODE_ENV !== 'production' &&
				typeof window !== 'undefined' &&
				(new URLSearchParams(window.location.search).get('wsMock') === '1' ||
					window.localStorage?.getItem('WS_MOCK') === '1' ||
					process.env.NEXT_PUBLIC_WS_MOCK === 'true' ||
					process.env.NEXT_PUBLIC_WS_USE_MOCK === 'true')

			if (!useMock) {
				alert(
					'Добавление игроков вручную недоступно. Пригласите игрока по ссылке или включите мок-режим для теста.'
				)
				return
			}

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

			sendWS({ type: 'JOIN_LOBBY', player: newPlayer })
			setShowAddPlayerModal(false)
		},
		[sendWS]
	)

	const toggleReady = useCallback(() => {
		if (!currentUserId) return

		const currentPlayer = playersRef.current.find(
			(p: Player) => p.id === currentUserId
		)
		if (!currentPlayer) return

		const isReady = !currentPlayer.isReady

		setPlayers(prev =>
			prev.map((p: Player) => (p.id === currentUserId ? { ...p, isReady } : p))
		)

		sendWS({
			type: 'TOGGLE_READY',
			playerId: currentUserId,
			isReady,
			lobbyId: lobbyIdRef.current,
		})
	}, [currentUserId, sendWS])

	const handleSendMessage = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (!newMessage.trim() || !currentUserId) return

			const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
			const message: ChatMessage = {
				id,
				playerId: currentUserId,
				playerName: profile.data?.username || 'Игрок',
				text: newMessage.trim().slice(0, 300),
				timestamp: new Date().toISOString(),
				type: 'player',
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
		[newMessage, profile.data, sendWS, currentUserId]
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
		if (didInitRef.current) return
		didInitRef.current = true

		let cancelled = false

		const init = async () => {
			try {
				setIsLoading(true)
				await loadUserData()
				if (cancelled) return
				checkIconsAvailability().catch(() => {})
			} finally {
				if (!cancelled) setIsLoading(false)
			}
		}

		init()

		return () => {
			cancelled = true
		}
	}, [loadUserData, checkIconsAvailability])

	useEffect(() => {
		const uid = profile.data?.id
		if (!uid) return
		loadSavedAssets(uid)
	}, [profile.data?.id, loadSavedAssets])

	const currentUserReadyState = useMemo(
		() => players.find((p: Player) => p.id === currentUserId)?.isReady || false,
		[players, currentUserId]
	)

	const handleStartGame = useCallback(() => {
		if (!currentUserId || !isLobbyCreator) {
			alert('Только создатель лобби может начать игру')
			return
		}

		if (players.length < 2) {
			alert('Для начала игры нужно минимум 2 игрока')
			return
		}

		const notReadyPlayers = players.filter(p => !p.isReady)
		if (notReadyPlayers.length > 0) {
			alert(
				`Следующие игроки не готовы: ${notReadyPlayers.map(p => p.name).join(', ')}`
			)
			return
		}

		sendWS({
			type: 'START_GAME',
			lobbyId: lobbyIdRef.current,
			creatorId: currentUserId,
		})

		const systemMessage: ChatMessage = {
			id: `system-${Date.now()}`,
			playerId: 'system',
			playerName: 'Система',
			text: 'Создатель начал игру...',
			timestamp: new Date(),
			type: 'system',
		}
		setChatMessages(prev => [...prev, systemMessage])
	}, [sendWS, currentUserId, isLobbyCreator, players])

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
		error,
		isLobbyCreator,
		handleStartGame,
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
	}
}
