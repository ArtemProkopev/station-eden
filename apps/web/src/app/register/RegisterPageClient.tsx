// apps/web/src/app/register/RegisterPageClient.tsx
'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Components
import { FirefliesProfile } from '@/components/ui/Fireflies/FirefliesProfile'
import { TwinklingStars } from '@/components/ui/TwinklingStars/TwinklingStars'
import GoogleAuthButton from '@/src/components/auth/GoogleAuthButton'
import { EyeIcon, EyeOffIcon } from '@/src/components/ui/Icons'

// Hooks & Utils
import { useUsernameGenerator } from '@/src/hooks/useUsernameGenerator'
import { api, getUserMessage } from '@/src/lib/api'
import { GOOGLE_ENABLED } from '@/src/lib/flags'
import { measureStrength, strengthMeta } from '@/src/utils/passwordStrength'

// Schemas
import { RegisterSchema } from '@station-eden/shared'

// Styles
import styles from './page.module.css'

// Constants
const FORM_ANIMATION_DURATION = 340
const USERNAME_COOLDOWN = 120

// Memoized components
const MemoizedFireflies = memo(FirefliesProfile)
const MemoizedStars = memo(TwinklingStars)

// Extended schema for client
const ClientRegisterSchema = RegisterSchema.extend({
  confirm: z.string().min(1, 'Подтверждение пароля обязательно'),
}).refine(data => data.password === data.confirm, {
  message: 'Пароли не совпадают',
  path: ['confirm'],
})

type ClientRegisterForm = z.infer<typeof ClientRegisterSchema>

interface FormState {
  showPassword: boolean
  showConfirmPassword: boolean
  capsLockOn: boolean
  error: string | null
  mounted: boolean
  shake: boolean
  genCooldown: boolean
}

export default function RegisterPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Form state
  const [formState, setFormState] = useState<FormState>({
    showPassword: false,
    showConfirmPassword: false,
    capsLockOn: false,
    error: null,
    mounted: false,
    shake: false,
    genCooldown: false,
  })

  // Form handling
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ClientRegisterForm>({
    resolver: zodResolver(ClientRegisterSchema),
    mode: 'onChange',
  })

  // Watched fields
  const password = watch('password', '')
  const confirm = watch('confirm', '')
  const username = watch('username', '')

  // Hooks
  const {
    generateUsername,
    loading: generating,
    isWasmSupported,
  } = useUsernameGenerator()

  // Effects
  useEffect(() => {
    setFormState(prev => ({ ...prev, mounted: true }))
  }, [])

  // Memoized values
  const strength = useMemo(() => measureStrength(password), [password])
  const strengthInfo = useMemo(() => strengthMeta(strength), [strength])
  const googleEnabled = GOOGLE_ENABLED
  const reason = searchParams.get('reason')

  // Event handlers
  const handleCapsLock = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const capsOn = e.getModifierState?.('CapsLock') ?? false
    setFormState(prev => ({ ...prev, capsLockOn: capsOn }))
  }, [])

  const handleGenerateUsername = useCallback(() => {
    if (formState.genCooldown) return

    setFormState(prev => ({ ...prev, genCooldown: true }))
    const newUsername = generateUsername()
    
    setValue('username', newUsername, {
      shouldValidate: true,
      shouldDirty: true,
    })
    
    setTimeout(() => {
      setFormState(prev => ({ ...prev, genCooldown: false }))
    }, USERNAME_COOLDOWN)
  }, [formState.genCooldown, generateUsername, setValue])

  const togglePasswordVisibility = useCallback(() => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setFormState(prev => ({ 
      ...prev, 
      showConfirmPassword: !prev.showConfirmPassword 
    }))
  }, [])

  const triggerShake = useCallback(() => {
    setFormState(prev => ({ ...prev, shake: true }))
    setTimeout(() => {
      setFormState(prev => ({ ...prev, shake: false }))
    }, FORM_ANIMATION_DURATION)
  }, [])

  // Form submission
  const onSubmit = useCallback(async (data: ClientRegisterForm) => {
    setFormState(prev => ({ ...prev, error: null }))
    
    try {
      const res = await api.register(data.email, data.username, data.password)
      
      if ((res as any)?.mfa === 'email_code_sent') {
        router.replace(
          `/login/verify?email=${encodeURIComponent(data.email)}&next=${encodeURIComponent('/profile')}`
        )
        return
      }
      
      throw new Error('Не удалось запустить подтверждение по почте')
    } catch (err: any) {
      setFormState(prev => ({ 
        ...prev, 
        error: getUserMessage(err, 'register') 
      }))
      triggerShake()
    }
  }, [router, triggerShake])

  const onError = useCallback(() => {
    triggerShake()
  }, [triggerShake])

  // Render helpers
  const renderPasswordStrength = useMemo(() => {
    if (password.length === 0 || errors.password) return null

    return (
      <>
        <div className={styles.strengthWrap} data-strength={strength}>
          <div
            className={styles.strengthBar}
            style={{ width: `${strengthInfo.percent}%` }}
          />
        </div>
        <div className={styles.strengthLabel}>{strengthInfo.label}</div>
      </>
    )
  }, [password, errors.password, strength, strengthInfo])

  const renderCapsLockWarning = useMemo(() => {
    if (!formState.capsLockOn) return null
    
    return <div className={styles.capsTip}>Включён Caps&nbsp;Lock</div>
  }, [formState.capsLockOn])

  const renderPasswordMatch = useMemo(() => {
    if (confirm.length === 0) return null

    const isMatch = !errors.confirm && confirm === password
    
    return (
      <div className={`${styles.matchBadge} ${isMatch ? styles.show : ''}`}>
        {isMatch ? 'Пароли совпадают' : errors.confirm?.message}
      </div>
    )
  }, [confirm, password, errors.confirm])

  return (
    <main className={styles.page}>
      <MemoizedFireflies />
      <MemoizedStars />

      <div className={styles.container}>
        <section className={styles.card} aria-labelledby='reg-title'>
          <header className={styles.header}>
            <h1 id='reg-title' className={styles.title}>
              Регистрация
            </h1>
          </header>

          {reason === 'google_no_account' && (
            <p className={`${styles.notice} ${styles.info}`} role='status'>
              Такого Google-аккаунта у нас ещё нет — вы можете
              зарегистрироваться сейчас.
            </p>
          )}

          <form
            onSubmit={handleSubmit(onSubmit, onError)}
            className={`${styles.form} ${formState.shake ? styles.isShaking : ''}`}
            onAnimationEnd={() => formState.shake && setFormState(prev => ({ ...prev, shake: false }))}
            noValidate
            autoComplete='on'
            aria-describedby={formState.error ? 'form-error' : undefined}
          >
            {/* Email Field */}
            <div className={styles.inputGroup}>
              <label htmlFor='email' className={styles.label}>
                Email
              </label>
              <input
                id='email'
                type='email'
                inputMode='email'
                autoComplete='email'
                placeholder='Введите свой email'
                className={`${styles.input} ${
                  errors.email ? styles.invalid : watch('email') ? styles.valid : ''
                }`}
                {...register('email')}
                aria-invalid={!!errors.email}
              />
            </div>

            {/* Username Field */}
            <div className={styles.inputGroup}>
              <div className={styles.usernameHeader}>
                <label htmlFor='username' className={styles.label}>
                  Username
                </label>
                <button
                  type='button'
                  onClick={handleGenerateUsername}
                  disabled={generating || formState.genCooldown}
                  className={styles.generateBtn}
                  title={
                    isWasmSupported
                      ? 'Сгенерировать ник с помощью WebAssembly'
                      : 'Сгенерировать случайный ник'
                  }
                >
                  {generating ? 'Генерируем…' : 'Сгенерировать'}
                </button>
              </div>

              <input
                id='username'
                type='text'
                autoComplete='username'
                placeholder='Придумайте ник (3–20, a–Z, 0–9, _ )'
                className={`${styles.input} ${
                  errors.username ? styles.invalid : username ? styles.valid : ''
                }`}
                {...register('username')}
                aria-invalid={!!errors.username}
                aria-describedby='user-hint'
              />

              {errors.username ? (
                <p className={styles.errorText}>{errors.username.message}</p>
              ) : (
                <p id='user-hint' className={styles.pwHint}>
                  Доступны латиница, цифры и подчёркивание. Длина — 3–20 символов.
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className={styles.inputGroup}>
              <label htmlFor='password' className={styles.label}>
                Пароль
              </label>
              <div className={styles.inputWrap}>
                <input
                  id='password'
                  type={formState.showPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  placeholder='Введите пароль (≥8)'
                  className={`${styles.input} ${
                    errors.password ? styles.invalid : password ? styles.valid : ''
                  }`}
                  {...register('password')}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  aria-invalid={!!errors.password}
                />
                <button
                  type='button'
                  className={styles.toggleBtn}
                  onClick={togglePasswordVisibility}
                  title={formState.showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {formState.showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {errors.password && (
                <p className={styles.errorText}>{errors.password.message}</p>
              )}

              {renderPasswordStrength}
              {renderCapsLockWarning}
            </div>

            {/* Confirm Password Field */}
            <div className={styles.inputGroup}>
              <label htmlFor='confirm' className={styles.label}>
                Подтвердите пароль
              </label>
              <div className={styles.inputWrap}>
                <input
                  id='confirm'
                  type={formState.showConfirmPassword ? 'text' : 'password'}
                  autoComplete='new-password'
                  placeholder='Повторите пароль'
                  className={`${styles.input} ${
                    errors.confirm ? styles.invalid : confirm ? styles.valid : ''
                  }`}
                  {...register('confirm')}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                />
                <button
                  type='button'
                  className={styles.toggleBtn}
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {formState.showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {renderPasswordMatch}
            </div>

            <button
              type='submit'
              className={`${styles.button} ${isSubmitting ? styles.loading : ''}`}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Создаём аккаунт' : 'СОЗДАТЬ АККАУНТ'}
            </button>

            {formState.error && (
              <p id='form-error' className={styles.error} role='alert'>
                {formState.error}
              </p>
            )}
          </form>

          <p className={styles.swap}>
            Уже есть аккаунт?{' '}
            <Link href='/login' className={styles.link}>
              Войти
            </Link>
          </p>

          {formState.mounted && googleEnabled && (
            <>
              <div
                className={styles.hr}
                role='separator'
                aria-label='Или через Google'
              >
                <span>Или через Google</span>
              </div>
              <div className={styles.oauthBlock}>
                <GoogleAuthButton mode='register' label='Продолжить с Google' />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}