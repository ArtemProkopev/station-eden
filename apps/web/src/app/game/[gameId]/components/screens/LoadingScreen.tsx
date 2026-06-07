import GameTransitionLoader from './GameTransitionLoader'

type LoadingProfile = {
	status: string
	data?: {
		username?: string | null
	} | null
}

interface LoadingScreenProps {
	isConnected: boolean
	profile: LoadingProfile
	onRetryJoin: () => void
	gameId: string
	userId?: string
}

export default function LoadingScreen(props: LoadingScreenProps) {
	const ariaLabel = props.isConnected
		? 'Загрузка игровой сессии Station Eden'
		: 'Подключение к игровой сессии Station Eden'

	return <GameTransitionLoader title='Загрузка станции' ariaLabel={ariaLabel} />
}
