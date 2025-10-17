// apps/web/src/hooks/useUserData.ts
'use client'

import { useState, useEffect } from 'react'

export interface UserData {
  avatar: string
  username: string
  email?: string
  userId?: string
  status: 'loading' | 'ok' | 'error'
}

const MOCK_USER_DATA = {
  avatar: '/icons/avatar-placeholder.svg',
  username: 'Космонавт',
  email: 'cosmonaut@example.com',
  userId: 'user-12345'
}

export function useUserData(): UserData {
  const [userData, setUserData] = useState<UserData>({
    avatar: '',
    username: '',
    status: 'loading'
  })

  useEffect(() => {
    const loadUserData = () => {
      try {
        const savedAvatar = localStorage.getItem('user_avatar')
        const savedUsername = localStorage.getItem('username')
        const savedEmail = localStorage.getItem('user_email')
        const savedUserId = localStorage.getItem('user_id')

        if (savedAvatar || savedUsername) {
          setUserData({
            avatar: savedAvatar || MOCK_USER_DATA.avatar,
            username: savedUsername || MOCK_USER_DATA.username,
            email: savedEmail || undefined,
            userId: savedUserId || undefined,
            status: 'ok'
          })
        } else {
          localStorage.setItem('user_avatar', MOCK_USER_DATA.avatar)
          localStorage.setItem('username', MOCK_USER_DATA.username)
          localStorage.setItem('user_email', MOCK_USER_DATA.email || '')
          localStorage.setItem('user_id', MOCK_USER_DATA.userId || '')
          
          setUserData({
            ...MOCK_USER_DATA,
            status: 'ok'
          })
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        setUserData({
          ...MOCK_USER_DATA,
          status: 'ok'
        })
      }
    }

    const timer = setTimeout(loadUserData, 500)
    return () => clearTimeout(timer)
  }, [])

  return userData
}