'use client'
import { api } from '@/src/lib/api'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

type Row = { id: string; email: string; role?: string; createdAt?: string }

export default function AdminUsersPage() {
	const [rows, setRows] = useState<Row[]>([])
	const [err, setErr] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [q, setQ] = useState('')
	const router = useRouter()

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase()
		if (!s) return rows
		return rows.filter(
			r =>
				r.email.toLowerCase().includes(s) ||
				(r.role ?? 'user').toLowerCase().includes(s)
		)
	}, [rows, q])

	async function load() {
		setLoading(true)
		try {
			try {
				await api.me()
			} catch {
				await api.refresh()
			}
			const list = await api.users()
			setRows((list as any).data ?? list)
			setErr(null)
		} catch (e: any) {
			const msg = e?.message || ''
			if (msg.includes('No refresh') || msg.includes('401')) {
				router.replace('/login?next=/admin/users')
				return
			}
			try {
				const obj = JSON.parse(msg)
				if (obj?.code === 'ADMIN_ONLY') {
					setErr(
						'Доступ ограничен: эта страница только для администратора станции.'
					)
				} else if (obj?.message) {
					setErr(obj.message)
				} else {
					setErr('Нет доступа к этой странице.')
				}
			} catch {
				setErr('Нет доступа к этой странице.')
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
	}, [])

	async function onDelete(id: string) {
		if (!confirm('Удалить пользователя?')) return
		try {
			await api.deleteUser(id)
			await load()
		} catch (e: any) {
			alert(e?.message || 'Ошибка удаления')
		}
	}

	return (
		<div className={styles.scene}>
			<div className={styles.panel}>
				<div className={styles.inner}>
					<div className={styles.header}>
						<h1 className={styles.title}>Участники станции</h1>

						<div className={styles.rightSide}>
							<span className={styles.counter}>Всего: {rows.length}</span>
							<div className={styles.searchWrap}>
								<input
									type='search'
									className={styles.search}
									placeholder='Поиск по email или роли…'
									value={q}
									onChange={e => setQ(e.target.value)}
									aria-label='Поиск пользователей'
								/>
							</div>
						</div>
					</div>

					{loading && <div className={styles.loader} aria-hidden />}

					{err && !loading && (
						<div className={styles.errorBox} role='alert'>
							<p style={{ margin: 0, marginBottom: 8 }}>{err}</p>
							<button
								className={styles.btnText}
								onClick={() => router.replace('/profile')}
							>
								Вернуться в профиль
							</button>
						</div>
					)}

					{!err && !loading && (
						<div className={styles.cardLike}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Email</th>
										<th>Роль</th>
										<th>Создан</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{filtered.map(r => (
										<tr key={r.id}>
											<td data-th='Email'>{r.email}</td>
											<td data-th='Роль'>{r.role || 'user'}</td>
											<td data-th='Создан'>
												{r.createdAt
													? new Date(r.createdAt).toLocaleString()
													: '—'}
											</td>
											<td data-th='' style={{ textAlign: 'right' }}>
												<button
													className={styles.btnText}
													onClick={() => onDelete(r.id)}
												>
													Удалить
												</button>
											</td>
										</tr>
									))}
									{filtered.length === 0 && (
										<tr>
											<td colSpan={4} className={styles.empty}>
												Никого нет
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
