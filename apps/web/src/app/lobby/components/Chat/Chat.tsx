// apps/web/src/app/lobby/components/Chat/Chat.tsx
import Chat from '@/components/shared/Chat/Chat'
import { ChatMessage } from '@station-eden/shared'
import type React from 'react'

interface LobbyChatProps {
	lobbyId: string
	messages: ChatMessage[]
	newMessage: string
	onMessageChange: (message: string) => void
	onSendMessage: (e: React.FormEvent) => void
	onKeyPress: (e: React.KeyboardEvent) => void
	onChatScroll: () => void
}

export default function LobbyChat(props: LobbyChatProps) {
	return (
		<Chat
			roomId={props.lobbyId}
			messages={props.messages}
			newMessage={props.newMessage}
			onMessageChange={props.onMessageChange}
			onSendMessage={props.onSendMessage}
			onKeyPress={props.onKeyPress}
			onChatScroll={props.onChatScroll}
			showVoiceTab={true}
			placeholder='Написать сообщение...'
		/>
	)
}