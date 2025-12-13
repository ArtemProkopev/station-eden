// apps/web/src/app/lobby/[lobbyId]/LobbyPageClient.tsx
'use client'

import TopHUD from '@/components/TopHUD/TopHUD'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import { memo, useMemo } from 'react'
import Chat from '../components/Chat/Chat'
import LobbyHeader from '../components/LobbyHeader/LobbyHeader'
import LobbyInfo from '../components/LobbyInfo/LobbyInfo'
import PlayersList from '../components/PlayersList/PlayersList'
import StartGameButton from '../components/StartGameButton/StartGameButton'
import { useLobby } from '../hooks/useLobby'
import styles from '../page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)
const MemoizedTopHUD = memo(TopHUD)
const MemoizedLobbyHeader = memo(LobbyHeader)
const MemoizedLobbyInfo = memo(LobbyInfo)
const MemoizedPlayersList = memo(PlayersList)
const MemoizedStartGameButton = memo(StartGameButton)
const MemoizedChat = memo(Chat)

const LoadingState = () => (
	<div className={styles.loadingContainer}>
		<div className={styles.loadingSpinner}></div>
		<p>Загрузка лобби...</p>
	</div>
)

type LobbyPageClientProps = {
	lobbyId: string
}

const LobbyContent = memo(
	({
		lobbyId,
		lobby,
	}: {
		lobbyId: string
		lobby: ReturnType<typeof useLobby>
	}) => {
		const readyPlayersCount = useMemo(
			() => lobby.players.filter(p => p.isReady).length,
			[lobby.players]
		)

		const isCurrentUserSelected = useMemo(
			() => lobby.selectedPlayer?.id === lobby.profile.data?.id,
			[lobby.selectedPlayer, lobby.profile.data?.id]
		)

		const topHudProfile = useMemo(
			() => ({
				status: lobby.profile.status,
				userId: lobby.profile.data?.id,
				email: lobby.profile.data?.email,
				username: lobby.profile.data?.username,
				message: lobby.profile.message,
			}),
			[lobby.profile]
		)

		return (
			<>
				<MemoizedTopHUD profile={topHudProfile} avatar={lobby.assets.avatar} />

				<div className={styles.container}>
					<MemoizedLobbyHeader
						title='Лобби'
						lobbyId={lobbyId}
						isConnected={lobby.isConnected}
					/>

					<div className={styles.columns}>
						<div className={styles.leftColumn}>
							<MemoizedPlayersList
								players={lobby.players}
								maxPlayers={lobby.lobbySettings.maxPlayers}
								currentUserId={lobby.profile.data?.id}
								onPlayerMenuClick={lobby.handlePlayerMenuClick}
								onAddPlayer={() => lobby.setShowAddPlayerModal(true)}
								onToggleReady={lobby.toggleReady}
								currentUserReadyState={lobby.currentUserReadyState}
							/>
						</div>

						<div className={styles.centerColumn}>
							<MemoizedLobbyInfo
								lobbySettings={lobby.lobbySettings}
								playersCount={lobby.players.length}
								onOpenSettings={lobby.handleOpenLobbySettings}
							/>
						</div>

						<div className={styles.rightColumn}>
							<MemoizedChat
								lobbyId={lobbyId}
								messages={lobby.chatMessages}
								newMessage={lobby.newMessage}
								onMessageChange={lobby.setNewMessage}
								onSendMessage={lobby.handleSendMessage}
								onKeyPress={lobby.handleKeyPress}
								onChatScroll={lobby.handleChatScroll}
								chatContainerRef={lobby.chatContainerRef}
							/>
						</div>
					</div>

					<div className={styles.bottomSection}>
						<MemoizedStartGameButton
							readyPlayersCount={readyPlayersCount}
							totalPlayersCount={lobby.players.length}
							isConnected={lobby.isConnected}
							minPlayersRequired={2}
							lobbyId={lobbyId}
							isLobbyCreator={lobby.isLobbyCreator}
							onStartGame={lobby.handleStartGame}
						/>
					</div>

					{lobby.showAddPlayerModal && (
						<lobby.AddPlayerModal
							isOpen={lobby.showAddPlayerModal}
							onClose={() => lobby.setShowAddPlayerModal(false)}
							onAddPlayer={lobby.addNewPlayer}
						/>
					)}

					{lobby.selectedPlayer && (
						<lobby.PlayerManagementModal
							player={lobby.selectedPlayer}
							isOpen={lobby.isPlayerModalOpen}
							onClose={lobby.handleClosePlayerModal}
							isLobbyCreator={lobby.isLobbyCreator}
							isCurrentUser={isCurrentUserSelected}
							onMutePlayer={lobby.handleMutePlayer}
							onVolumeChange={lobby.handleVolumeChange}
							onAddFriend={lobby.handleAddFriend}
							onRemovePlayer={lobby.handleRemovePlayer}
						/>
					)}

					{lobby.showLobbySettingsModal && (
						<lobby.LobbySettingsModal
							isOpen={lobby.showLobbySettingsModal}
							onClose={() => lobby.setShowLobbySettingsModal(false)}
							currentSettings={lobby.lobbySettings}
							onSaveSettings={lobby.handleSaveLobbySettings}
						/>
					)}
				</div>
			</>
		)
	}
)

export default function LobbyPageClient({ lobbyId }: LobbyPageClientProps) {
	const lobby = useLobby(lobbyId)

	if (lobby.isLoading) {
		return (
			<main className={styles.page}>
				<MemoizedFireflies />
				<MemoizedStars />
				<LoadingState />
			</main>
		)
	}

	return (
		<main className={styles.page}>
			<MemoizedFireflies />
			<MemoizedStars />
			<LobbyContent lobbyId={lobbyId} lobby={lobby} />
		</main>
	)
}