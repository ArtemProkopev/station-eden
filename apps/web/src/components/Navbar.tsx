// apps/web/src/components/Navbar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type Session =
	| { status: 'loading' }
	| { status: 'signed-out' }
	| { status: 'signed-in'; email?: string }

function classNames(...xs: Array<string | false | undefined>) {
	return xs.filter(Boolean).join(' ')
}

// Мягкая проверка сессии через /auth/session:
// - всегда 200
// - никаких 401/refresh для гостей
async function getSessionSoft(): Promise<Session> {
	try {
		const resp: any = await api.session()

		if (resp?.status === 'signed-in') {
			const email: string | undefined = resp?.user?.email
			return email ? { status: 'signed-in', email } : { status: 'signed-in' }
		}

		return { status: 'signed-out' }
	} catch {
		return { status: 'signed-out' }
	}
}

export default function Navbar() {
	const [session, setSession] = useState<Session>({ status: 'loading' })
	const pathname = usePathname()

	if (!pathname) return null

	// На главной странице навбар не показываем, чтобы не конфликтовать с HUD
	if (pathname === '/') {
		return null
	}

	const isAuthPage = useMemo(() => {
		return (
			pathname === '/login' ||
			pathname.startsWith('/login') ||
			pathname === '/register' ||
			pathname.startsWith('/register')
		)
	}, [pathname])

	useEffect(() => {
		let cancelled = false
		;(async () => {
			const s = await getSessionSoft()
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
			const s = await getSessionSoft()
			if (alive) setSession(s)
		}

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

	const effectiveSession: Session = isAuthPage
		? { status: 'signed-out' }
		: session

	return (
		<header className='topbar' role='banner'>
			<div className='shell'>
				<Link className='brand' href='/' aria-label='На главную'>
					<img src='/logo.svg' alt='' />
				</Link>

				<nav className='nav' aria-label='Основная навигация'>
					<ul>
						{effectiveSession.status === 'loading' && (
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

						{effectiveSession.status === 'signed-out' && (
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

						{effectiveSession.status === 'signed-in' && (
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
							</>
						)}
					</ul>
				</nav>
			</div>
		</header>
	)
}
