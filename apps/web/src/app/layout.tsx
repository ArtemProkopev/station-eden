import Navbar from '@/src/components/Navbar'
import './globals.css'

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='ru'>
			<body>
				<Navbar />
				<main className='container'>{children}</main>
				<footer className='footer'>© Station Eden</footer>
			</body>
		</html>
	)
}
