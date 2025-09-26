import { Injectable, InternalServerErrorException } from '@nestjs/common'

// === DEV support ===
// Хранилище кодов в памяти (только для dev при MAIL_DEV_MODE=store)
const devCodes = new Map<string, { code: string; ts: number }>()

type DevMode = 'log' | 'store' | undefined

@Injectable()
export class EmailService {
	private readonly isProd = process.env.NODE_ENV === 'production'
	private readonly devMode: DevMode = process.env.MAIL_DEV_MODE as DevMode

	private resolveFrom() {
		const envFrom = process.env.EMAIL_FROM?.trim()
		if (envFrom) return envFrom
		// безопасный default для dev/sandbox
		return 'Station Eden <onboarding@resend.dev>'
	}

	async sendLoginCode(to: string, code: string) {
		// --- DEV режим: не отправляем реальную почту ---
		if (!this.isProd && this.devMode) {
			if (this.devMode === 'store') {
				devCodes.set(to.toLowerCase(), { code, ts: Date.now() })
			}
			// eslint-disable-next-line no-console
			console.warn(`[DEV][EmailService] MFA code for ${to}: ${code}`)
			return
		}

		// --- PROD режим: реальная отправка через Resend ---
		if (!process.env.RESEND_API_KEY) {
			console.error('[email] RESEND_API_KEY is missing')
			throw new InternalServerErrorException(
				'Email disabled: RESEND_API_KEY missing'
			)
		}

		// ленивый импорт, чтобы dev без resend тоже работал
		const { Resend } = await import('resend')
		const resend = new Resend(process.env.RESEND_API_KEY!)

		const from = this.resolveFrom()
		const year = new Date().getFullYear()
		const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, 'Apple Color Emoji','Segoe UI Emoji'; padding:24px; background:#0b0a1e;">
        <div style="max-width:520px;margin:0 auto;background:#131233;border:1px solid #2a2961;border-radius:16px;overflow:hidden;">
          <div style="padding:24px;text-align:center;background:linear-gradient(180deg,#1b1952,#12113a)">
            <img src="https://raw.githubusercontent.com/zeionara/assets/main/station-eden/logo-planet.png" alt="Station Eden" width="72" height="72" style="display:inline-block;border-radius:12px" />
            <h2 style="color:#fff;margin:12px 0 0;font-weight:700;letter-spacing:.3px">Station Eden</h2>
          </div>
          <div style="padding:24px;background:#0f0e2b;color:#d6d6ff">
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#cfcfff">Ваш код для входа:</p>
            <p style="margin:16px 0 20px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#ffffff">${code}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#a3a3d1">Код действует 10 минут.</p>
            <p style="margin:0;font-size:13px;color:#7a7aa8">Если это были не вы — просто игнорируйте письмо.</p>
          </div>
        </div>
        <p style="text-align:center;margin:14px 0 0;color:#7a7aa8;font-size:12px">&copy; ${year} Station Eden</p>
      </div>
    `

		const { data, error } = await resend.emails.send({
			from,
			to,
			subject: 'Код для входа в Station Eden',
			html,
		})

		if (error) {
			console.error('[email] resend error', {
				name: (error as any)?.name,
				message: (error as any)?.message,
				statusCode: (error as any)?.statusCode,
				cause: (error as any)?.cause,
			})
			throw new InternalServerErrorException('Failed to send email')
		}

		// eslint-disable-next-line no-console
		console.log('[email] sent', { to, id: data?.id })
		return data
	}

	/** Только для dev (MAIL_DEV_MODE=store): достать последний код */
	getLastDevCode(email: string) {
		if (this.isProd) return undefined
		return devCodes.get(email.toLowerCase())
	}
}
