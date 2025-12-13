// apps/web/src/app/api/game/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Это временный in-memory storage для игр
// В продакшене нужно использовать базу данных
const games = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lobbyId, players, creatorId, settings } = body;

    if (!lobbyId || !players || !Array.isArray(players) || players.length < 2) {
      return NextResponse.json(
        { error: 'Недостаточно игроков для начала игры' },
        { status: 400 }
      );
    }

    // Создаем уникальный ID для игры
    const gameId = uuidv4().substring(0, 8);

    // Создаем начальное состояние игры
    const gameState = {
      id: gameId,
      lobbyId,
      status: 'active' as const,
      players: players.map((player, index) => ({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        score: 0,
        isActive: true,
        order: index + 1
      })),
      currentPlayerId: players[0]?.id,
      round: 1,
      startedAt: new Date().toISOString(),
      settings: settings || {
        gameMode: 'standard',
        maxRounds: 10
      }
    };

    // Сохраняем игру
    games.set(gameId, gameState);

    return NextResponse.json({
      success: true,
      gameId,
      redirectUrl: `/game/${gameId}`,
      gameState
    });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании игры' },
      { status: 500 }
    );
  }
}

// Получение информации об игре
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json(
      { error: 'ID игры не указан' },
      { status: 400 }
    );
  }

  const gameState = games.get(gameId);

  if (!gameState) {
    return NextResponse.json(
      { error: 'Игра не найдена' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    gameState
  });
}