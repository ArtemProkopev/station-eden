'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

	useEffect(() => {
		let alive = true
		async function onChange() {
			if (!alive) return
			const s = await getSession()
			if (alive) setSession(s)
		}
		window.addEventListener('session-changed', onChange as EventListener)
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
