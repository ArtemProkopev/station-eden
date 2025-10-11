// apps/api/src/auth/brute-force.service.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, MoreThan, Not, Repository } from 'typeorm'
import { LoginAttempt } from './login-attempt.entity'

@Injectable()
export class BruteForceService {
	private readonly MAX_ATTEMPTS = 5
	private readonly WINDOW_MIN = 15
	/** Эскалация по количеству блокировок за окно */
	private readonly LOCK_STEPS_MIN = [2, 5, 10, 15]

	constructor(
		@InjectRepository(LoginAttempt)
		private readonly repo: Repository<LoginAttempt>
	) {}

	private norm(s: string) {
		return s.trim().toLowerCase()
	}

	/** Формат для логов: локальная дата/время без «Z», понятная человеку */
	private fmt(ts: Date | string | number) {
		const d = ts instanceof Date ? ts : new Date(ts)
		return new Intl.DateTimeFormat('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}).format(d)
	}

	async isBlocked(loginRaw: string) {
		const login = this.norm(loginRaw)
		const now = new Date()
		const last = await this.repo.findOne({
			where: { login, blockedUntil: MoreThan(now) },
			order: { attemptTime: 'DESC' },
			select: { blockedUntil: true, attemptTime: true, id: true, login: true },
		})
		if (!last?.blockedUntil) return { blocked: false as const }
		const minutesLeft = Math.max(
			0,
			Math.ceil((last.blockedUntil.getTime() - now.getTime()) / 60000)
		)
		console.warn(
			`[BRUTE FORCE] Заблокирован вход "${login}" — осталось ~${minutesLeft} мин, до ${this.fmt(last.blockedUntil)}`
		)
		return {
			blocked: true as const,
			minutesLeft,
			lockedUntil: last.blockedUntil,
		}
	}

	/** Последняя запись-блокировка (по attemptTime) */
	private async getLastBlock(login: string) {
		return await this.repo.findOne({
			where: { login, blockedUntil: Not(IsNull()) },
			order: { attemptTime: 'DESC' },
			select: { attemptTime: true, blockedUntil: true, id: true, login: true },
		})
	}

	private async failedCountInWindow(login: string) {
		const since = new Date(Date.now() - this.WINDOW_MIN * 60 * 1000)
		return await this.repo.count({
			where: { login, success: false, attemptTime: MoreThan(since) },
		})
	}

	private async blockCountInWindow(login: string) {
		const since = new Date(Date.now() - this.WINDOW_MIN * 60 * 1000)
		return await this.repo.count({
			where: { login, blockedUntil: MoreThan(since) },
		})
	}

	private async failedCountSinceLastBlock(login: string) {
		const lastBlock = await this.getLastBlock(login)
		if (lastBlock) {
			// после ПОСЛЕДНЕЙ блокировки — даём заново 5 попыток
			return await this.repo.count({
				where: {
					login,
					success: false,
					attemptTime: MoreThan(lastBlock.attemptTime),
				},
			})
		}
		// если блокировок ещё не было — используем скользящее окно (защита от бесконечных попыток)
		return this.failedCountInWindow(login)
	}

	private async logAttempt(opts: {
		login: string
		success: boolean
		blockedUntil?: Date | null
	}) {
		const rec = this.repo.create({
			login: this.norm(opts.login),
			success: opts.success,
			blockedUntil: opts.blockedUntil ?? null,
		})
		await this.repo.save(rec)
	}

	/**
	 * Регистрирует неудачу и, при превышении лимита, накладывает блок.
	 * Эскалация блокировки: по количеству блокировок в окне (2, 5, 10, 15).
	 * Счётчик 5 попыток всегда считается с момента ПОСЛЕДНЕЙ блокировки.
	 */
	async registerFail(loginRaw: string) {
		const login = this.norm(loginRaw)

		// Логируем неуспех
		await this.logAttempt({ login, success: false })

		// Сколько неудач после последней блокировки (или в окне, если блоков не было)
		const fails = await this.failedCountSinceLastBlock(login)

		if (fails >= this.MAX_ATTEMPTS) {
			// Сколько блоков уже было за окно — для эскалации длительности
			const blocks = await this.blockCountInWindow(login)
			const tier = Math.min(blocks, this.LOCK_STEPS_MIN.length - 1)
			const lockMin = this.LOCK_STEPS_MIN[tier]
			const until = new Date(Date.now() + lockMin * 60 * 1000)

			// Записываем блок (как отдельную запись с blockedUntil)
			await this.logAttempt({ login, success: false, blockedUntil: until })
			console.warn(
				`[BRUTE FORCE] Блокировка для "${login}" на ${lockMin} мин (до ${this.fmt(until)})`
			)
			return {
				blocked: true as const,
				attemptsLeft: 0,
				minutesLeft: lockMin,
				lockedUntil: until,
			}
		}

		return {
			blocked: false as const,
			attemptsLeft: Math.max(0, this.MAX_ATTEMPTS - fails),
		}
	}

	async registerSuccess(loginRaw: string) {
		const login = this.norm(loginRaw)
		await this.logAttempt({ login, success: true })
	}
}
