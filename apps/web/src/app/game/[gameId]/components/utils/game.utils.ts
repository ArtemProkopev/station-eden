// apps/web/src/app/game/[gameId]/utils/game.utils.ts
import { CardType, GamePhase } from '../types/game.types'

export const formatTime = (seconds: number): string => {
  if (seconds === undefined || seconds === null) return '0:00'
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export const getPhaseName = (phase: GamePhase): string => {
  switch (phase) {
    case 'introduction':
      return 'Введение'
    case 'preparation':
      return 'Подготовка'
    case 'discussion':
      return 'Обсуждение'
    case 'voting':
      return 'Голосование'
    case 'reveal':
      return 'Раскрытие'
    case 'crisis':
      return 'Кризис'
    case 'intermission':
      return 'Между раундами'
    case 'game_over':
      return 'Игра окончена'
    default:
      return phase
  }
}

export const getPhaseDescription = (phase: GamePhase): string => {
  switch (phase) {
    case 'introduction':
      return 'Просмотр заставки и ознакомление с сюжетом'
    case 'preparation':
      return 'Изучите свои карты и подготовьтесь к обсуждению'
    case 'discussion':
      return 'Обсуждайте с другими игроками, кто подозрителен'
    case 'voting':
      return 'Голосуйте за исключение игрока'
    case 'reveal':
      return 'Раскрытие карт выбывшего игрока'
    case 'crisis':
      return 'Решение кризиса на станции'
    case 'intermission':
      return 'Подготовка к следующему раунду'
    case 'game_over':
      return 'Игра завершена'
    default:
      return ''
  }
}

export const getCardTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'profession':
      return 'Профессия'
    case 'health':
      return 'Состояние здоровья'
    case 'trait':
      return 'Психологическая черта'
    case 'secret':
      return 'Секрет'
    case 'role':
      return 'Скрытая роль'
    case 'resource':
      return 'Ресурс'
    case 'gender':
      return 'Пол'
    case 'age':
      return 'Возраст'
    case 'body':
      return 'Телосложение'
    default:
      return type
  }
}

export const getCardTypeName = (type: CardType): string => {
  switch (type) {
    case 'profession':
      return 'Профессия'
    case 'health':
      return 'Состояние здоровья'
    case 'trait':
      return 'Психологическая черта'
    case 'secret':
      return 'Секрет'
    case 'role':
      return 'Скрытая роль'
    case 'resource':
      return 'Ресурс'
    case 'gender':
      return 'Пол'
    case 'age':
      return 'Возраст'
    case 'body':
      return 'Телосложение'
    default:
      return type
  }
}

export const getServerCardType = (clientType: CardType): string => {
  switch (clientType) {
    case 'profession':
      return 'profession'
    case 'health':
      return 'health'
    case 'trait':
      return 'trait'
    case 'secret':
      return 'secret'
    case 'role':
      return 'hiddenRole'
    case 'resource':
      return 'resource'
    case 'gender':
      return 'gender'
    case 'age':
      return 'age'
    case 'body':
      return 'bodyType'
    default:
      return 'profession'
  }
}

export const formatMessageTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}