// apps/web/src/app/layout.tsx
import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
	title: 'Station Eden',
	description: 'Station Eden — мультиплеерный проект',
	icons: {
		icon: '/favicon.ico?v=2',
	},
}

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
}

const themeInitScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    if (!match) return;
    var theme = decodeURIComponent(match[1]);
    if (!theme) return;
    document.documentElement.className = theme;
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='ru' dir='ltr' suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body>
				<SessionKeepAliveClient />
				<main>{children}</main>
				<CdnWarning />
			</body>
		</html>
	)
}
