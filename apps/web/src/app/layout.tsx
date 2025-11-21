// apps/web/src/app/layout.tsx
import CdnWarning from '@/src/components/CdnWarning'
import SessionKeepAliveClient from '@/src/components/SessionKeepAliveClient'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

// Базовые метаданные (добавь title/description, какие нужны)
export const metadata: Metadata = {
	title: 'Station Eden',
	description: 'Station Eden — мультиплеерный проект',
	icons: {
		icon: '/favicon.ico?v=2',
	},
}

// Viewport лучше задавать так, чем через <meta> руками
export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
}

// Скрипт, который ещё ДО реакт-гидрации читает cookie "theme"
// и вешает класс на <html>. Так мы обходимся без cookies() на сервере.
const themeInitScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    if (!match) return;
    var theme = decodeURIComponent(match[1]);
    if (!theme) return;
    // Заменяем только класс темы, остальные можно добавить через CSS
    document.documentElement.className = theme;
  } catch (e) {
    // молча игнорируем
  }
})();
`

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='ru' dir='ltr' suppressHydrationWarning>
			<head>
				{/* Применяем тему до гидрации, чтобы не было мигания */}
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body>
				{/* keep-alive клиентский компонент работает всегда */}
				<SessionKeepAliveClient />
				<main className='container'>{children}</main>
				<CdnWarning />
			</body>
		</html>
	)
}
