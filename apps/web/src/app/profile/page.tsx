// apps/web/src/app/profile/page.tsx
import { headers } from 'next/headers'
import CopyButton from './CopyButton'
import LogoutButton from './LogoutButton'
import styles from './page.module.css'

type Me =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; userId: string; email: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

// для auth-страниц лучше не кэшировать
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

// SEO для приватной страницы
export async function generateMetadata() {
  return {
    title: 'Профиль',
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title: 'Профиль', description: 'Настройки профиля' },
    twitter: { card: 'summary' },
  }
}

async function getMe(): Promise<Me> {
  try {
    const cookie = headers().get('cookie') ?? ''
    const r = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        cookie, // важен для SSR-прокирования сессии
      },
      cache: 'no-store',
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const raw = await r.json()
    const payload = raw?.data ?? raw
    const userId = payload?.userId
    const email = payload?.email
    if (typeof userId === 'string' && typeof email === 'string') {
      return { status: 'ok', userId, email }
    }
    throw new Error('Malformed response')
  } catch (e: any) {
    return {
      status: 'error',
      message: e?.message || 'Не удалось загрузить профиль',
    }
  }
}

function formatId(id: string) {
  return id.replace(/-/g, '\u2009–\u2009') // тонкий пробел + тире
}

export default async function ProfilePage() {
  const me = await getMe()

  return (
    <>
      <div 
        className={styles.bg} 
        aria-hidden 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url("/profile-background.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <div className={styles.scene}>
        <div className={styles.panel}>
          <div className={styles.grid}>
            {/* левая колонка */}
            <aside className={styles.side}>
              <div className={styles.avatarPlaceholder} />
              {me.status === 'ok' ? (
                <div className={styles.emailBlock} title={me.email}>
                  <div className={styles.emailCaption}>Входит как</div>
                  <div className={styles.emailValue}>{me.email}</div>

                  {/* Лёгкая кнопка "Выйти" под email */}
                  <LogoutButton />
                </div>
              ) : me.status === 'loading' ? (
                <div className={styles.emailSkeleton} />
              ) : (
                <div className={styles.errorMini}>{me.message}</div>
              )}
            </aside>

            {/* правая колонка */}
            <section className={styles.main}>
              <h1 className={styles.title}>Профиль</h1>

              {me.status === 'loading' && (
                <div className={styles.skel} aria-hidden />
              )}

              {me.status === 'error' && (
                <div className={styles.error}>{me.message}</div>
              )}

              {me.status === 'ok' && (
                <div className={styles.card}>
                  <div className={styles.row}>
                    <div className={styles.label}>Игровой ID</div>
                    <CopyButton value={me.userId} />
                  </div>

                  <code
                    className={styles.idBadge}
                    title={me.userId}
                    aria-describedby='id-hint'
                  >
                    {formatId(me.userId)}
                  </code>
                  <p id='id-hint' className={styles.hint}>
                    Используйте ID для поддержки и входа в игровые лобби.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}