import styles from './home.module.css'
import { Fireflies } from '../components/ui/Fireflies/FirefliesMain'
import PanelWithPlayButton from '../components/ui/PanelWithPlayButton/PanelWithPlayButton'

export const metadata = {
  title: 'Station Eden — Главная',
  description: 'Добро пожаловать на Station Eden',
}

export default function HomePage() {
  return (
    <>
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgFx} aria-hidden />
      
      <Fireflies />

      <div className={styles.container}>
        {/* Левая часть - заголовок */}
        <section className={styles.stationTitle}>
          <div className={styles.titleLine}>СТАНЦИЯ</div>
          <div className={styles.titleLineEden}>ЭДЕМ</div>
        </section>

        {/* Правая часть - кнопки меню */}
        <section className={styles.menuSection}>
          <nav className={styles.sideMenu}>
            <button className={styles.menuItem}>ПРОФИЛЬ</button>
            <button className={styles.menuItem}>НАСТРОЙКИ</button>
            <button className={styles.menuItem}>ВЫЙТИ</button>
          </nav>

          {/* Используем отдельный компонент для панели с кнопкой Play */}
          <PanelWithPlayButton />
        </section>
      </div>
    </>
  )
}
