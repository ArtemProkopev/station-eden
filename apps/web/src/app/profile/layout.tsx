export async function generateMetadata() {
	return {
		title: 'Профиль',
		robots: { index: false, follow: false, nocache: true },
		openGraph: { title: 'Профиль', description: 'Настройки профиля' },
		twitter: { card: 'summary' },
	}
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

export default async function Layout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			<div
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: 0,
					backgroundImage: 'url("/profile-background.jpg")',
					backgroundSize: 'cover',
					backgroundPosition: 'center',
				}}
				aria-hidden
			/>
			{children}
		</>
	)
}
