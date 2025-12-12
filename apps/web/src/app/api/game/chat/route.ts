import { NextRequest, NextResponse } from 'next/server'
import { getGame, hasGame, addChatMessage, createGame } from '../storage'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = params.gameId
    console.log('💬 GET chat for game:', gameId)

    // Проверяем существование игры
    if (!hasGame(gameId)) {
      console.log('🔄 Game not found, creating:', gameId)
      createGame(gameId)
    }

    const game = getGame(gameId)
    if (!game) {
      return NextResponse.json([], { status: 200 })
    }

    // Возвращаем историю чата
    return NextResponse.json(game.chatHistory || [])

  } catch (error) {
    console.error('❌ Error in chat GET:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const gameId = params.gameId
    const message = await request.json()
    
    console.log('💬 POST to chat:', gameId, 'from:', message.playerName)

    // Проверяем валидность сообщения
    if (!message.text || typeof message.text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message text' },
        { status: 400 }
      )
    }

    if (!message.playerId || !message.playerName) {
      return NextResponse.json(
        { error: 'Missing player information' },
        { status: 400 }
      )
    }

    // Проверяем существование игры
    if (!hasGame(gameId)) {
      console.log('🔄 Game not found, creating:', gameId)
      createGame(gameId)
    }

    // Добавляем сообщение
    const success = addChatMessage(gameId, {
      ...message,
      type: message.type || 'player',
      timestamp: new Date().toISOString()
    })

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      )
    }

    const game = getGame(gameId)
    const chatHistory = game?.chatHistory || []

    return NextResponse.json({ 
      success: true,
      message: 'Message sent',
      chatHistory: chatHistory.slice(-50) // Возвращаем последние 50 сообщений
    })

  } catch (error) {
    console.error('❌ Error in chat POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}