'use client';

import { ProfileData } from '../types';
import CopyButton from './CopyButton';
import styles from '../page.module.css';

interface ProfileInfoProps {
  profile: ProfileData;
}

const formatId = (id: string): string => id.replace(/-/g, '\u2009–\u2009');

export const ProfileInfo = ({ profile }: ProfileInfoProps) => {
  return (
    <section 
      className={styles.infoSection}
      aria-labelledby='profile-info'
    >
      <h3 id='profile-info' className={styles.visuallyHidden}>
        Информация профиля
      </h3>

      <div className={styles.loginCard}>
        <p className={styles.loginCaption}>Входит как</p>
        <p className={styles.loginEmail}>
          {profile.email ?? 'example@mail.ru'}
        </p>

        <div className={styles.idSection}>
          <div className={styles.idHeader}>
            <span className={styles.idLabel}>Игровой ID:</span>
            {profile.status === 'ok' && profile.userId && (
              <CopyButton value={profile.userId} />
            )}
          </div>
          {profile.status === 'ok' && profile.userId && (
            <output className={styles.idBadge} htmlFor='user-id'>
              {formatId(profile.userId)}
            </output>
          )}
        </div>

        <p className={styles.hint}>
          Используйте ID для поддержки и входа в игровые лобби.
        </p>
      </div>
    </section>
  );
};