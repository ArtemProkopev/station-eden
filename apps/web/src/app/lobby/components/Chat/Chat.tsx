// apps/web/src/app/lobby/components/Chat/Chat.tsx
import { ChatMessage } from '@station-eden/shared'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import VoicePanel from '../VoicePanel/VoicePanel'
import styles from './Chat.module.css'

interface ChatProps {
	lobbyId: string
	messages: ChatMessage[]
	newMessage: string
	onMessageChange: (message: string) => void
	onSendMessage: (e: React.FormEvent) => void
	onKeyPress: (e: React.KeyboardEvent) => void
	onChatScroll: () => void
	chatContainerRef?: React.RefObject<HTMLDivElement>
}

export default function Chat({
	lobbyId,
	messages,
	newMessage,
	onMessageChange,
	onSendMessage,
	onKeyPress,
	onChatScroll,
	chatContainerRef,
}: ChatProps) {
	const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text')
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	
	// индикатор "в голосе кто-то есть" для вкладки (без числа)
	const [hasVoiceActivity, setHasVoiceActivity] = useState(false)

	// Обработчик прокрутки колесиком мыши
	const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
		if (messagesContainerRef.current) {
			// Прокручиваем контейнер сообщений
			messagesContainerRef.current.scrollTop += e.deltaY
			onChatScroll() // Оповещаем о скролле, если нужно
			e.preventDefault() // Предотвращаем стандартное поведение
		}
	}, [onChatScroll])

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
			// индикатор просто по факту наличия участников
			setHasVoiceActivity(stats.participantsCount > 0)
		},
		[]
	)

	// принимает Date или string
	const formatTime = (timestamp: Date | string) => {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<div className={styles.chatBlock}>
			{/* Вкладки переключения */}
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

			{/* Текстовый чат: без заголовка "Чат", сразу список сообщений */}
			{activeTab === 'text' && (
				<>
					<div
						className={styles.chatMessagesContainer}
						ref={messagesContainerRef}
						onScroll={onChatScroll}
						onWheel={handleWheel}
					>
						<div className={styles.chatMessages}>
							{messages.map(message => (
								<div
									key={message.id}
									className={`${styles.chatMessage} ${
										message.type === 'system' ? styles.systemMessage : ''
									}`}
								>
									<div className={styles.chatMessageHeader}>
										<span className={styles.chatName}>
											{message.playerName}
										</span>
										<span className={styles.chatTime}>
											{formatTime(message.timestamp)}
										</span>
									</div>
									<p className={styles.chatText}>{message.text}</p>
								</div>
							))}
						</div>
					</div>

					<form onSubmit={onSendMessage} className={styles.chatForm}>
						<input
							type='text'
							value={newMessage}
							onChange={e => onMessageChange(e.target.value.slice(0, 300))}
							onKeyPress={onKeyPress}
							placeholder='Написать сообщение...'
							className={styles.chatInput}
							maxLength={300}
						/>
						<button
							type='submit'
							className={styles.sendButton}
							disabled={!newMessage.trim()}
						>
							→
						</button>
					</form>
				</>
			)}

			{/* VoicePanel всегда смонтирован, просто скрывается вне своей вкладки */}
			<div
				className={`${styles.voiceTab} ${
					activeTab === 'voice' ? '' : styles.voiceTabHidden
				}`}
			>
				<VoicePanel lobbyId={lobbyId} onStatsChange={handleVoiceStatsChange} />
			</div>
		</div>
	)
}