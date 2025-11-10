// apps/web/src/app/layout.tsx
import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import { cookies } from 'next/headers'
import './globals.css'

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const theme = cookies().get('theme')?.value ?? ''

	return (
		<html lang='ru' dir='ltr' className={theme} suppressHydrationWarning>
			<head>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon.ico?v=2' type='image/x-icon' />
			</head>
			<body>
				{/* keep-alive клиентский компонент работает всегда */}
				<SessionKeepAliveClient />
				{/* <Navbar /> */}
				<main className='container'>{children}</main>
				{/* <Footer /> */}
				<CdnWarning />
			</body>
		</html>
	)
}
