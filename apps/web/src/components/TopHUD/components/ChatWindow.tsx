// apps/web/src/components/TopHUD/components/ChatWindow.tsx
'use client'

import React from 'react'
import styles from './ChatWindow.module.css'

interface ChatWindowProps {
	isOpen: boolean
	onClose: () => void
	friendId: string // добавлено для соответствия передаваемым пропсам
	friendName: string
}

export function ChatWindow({
	isOpen,
	onClose,
	friendId,
	friendName,
}: ChatWindowProps) {
	const [message, setMessage] = React.useState('')
	const [messages, setMessages] = React.useState<
		Array<{ id: string; text: string; isOwn: boolean; timestamp: Date }>
	>([
		{ id: '1', text: 'Привет! Как дела?', isOwn: false, timestamp: new Date() },
		{
			id: '2',
			text: 'Привет! Все отлично, спасибо!',
			isOwn: true,
			timestamp: new Date(),
		},
	])

	const messagesEndRef = React.useRef<HTMLDivElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	React.useEffect(() => {
		scrollToBottom()
	}, [messages])

	const handleSendMessage = React.useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (message.trim()) {
				setMessages(prev => [
					...prev,
					{
						id: Date.now().toString(),
						text: message,
						isOwn: true,
						timestamp: new Date(),
					},
				])
				setMessage('')
			}
		},
		[message],
	)

	const handleClose = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation()
			onClose()
		},
		[onClose],
	)

	const handleMessageChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setMessage(e.target.value)
		},
		[],
	)

	if (!isOpen) return null

	return (
		<div className={styles.chatWindow}>
			<div className={styles.chatHeader}>
				<h3>Чат с {friendName}</h3>
				<button onClick={handleClose} className={styles.closeButton}>
					×
				</button>
			</div>

			<div className={styles.messages}>
				{messages.map(msg => (
					<div
						key={msg.id}
						className={msg.isOwn ? styles.ownMessage : styles.friendMessage}
					>
						<div>{msg.text}</div>
						<div>{msg.timestamp.toLocaleTimeString()}</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<form onSubmit={handleSendMessage} className={styles.messageForm}>
				<input
					type='text'
					value={message}
					onChange={handleMessageChange}
					className={styles.messageInput}
				/>
				<button type='submit' className={styles.sendButton}>
					→
				</button>
			</form>
		</div>
	)
}
