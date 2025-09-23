// apps/web/src/app/not-found.tsx
import styles from './not-found.module.css'

export const metadata = {
  title: 'Station Eden — Страница не найдена',
  description: 'Запрашиваемая страница не существует',
}

export default function NotFound() {
  return (
    <>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <section className={styles.card}>
          <h1 className={styles.title}>Station Eden</h1>
          <p className={styles.subtitle}>
            Страница не найдена
          </p>
          <div className={styles.big404}>404</div>
          <p className={styles.description}>
            Запрашиваемая страница не существует или была перемещена
          </p>
          <a href="/" className={styles.homeLink}>
            Вернуться на главную
          </a>
        </section>
      </div>
    </>
  )
}