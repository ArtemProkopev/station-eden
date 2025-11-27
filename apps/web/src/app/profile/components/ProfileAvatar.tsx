'use client';

import ImgCdn from '@/components/ImgCdn';
import { PROFILE_CONFIG } from '../config';
import { asset } from '@/lib/asset';
import styles from '../page.module.css';

interface ProfileAvatarProps {
  avatar: string;
  frame: string;
  username?: string | null;
}

export const ProfileAvatar = ({ avatar, frame, username }: ProfileAvatarProps) => {
  return (
    <section 
      className={styles.avatarSection}
      aria-labelledby='user-handle'
    >
      <div className={styles.avatarWrapper}>
        <div className={styles.leavesWrapper}>
          <img
            src={asset(PROFILE_CONFIG.ASSETS.DECOR.leaves)}
            alt=''
            role='presentation'
            className={styles.leavesImage}
          />
        </div>
        <div className={styles.avatarFrameContainer}>
          <div className={styles.avatarImageContainer}>
            <ImgCdn
              src={avatar}
              alt={`Аватар пользователя ${username || ''}`}
              className={styles.avatar}
            />
          </div>
          <ImgCdn
            src={frame}
            alt='Рамка профиля'
            className={styles.frame}
          />
        </div>
      </div>

      <h2 id='user-handle' className={styles.handle}>
        @{username ?? 'Никнейм'}
      </h2>
    </section>
  );
};