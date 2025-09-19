'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type Session =
	| { status: 'loading' }
	| { status: 'signed-out' }
	| { status: 'signed-in'; email: string }

function classNames(...xs: Array<string | false | undefined>) {
	return xs.filter(Boolean).join(' ')
}

async function getSession(): Promise<Session> {
	try {
		const r = await fetch('/api/session', { cache: 'no-store' })
		const data = await r.json()
		if (data?.status === 'signed-in')
			return { status: 'signed-in', email: data.email }
		return { status: 'signed-out' }
	} catch {
		return { status: 'signed-out' }
	}
}

export default function Navbar() {
	const [session, setSession] = useState<Session>({ status: 'loading' })
	const pathname = usePathname()
	const router = useRouter()

	// 1) первичная загрузка
	useEffect(() => {
		let cancelled = false
		;(async () => {
			const s = await getSession()
			if (!cancelled) setSession(s)
		})()
		return () => {
			cancelled = true
		}
	}, [])

	// 2) слушаем глобальные сигналы о смене сессии (логин/логаут/рефреш)
	useEffect(() => {
		let alive = true
		async function onChange() {
			if (!alive) return
			const s = await getSession()
			if (alive) setSession(s)
		}
		window.addEventListener('session-changed', onChange as EventListener)
		// На всякий случай — обновление при возвращении на вкладку
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') onChange()
		})
		return () => {
			alive = false
			window.removeEventListener('session-changed', onChange as EventListener)
		}
	}, [])

	const isActive = useMemo(
		() => (href: string) => pathname === href,
		[pathname]
	)

	async function onLogout() {
		try {
			// прямой вызов бэка (чистит куки)
			const csrf =
				document.cookie
					.split('; ')
					.find(c => c.startsWith('csrf_token='))
					?.split('=')[1] ?? ''
			await fetch(
				(process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000') +
					'/auth/logout',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
					credentials: 'include',
					body: '{}',
				}
			)
			// самостоятельно дёрнем обновление сессии и уйдём на /login
			const s = await getSession()
			setSession(s)
		} finally {
			router.replace('/login')
		}
	}

	return (
		<header className='topbar'>
			<a className='brand' href='/'>
				<img src='/logo.svg' alt='Station Eden' />
			</a>

			<nav className='nav'>
				{session.status === 'loading' && (
					<>
						<span className='ghost-link' aria-hidden>
							…
						</span>
						<span className='ghost-link' aria-hidden>
							…
						</span>
					</>
				)}

				{session.status === 'signed-out' && (
					<>
						<Link
							href='/register'
							className={classNames(isActive('/register') && 'active')}
						>
							Регистрация
						</Link>
						<Link
							href='/login'
							className={classNames(isActive('/login') && 'active')}
						>
							Вход
						</Link>
					</>
				)}

				{session.status === 'signed-in' && (
					<>
						<Link
							href='/profile'
							className={classNames(isActive('/profile') && 'active')}
						>
							Профиль
						</Link>
						<Link
							href='/admin/users'
							className={classNames(isActive('/admin/users') && 'active')}
						>
							Участники
						</Link>
						<button className='btn' onClick={onLogout} title={session.email}>
							Выйти
						</button>
					</>
				)}
			</nav>
		</header>
	)
}
