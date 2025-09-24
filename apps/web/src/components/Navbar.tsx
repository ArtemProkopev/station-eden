'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

type Session =
	| { status: 'loading' }
	| { status: 'signed-out' }
	| { status: 'signed-in'; email: string }

function classNames(...xs: Array<string | false | undefined>) {
	return xs.filter(Boolean).join(' ')
}

async function getSessionDirect(): Promise<Session> {
	try {
		const r = await fetch(`${API}/auth/me`, {
			method: 'GET',
			credentials: 'include', // важно: браузер отправит httpOnly-куки на api.*
			cache: 'no-store',
		})
		if (!r.ok) return { status: 'signed-out' }

		const raw = await r.json()
		const data = raw?.data ?? raw
		if (data?.email) return { status: 'signed-in', email: data.email }
		return { status: 'signed-out' }
	} catch {
		return { status: 'signed-out' }
	}
}

export default function Navbar() {
	const [session, setSession] = useState<Session>({ status: 'loading' })
	const pathname = usePathname()

	useEffect(() => {
		let cancelled = false
		;(async () => {
			const s = await getSessionDirect()
			if (!cancelled) setSession(s)
		})()
		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		let alive = true
		async function onChange() {
			if (!alive) return
			const s = await getSessionDirect()
			if (alive) setSession(s)
		}
		// обновлять при смене фокуса вкладки и наших кастомных событиях
		const onVisibility = () => {
			if (document.visibilityState === 'visible') onChange()
		}
		window.addEventListener('session-changed', onChange as EventListener)
		document.addEventListener('visibilitychange', onVisibility)
		window.addEventListener('focus', onChange)

		return () => {
			alive = false
			window.removeEventListener('session-changed', onChange as EventListener)
			document.removeEventListener('visibilitychange', onVisibility)
			window.removeEventListener('focus', onChange)
		}
	}, [])

	const isActive = useMemo(
		() => (href: string) => pathname === href,
		[pathname]
	)

	return (
		<header className='topbar' role='banner'>
			<div className='shell'>
				<Link className='brand' href='/' aria-label='На главную'>
					<img src='/logo.svg' alt='' />
				</Link>

				<nav className='nav' aria-label='Основная навигация'>
					<ul>
						{session.status === 'loading' && (
							<>
								<li>
									<span className='ghost-link' aria-hidden>
										…
									</span>
								</li>
								<li>
									<span className='ghost-link' aria-hidden>
										…
									</span>
								</li>
							</>
						)}

						{session.status === 'signed-out' && (
							<>
								<li>
									<Link
										href='/register'
										className={classNames(
											'link',
											isActive('/register') && 'active'
										)}
										aria-current={isActive('/register') ? 'page' : undefined}
									>
										Регистрация
									</Link>
								</li>
								<li>
									<Link
										href='/login'
										className={classNames(
											'link',
											isActive('/login') && 'active'
										)}
										aria-current={isActive('/login') ? 'page' : undefined}
									>
										Вход
									</Link>
								</li>
							</>
						)}

						{session.status === 'signed-in' && (
							<>
								<li>
									<Link
										href='/profile'
										className={classNames(
											'link',
											isActive('/profile') && 'active'
										)}
										aria-current={isActive('/profile') ? 'page' : undefined}
									>
										Профиль
									</Link>
								</li>
								<li>
									<Link
										href='/admin/users'
										className={classNames(
											'link',
											isActive('/admin/users') && 'active'
										)}
										aria-current={isActive('/admin/users') ? 'page' : undefined}
									>
										Участники
									</Link>
								</li>
								{/* Кнопка "Выйти" находится в /profile */}
							</>
						)}
					</ul>
				</nav>
			</div>
		</header>
	)
}
