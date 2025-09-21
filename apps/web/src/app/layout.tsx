import Footer from '@/src/components/Footer'
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
				<Footer />
			</body>
		</html>
	)
}
