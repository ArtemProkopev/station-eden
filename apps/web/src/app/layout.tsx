// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import ClientRoot from './client-root'
import './globals.css'

export const metadata: Metadata = {
	title: 'Station Eden',
	description: 'Station Eden — мультиплеерный проект',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='ru' dir='ltr' suppressHydrationWarning>
			<body>
				<ClientRoot>{children}</ClientRoot>
			</body>
		</html>
	)
}
