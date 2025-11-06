// app/lobby/page.tsx
import { redirect } from 'next/navigation'

export default function LobbyPage() {
	// Перенаправляем на лобби по умолчанию или создаем новое
	redirect('/lobby/default-lobby-id')

	// Или можно показать форму для ввода ID лобби
	return null
}
