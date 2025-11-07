import { redirect } from 'next/navigation'

export default function LobbyPage() {
	// Генерируем случайный ID лобби или используем default
	const lobbyId = Math.random().toString(36).substring(2, 10)
	redirect(`/lobby/${lobbyId}`)
}
