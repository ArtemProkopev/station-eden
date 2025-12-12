import { NextRequest, NextResponse } from 'next/server'
import { getGame, hasGame, createGame, updateGame, processPhaseEnd, revealCard, vote, updateTimer } from '../storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = params.gameId
    console.log('🎮 GET game:', gameId)

    // ✅ ЕСЛИ ИГРА ЕСТЬ — ВОЗВРАЩАЕМ
    if (hasGame(gameId)) {
      const gameData = getGame(gameId)
      console.log('✅ Game found:', gameId, 'Phase:', gameData?.phase, 'Players:', gameData?.players.length)
      return NextResponse.json({
        ...gameData,
        status: 'active'
      })
    }

    // 🔄 ЕСЛИ ИГРА НЕ НАЙДЕНА - СОЗДАЕМ НОВУЮ ДЛЯ ТЕСТА
    console.log('🔄 Creating new game:', gameId)
    const newGame = createGame(gameId)
    
    return NextResponse.json({
      ...newGame,
      status: 'active'
    })

  } catch (error) {
    console.error('❌ Error fetching game:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка загрузки игры',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = params.gameId
    const body = await request.json()
    const action = body.action
    
    console.log('🎮 Game action:', gameId, action, body)

    // Если игра не существует, создаем ее
    if (!hasGame(gameId)) {
      console.log('🔄 Game not found, creating:', gameId)
      createGame(gameId)
    }

    let result: any = { success: true }

    switch (action) {
      case 'reveal_card':
        const { playerId, cardId } = body
        const revealSuccess = revealCard(gameId, playerId, cardId)
        result = { 
          success: revealSuccess, 
          message: revealSuccess ? 'Карта раскрыта' : 'Ошибка раскрытия карты'
        }
        break
        
      case 'vote':
        const { voterId, targetPlayerId } = body
        const voteSuccess = vote(gameId, voterId, targetPlayerId)
        result = { 
          success: voteSuccess, 
          message: voteSuccess ? 'Голос засчитан' : 'Ошибка голосования'
        }
        break
        
      case 'phase_action':
        // Обработка действия по фазе
        const updatedGame = processPhaseEnd(gameId)
        result = { 
          success: !!updatedGame, 
          game: updatedGame,
          message: 'Фаза завершена' 
        }
        break
        
      case 'update_timer':
        const { timeLeft } = body
        const timerSuccess = updateTimer(gameId, timeLeft)
        result = { 
          success: timerSuccess, 
          message: 'Таймер обновлен' 
        }
        break
        
      case 'solve_crisis':
        // Решение кризиса
        updateGame(gameId, { 
          currentCrisis: null,
          phase: 'discussion'
        })
        result = { 
          success: true, 
          message: 'Кризис решен' 
        }
        break
        
      case 'sync_game':
        // Синхронизация состояния игры
        const game = getGame(gameId)
        result = { 
          success: true, 
          game,
          message: 'Состояние синхронизировано' 
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'Unknown action', status: 'error' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error processing game action:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка обработки действия',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    )
  }
}