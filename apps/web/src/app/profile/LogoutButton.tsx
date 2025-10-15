// apps/web/src/app/profile/components/LogoutButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './page.module.css'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={styles.leaveBtn}
      onClick={handleLogout}
      disabled={loading}
      aria-label="Выйти из аккаунта"
    >
      {loading ? 'выход...' : 'выйти'}
    </button>
  )
}