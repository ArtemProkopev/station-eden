// apps/web/src/app/profile/CopyButton.tsx
'use client'

import { useRef, useState } from 'react'
import styles from '../page.module.css';

const ICONS = {
  copy: '/icons/copy.svg'
}

const FALLBACKS = {
  copy: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="#63EFFF" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="#63EFFF" strokeWidth="2"/>
    </svg>
  )
}

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const [iconOk, setIconOk] = useState(true)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)

      const btn = btnRef.current
      if (btn) {
        btn.classList.remove(styles.spark)
        void btn.getBoundingClientRect()
        btn.classList.add(styles.spark)
        const onEnd = () => btn.classList.remove(styles.spark)
        btn.addEventListener('animationend', onEnd, { once: true })
      }

      setTimeout(() => setCopied(false), 1100)
    } catch {}
  }

  return (
    <>
      <button
        ref={btnRef}
        type='button'
        onClick={copy}
        className={styles.copyBtn}
        aria-live='polite'
        aria-label={copied ? 'Скопировано' : 'Скопировать ID'}
        title="Скопировать ID"
      >
        {copied ? (
          <span className={styles.copiedText}>✓</span>
        ) : (
          iconOk ? (
            <img
              src={ICONS.copy}
              alt=""
              className={styles.copyIcon}
              onError={() => setIconOk(false)}
            />
          ) : (
            FALLBACKS.copy
          )
        )}
        <span className={styles.sp1} aria-hidden />
        <span className={styles.sp2} aria-hidden />
        <span className={styles.sp3} aria-hidden />
      </button>
      <span className='sr-only' aria-live='polite'>
        {copied ? 'ID скопирован в буфер обмена' : ''}
      </span>
    </>
  )
}
