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

export function useUserData(): UserData {
  const [userData, setUserData] = useState<UserData>({
    avatar: '',
    username: '',
    status: 'loading'
  })

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔄 Loading user data...')
        
        // 1. Сначала пробуем получить из localStorage
        const savedAvatar = localStorage.getItem('user_avatar')
        const savedUsername = localStorage.getItem('username')
        const savedEmail = localStorage.getItem('user_email')
        const savedUserId = localStorage.getItem('user_id')

        console.log('📁 LocalStorage data:', { savedAvatar, savedUsername })

        // 2. Если есть данные в localStorage - используем их сразу
        if (savedAvatar || savedUsername) {
          console.log('✅ Using cached user data')
          setUserData({
            avatar: savedAvatar || '/icons/avatar-placeholder.svg',
            username: savedUsername || 'Игрок',
            email: savedEmail || undefined,
            userId: savedUserId || undefined,
            status: 'ok'
          })
          return // Прерываем если нашли кешированные данные
        }

        // 3. Если нет данных в localStorage, пробуем API
        console.log('🌐 Trying to fetch from API...')
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
        
        // Создаем таймаут для запроса
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 сек таймаут

        try {
          const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            const userProfile = await response.json()
            console.log('✅ API user data:', userProfile)
            
            // Сохраняем в localStorage
            if (userProfile.avatar) {
              localStorage.setItem('user_avatar', userProfile.avatar)
            }
            if (userProfile.username) {
              localStorage.setItem('username', userProfile.username)
            }
            if (userProfile.email) {
              localStorage.setItem('user_email', userProfile.email)
            }
            if (userProfile.id) {
              localStorage.setItem('user_id', userProfile.id)
            }

            setUserData({
              avatar: userProfile.avatar || '/icons/avatar-placeholder.svg',
              username: userProfile.username || 'Игрок',
              email: userProfile.email,
              userId: userProfile.id,
              status: 'ok'
            })
          } else {
            console.warn('❌ API response not OK:', response.status)
            throw new Error(`API response: ${response.status}`)
          }
        } catch (apiError) {
          console.warn('❌ API fetch failed:', apiError)
          // Продолжаем с дефолтными данными
        }

        // 4. Если дошли сюда - используем дефолтные данные
        console.log('🎯 Using default user data')
        setUserData({
          avatar: '/icons/avatar-placeholder.svg',
          username: 'Космонавт',
          status: 'ok'
        })

      } catch (error) {
        console.error('💥 Failed to load user data:', error)
        // Всегда возвращаем какие-то данные, даже при ошибке
        setUserData({
          avatar: '/icons/avatar-placeholder.svg',
          username: 'Гость',
          status: 'error'
        })
      }
    }

    loadUserData()
  }, [])

  return userData
}