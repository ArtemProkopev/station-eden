// apps/web/src/app/page.tsx
import styles from './home.module.css'

export const metadata = {
<<<<<<< HEAD
  title: 'Station Eden — Главная',
  description: 'Добро пожаловать на Station Eden',
}

export default function HomePage() {
  return (
    <>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <section className={styles.card}>
          <h1 className={styles.title}>Station Eden</h1>
          <p className={styles.subtitle}>
            Добро пожаловать на главную страницу
          </p>
          <p className={styles.welcomeText}>
            Сайт находится в разработке. Скоро здесь появится больше контента!
          </p>
        </section>
      </div>
    </>
  )
=======
	title: 'Station Eden — Главная',
	description: 'Стартовая страница в разработке',
}

export default function HomePage() {
	return (
		<>
			<div className={styles.bg} aria-hidden />
			<div className={styles.container}>
				<section className={styles.card}>
					<h1 className={styles.title}>Station Eden</h1>
					<p className={styles.subtitle}>
						Стартовая страница на этапе разработки
					</p>
					<div className={styles.big404}>404</div>
				</section>
			</div>
		</>
	)
>>>>>>> origin/main
}
