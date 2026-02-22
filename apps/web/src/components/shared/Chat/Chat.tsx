'use client'

import { ChatMessage } from '@station-eden/shared'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './Chat.module.css'

interface ChatProps {
	// Уникальный идентификатор для VoicePanel (lobbyId или gameId)
	roomId: string
	messages: ChatMessage[]
	newMessage: string
	onMessageChange: (message: string) => void
	onSendMessage: (e: React.FormEvent) => void
	onKeyPress: (e: React.KeyboardEvent) => void
	onChatScroll: () => void
	// Опциональные пропсы для игры
	disabled?: boolean
	placeholder?: string
	showVoiceTab?: boolean // Показывать ли вкладку голосового чата (в игре может быть недоступно)
	currentUserId?: string // Для выделения своих сообщений
}

export default function Chat({
	roomId,
	messages,
	newMessage,
	onMessageChange,
	onSendMessage,
	onKeyPress,
	onChatScroll,
	disabled = false,
	placeholder = 'Написать сообщение...',
	showVoiceTab = true,
	currentUserId,
}: ChatProps) {
	const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
	const messagesContainerRef = useRef<HTMLDivElement>(null)

	// индикатор "в голосе кто-то есть" для вкладки (без числа)
	const [hasVoiceActivity, setHasVoiceActivity] = useState(false)

	// Обработчик прокрутки колесиком мыши
	const handleWheel = useCallback(
		(e: React.WheelEvent<HTMLDivElement>) => {
			if (messagesContainerRef.current) {
				messagesContainerRef.current.scrollTop += e.deltaY
				onChatScroll()
				e.preventDefault()
			}
		},
		[onChatScroll],
	)

	// Установка обработчика на контейнер сообщений
	useEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const wheelHandler = (e: WheelEvent) => {
			container.scrollTop += e.deltaY
			onChatScroll()
			e.preventDefault()
		}

		container.addEventListener('wheel', wheelHandler, { passive: false })

		return () => {
			container.removeEventListener('wheel', wheelHandler)
		}
	}, [onChatScroll])

	const handleVoiceStatsChange = useCallback(
		(stats: { participantsCount: number; someoneSpeaking: boolean }) => {
			setHasVoiceActivity(stats.participantsCount > 0)
		},
		[],
	)

	const formatTime = (timestamp: Date | string) => {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<div className={styles.chatBlock}>
			{/* Вкладки переключения (если разрешены) */}
			{showVoiceTab && (
				<div className={styles.tabsHeader}>
					<button
						type='button'
						className={`${styles.tabButton} ${
							activeTab === 'text' ? styles.tabButtonActive : ''
						}`}
						onClick={() => setActiveTab('text')}
					>
						Текстовый чат
					</button>
					<button
						type='button'
						className={`${styles.tabButton} ${
							activeTab === 'voice' ? styles.tabButtonActive : ''
						} ${hasVoiceActivity ? styles.tabButtonHasVoice : ''}`}
						onClick={() => setActiveTab('voice')}
					>
						Голосовой чат
					</button>
				</div>
			)}

			{/* Текстовый чат */}
			{(activeTab === 'text' || !showVoiceTab) && (
				<>
					<div
						className={styles.chatMessagesContainer}
						ref={messagesContainerRef}
						onScroll={onChatScroll}
						onWheel={handleWheel}
					>
						<div className={styles.chatMessages}>
							{messages.length === 0 ? (
								<div className={styles.emptyChat}>
									<p>Сообщений пока нет</p>
									<p className={styles.emptyHint}>Начните общение первым!</p>
								</div>
							) : (
								messages.map(message => (
									<div
										key={message.id}
										className={`${styles.chatMessage} ${
											message.type === 'system' ? styles.systemMessage : ''
										} ${message.playerId === currentUserId ? styles.myMessage : ''}`}
									>
										<div className={styles.chatMessageHeader}>
											<span className={styles.chatName}>
												{message.playerName}
												{message.type === 'system' && ' (Система)'}
											</span>
											<span className={styles.chatTime}>
												{formatTime(message.timestamp)}
											</span>
										</div>
										<p className={styles.chatText}>{message.text}</p>
									</div>
								))
							)}
						</div>
					</div>

					<form onSubmit={onSendMessage} className={styles.chatForm}>
						<input
							type='text'
							value={newMessage}
							onChange={e => onMessageChange(e.target.value.slice(0, 300))}
							onKeyPress={onKeyPress}
							placeholder={disabled ? 'Чат недоступен...' : placeholder}
							className={styles.chatInput}
							maxLength={300}
							disabled={disabled}
						/>
						<button
							type='submit'
							className={styles.sendButton}
							disabled={!newMessage.trim() || disabled}
						>
							→
						</button>
					</form>
				</>
			)}

			{/* Голосовой чат (импортируем VoicePanel динамически) */}
			{showVoiceTab && (
				<div
					className={`${styles.voiceTab} ${
						activeTab === 'voice' ? '' : styles.voiceTabHidden
					}`}
				>
					{/* Динамический импорт VoicePanel */}
					<VoicePanelLoader
						roomId={roomId}
						onStatsChange={handleVoiceStatsChange}
					/>
				</div>
			)}
		</div>
	)
}

// Компонент-загрузчик для VoicePanel (чтобы избежать ошибок импорта в игре)
function VoicePanelLoader({
	roomId,
	onStatsChange,
}: {
	roomId: string
	onStatsChange: (stats: {
		participantsCount: number
		someoneSpeaking: boolean
	}) => void
}) {
	const [VoicePanelComponent, setVoicePanelComponent] =
		useState<React.ComponentType<{
			lobbyId: string
			onStatsChange: (stats: {
				participantsCount: number
				someoneSpeaking: boolean
			}) => void
		}> | null>(null)
	const [error, setError] = useState(false)

	useEffect(() => {
		// Динамический импорт VoicePanel только при необходимости
		import('@/app/lobby/components/VoicePanel/VoicePanel')
			.then(module => {
				setVoicePanelComponent(() => module.default)
			})
			.catch(err => {
				console.error('Failed to load VoicePanel:', err)
				setError(true)
			})
	}, [])

	if (error) {
		return <div className={styles.voiceError}>Голосовой чат недоступен</div>
	}

	if (!VoicePanelComponent) {
		return (
			<div className={styles.voiceLoading}>Загрузка голосового чата...</div>
		)
	}

	return <VoicePanelComponent lobbyId={roomId} onStatsChange={onStatsChange} />
}
