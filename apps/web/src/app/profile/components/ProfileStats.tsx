'use client';

import styles from '../page.module.css';

interface StatCardProps {
  label: string;
  value: string;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <article className={styles.statCard}>
    <h4 className={styles.statLabel}>{label}</h4>
    <p className={styles.statValue}>{value}</p>
  </article>
);

export const ProfileStats = () => {
  const stats = [
    { label: 'завершено миссий', value: '47' },
    { label: 'время на станции', value: '134 ч' },
  ];

  return (
    <section 
      className={styles.statsSection} 
      aria-labelledby='user-stats'
    >
      <h3 id='user-stats' className={styles.visuallyHidden}>
        Статистика пользователя
      </h3>
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </section>
  );
};