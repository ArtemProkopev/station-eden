import { NextRequest, NextResponse } from 'next/server'
import { saveGame } from '../storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lobbyId, lobbySettings, players } = body

    console.log('=== CREATING GAME ===')

    // ✅ ГЕНЕРАЦИЯ ID
    const gameId = Math.random().toString(36).substring(2, 10)

    // ✅ ГАРАНТИРУЕМ, ЧТО ИГРОКИ НЕ ПУСТЫЕ
    const safePlayers = players.length
      ? players
      : [{ id: 'player-1', username: 'Игрок 1' }]

    const gameData = {
      id: gameId,
      lobbyId,
      status: 'active',
      phase: 'preparation',
      round: 1,

      players: safePlayers.map((player: any, index: number) => ({
        id: player.id || `player-${index + 1}`,
        username: player.username || player.name || `Игрок ${index + 1}`,
        avatar: player.avatar || '/default-avatar.png',
        cards: [],
        isAlive: true,
        isInCapsule: false,
        hasRevealedCard: false,
        role: 'Экипаж'
      })),

      capsuleSlots: {
        total: Math.ceil(safePlayers.length / 2),
        occupied: 0
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // ✅ НАСТОЯЩЕЕ СОХРАНЕНИЕ В ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ
    saveGame(gameId, gameData)

    console.log('=== ✅ GAME CREATED ===', gameId)

    return NextResponse.json({
      success: true,
      gameId,
      game: gameData
    })

  } catch (error) {
    console.error('❌ Error creating game:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка создания игры' },
      { status: 500 }
    )
  }
}
