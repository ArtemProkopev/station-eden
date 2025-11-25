// apps/web/src/app/profile/layout.tsx
import { Metadata } from 'next'

// Константы для переиспользования
const METADATA = {
  title: 'Профиль',
  description: 'Настройки профиля',
  robots: { index: false, follow: false, nocache: true },
} as const

const BACKGROUND_IMAGE = 'https://cdn.assets.stationeden.ru/web/profile-background-optimized.webp'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: METADATA.title,
    robots: METADATA.robots,
    openGraph: {
      title: METADATA.title,
      description: METADATA.description,
    },
    twitter: {
      card: 'summary',
    },
  }
}

// Экспортируем константы отдельно для лучшей читаемости
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

interface LayoutProps {
  children: React.ReactNode
}

export default async function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url("${BACKGROUND_IMAGE}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
        role="presentation"
      />
      
      {/* Content */}
      {children}
    </>
  )
}