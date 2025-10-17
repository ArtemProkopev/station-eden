// apps/web/src/app/profile/components/LogoutButton.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './TopHUD.module.css'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      
      // Используем GET endpoint вместо POST
      const response = await fetch(`${API_BASE}/auth/logout-get`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        console.error('Logout failed', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={styles.menuItem}
      onClick={handleLogout}
      disabled={loading}
      aria-label="Выйти из аккаунта"
    >
      {loading ? 'Покидаем станцию...' : 'Покинуть станцию'}
    </button>
  )
}