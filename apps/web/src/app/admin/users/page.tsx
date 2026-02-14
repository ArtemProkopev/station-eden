// apps/web/src/app/admin/users/page.tsx
'use client'

import { api } from '@/src/lib/api'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

type Row = { id: string; email: string; role?: string; createdAt?: string }

function isRecord(v: unknown): v is Record<string, unknown> {
	return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isRow(v: unknown): v is Row {
	if (!isRecord(v)) return false
	return typeof v.id === 'string' && typeof v.email === 'string'
}

function unwrapRows(input: unknown): Row[] {
	if (Array.isArray(input)) return input.filter(isRow)
	if (isRecord(input) && Array.isArray(input.data))
		return input.data.filter(isRow)
	return []
}

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
				(r.role ?? 'user').toLowerCase().includes(s),
		)
	}, [rows, q])

	const load = useCallback(async () => {
		setLoading(true)
		try {
			try {
				await api.me()
			} catch {
				await api.refresh()
			}

			const list = await api.users()
			setRows(unwrapRows(list))
			setErr(null)
		} catch (e: unknown) {
			const msg =
				e instanceof Error ? e.message : typeof e === 'string' ? e : ''

			if (msg.includes('No refresh') || msg.includes('401')) {
				router.replace('/login?next=/admin/users')
				return
			}

			try {
				const obj = JSON.parse(msg) as unknown
				if (isRecord(obj) && obj.code === 'ADMIN_ONLY') {
					setErr(
						'Доступ ограничен: эта страница только для администратора станции.',
					)
				} else if (isRecord(obj) && typeof obj.message === 'string') {
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
	}, [router])

	useEffect(() => {
		load()
	}, [load])

	const onDelete = useCallback(
		async (id: string) => {
			if (!confirm('Удалить пользователя?')) return
			try {
				await api.deleteUser(id)
				await load()
			} catch (e: unknown) {
				const msg =
					e instanceof Error ? e.message : typeof e === 'string' ? e : undefined
				alert(msg || 'Ошибка удаления')
			}
		},
		[load],
	)

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
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setQ(e.target.value)
									}
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
