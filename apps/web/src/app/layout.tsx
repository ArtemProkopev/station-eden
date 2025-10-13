// apps/web/src/app/layout.tsx
import Footer from '@/src/components/Footer'
import Navbar from '@/src/components/Navbar'
import CdnWarning from '@/src/components/CdnWarning'
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
			</head>
			<body>
				{/* <Navbar /> */}
				<main className='container'>{children}</main>
				{/* <Footer /> */}
				<CdnWarning />
			</body>
		</html>
	)
}