'use client'

import TopHUD from '@/components/TopHUD/TopHUD'
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import { useParams } from 'next/navigation'
import { memo } from 'react'
import Chat from '../components/Chat/Chat'
import LobbyHeader from '../components/LobbyHeader/LobbyHeader'
import LobbyInfo from '../components/LobbyInfo/LobbyInfo'
import PlayersList from '../components/PlayersList/PlayersList'
import StartGameButton from '../components/StartGameButton/StartGameButton'
import { useLobby } from '../hooks/useLobby'
import styles from '../page.module.css'

const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

export default function LobbyPage() {
	const params = useParams<{ lobbyId: string }>()
	const lobbyId = params?.lobbyId || 'default-lobby'
	const lobby = useLobby(lobbyId)

	if (lobby.isLoading) {
		return (
			<main className={styles.page}>
				<MemoizedFireflies />
				<MemoizedStars />
				<TopHUD />
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p>Загрузка лобби...</p>
				</div>
			</main>
		)
	}

	return (
		<main className={styles.page}>
			<MemoizedFireflies />
			<MemoizedStars />
			<TopHUD profile={lobby.profile} avatar={lobby.assets.avatar} />

			<div className={styles.container}>
				<LobbyHeader
					title='Лобби'
					lobbyId={lobby.lobbyId}
					isConnected={lobby.isConnected}
				/>

				<div className={styles.columns}>
					<div className={styles.leftColumn}>
						<PlayersList
							players={lobby.players}
							maxPlayers={lobby.lobbySettings.maxPlayers}
							currentUserId={lobby.profile?.userId}
							onPlayerMenuClick={lobby.handlePlayerMenuClick}
							onAddPlayer={() => lobby.setShowAddPlayerModal(true)}
							onToggleReady={lobby.toggleReady}
							currentUserReadyState={lobby.currentUserReadyState}
						/>
					</div>

					<div className={styles.centerColumn}>
						<LobbyInfo
							lobbySettings={lobby.lobbySettings}
							playersCount={lobby.players.length}
							onOpenSettings={lobby.handleOpenLobbySettings}
						/>
					</div>

					<div className={styles.rightColumn}>
						<Chat
							messages={lobby.chatMessages}
							newMessage={lobby.newMessage}
							onMessageChange={lobby.setNewMessage}
							onSendMessage={lobby.handleSendMessage}
							onKeyPress={lobby.handleKeyPress}
							onChatScroll={lobby.handleChatScroll}
						/>
					</div>
				</div>

				<div className={styles.bottomSection}>
					<StartGameButton
						readyPlayersCount={lobby.players.filter(p => p.isReady).length}
						totalPlayersCount={lobby.players.length}
						isConnected={lobby.isConnected}
						minPlayersRequired={2}
					/>
				</div>

				{lobby.showAddPlayerModal && (
					<lobby.AddPlayerModal
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
						isCurrentUser={lobby.selectedPlayer.id === lobby.profile?.userId}
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
		</main>
	)
}
