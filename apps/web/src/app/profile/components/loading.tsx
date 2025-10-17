import styles from '../page.module.css';

export default function Loading() {
	return (
		<div className={styles.scene}>
			<div className={styles.panel}>
				<div className={styles.grid}>
					<aside className={styles.side}>
						<div className={styles.avatarPlaceholder} />
						<div className={styles.emailSkeleton} />
					</aside>
					<section className={styles.main}>
						<h1 className={styles.title}>Профиль</h1>
						<div className={styles.skel} aria-hidden />
					</section>
				</div>
			</div>
		</div>
	)
}
