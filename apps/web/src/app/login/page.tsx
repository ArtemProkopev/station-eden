'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { api } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import styles from './page.module.css'

// если у тебя есть компонент кнопки Google в проекте:
import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'

function LoginInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/profile'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.login(email, password)
      router.replace(next)
    } catch (err: any) {
      setError(err?.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <h2 className={styles.title}>Вход</h2>

        {error && <div className={`${styles.notice} ${styles.error}`}>{error}</div>}

        <form onSubmit={onSubmit} className={styles.form}>
          <input
            required
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
          />
          <input
            required
            type="password"
            placeholder="пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={styles.input}
          />
          <div className={styles.actions}>
            <button className={styles.button} disabled={loading} type="submit">
              {loading ? 'Входим…' : 'Войти'}
            </button>
          </div>
        </form>

        {GOOGLE_ENABLED && (
          <>
            <div className={styles.oauthDivider}>или</div>
            <div className={styles.oauth}>
              <GoogleAuthButton />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  // Suspense — для корректной работы useSearchParams в App Router
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}