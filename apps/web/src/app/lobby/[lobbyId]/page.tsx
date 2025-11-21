// apps/web/src/app/lobby/[lobbyId]/page.tsx
import { redirect } from 'next/navigation'
import LobbyPageClient from './LobbyPageClient'

type Props = {
	params: {
		lobbyId: string
	}
}

// Валидация ID лобби: латиница/цифры, длина как у Math.random().toString(36).substring(2, 10)
function isValidLobbyId(id: string) {
	// сейчас у тебя длина = 8, но оставим небольшой запас на будущее (3–20)
	return /^[a-z0-9]{3,20}$/i.test(id)
}

export default function LobbyPage({ params }: Props) {
	const lobbyId = params.lobbyId

	// Если URL кривой /lobby/%%% или кто-то руками сломал ссылку —
	// отправляем на /lobby, где уже генерится нормальный ID и редиректит дальше
	if (!isValidLobbyId(lobbyId)) {
		redirect('/lobby')
	}

	return <LobbyPageClient lobbyId={lobbyId} />
}
