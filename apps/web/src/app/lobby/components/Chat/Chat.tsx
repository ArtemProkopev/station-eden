import { ChatMessage } from '../../types/lobby'
import styles from './Chat.module.css'

interface ChatProps {
	messages: ChatMessage[]
	newMessage: string
	onMessageChange: (message: string) => void
	onSendMessage: (e: React.FormEvent) => void
	onKeyPress: (e: React.KeyboardEvent) => void
	onChatScroll: () => void
	chatContainerRef?: React.RefObject<HTMLDivElement>
}

export default function Chat({
	messages,
	newMessage,
	onMessageChange,
	onSendMessage,
	onKeyPress,
	onChatScroll,
	chatContainerRef,
}: ChatProps) {
	const formatTime = (timestamp: Date) => {
		return timestamp.toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	return (
		<div className={styles.chatBlock}>
			<h2 className={styles.blockTitle}>Чат</h2>

			<div
				className={styles.chatMessagesContainer}
				ref={chatContainerRef}
				onScroll={onChatScroll}
			>
				<div className={styles.chatMessages}>
					{messages.map(message => (
						<div
							key={message.id}
							className={`${styles.chatMessage} ${message.type === 'system' ? styles.systemMessage : ''}`}
						>
							<div className={styles.chatMessageHeader}>
								<span className={styles.chatName}>{message.playerName}</span>
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
		</div>
	)
}
