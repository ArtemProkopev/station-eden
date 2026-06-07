export type RuPluralForms = [string, string, string]
export type RuGenitiveForms = [string, string]

const GENITIVE_NUMBER_WORDS: Record<number, string> = {
	0: 'нуля',
	1: 'одного',
	2: 'двух',
	3: 'трёх',
	4: 'четырёх',
	5: 'пяти',
	6: 'шести',
	7: 'семи',
	8: 'восьми',
	9: 'девяти',
	10: 'десяти',
	11: 'одиннадцати',
	12: 'двенадцати',
	13: 'тринадцати',
	14: 'четырнадцати',
	15: 'пятнадцати',
	16: 'шестнадцати',
	17: 'семнадцати',
	18: 'восемнадцати',
	19: 'девятнадцати',
	20: 'двадцати',
}

export const getPluralForm = (count: number, forms: RuPluralForms): string => {
	const absCount = Math.abs(count)
	const lastTwoDigits = absCount % 100
	const lastDigit = absCount % 10

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return forms[2]
	}

	if (lastDigit === 1) {
		return forms[0]
	}

	if (lastDigit >= 2 && lastDigit <= 4) {
		return forms[1]
	}

	return forms[2]
}

export const formatCount = (count: number, forms: RuPluralForms): string => {
	return `${count} ${getPluralForm(count, forms)}`
}

export const getGenitiveNumberWord = (count: number): string => {
	const absCount = Math.abs(count)

	return GENITIVE_NUMBER_WORDS[absCount] ?? String(count)
}

export const formatGenitiveCount = (
	count: number,
	forms: RuGenitiveForms,
): string => {
	const absCount = Math.abs(count)
	const wordForm = absCount === 1 ? forms[0] : forms[1]

	return `${getGenitiveNumberWord(count)} ${wordForm}`
}

export const PLAYER_FORMS: RuPluralForms = ['игрок', 'игрока', 'игроков']
export const PLAYER_GENITIVE_FORMS: RuGenitiveForms = ['игрока', 'игроков']

export const formatPlayersCount = (count: number): string => {
	return formatCount(count, PLAYER_FORMS)
}

export const formatPlayersGenitiveCount = (count: number): string => {
	return formatGenitiveCount(count, PLAYER_GENITIVE_FORMS)
}
