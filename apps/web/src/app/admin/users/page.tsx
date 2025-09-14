'use client';
import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';
import { useRouter } from 'next/navigation';

type Row = { id: string; email: string; role?: string; createdAt?: string };

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      // проверим/обновим сессию
      try { await api.me(); } catch { await api.refresh(); }
      const list = await api.users();
      setRows((list as any).data ?? list);
      setErr(null);
    } catch (e:any) {
      const msg = e?.message || '';
      if (msg.includes('No refresh') || msg.includes('401')) {
        router.replace('/login?next=/admin/users');
        return;
      }
      // пытаемся распарсить красивую ошибку от бэка
      try {
        const obj = JSON.parse(msg);
        if (obj?.code === 'ADMIN_ONLY') {
          setErr('Доступ ограничен: эта страница только для администратора станции.');
        } else if (obj?.message) {
          setErr(obj.message);
        } else {
          setErr('Нет доступа к этой странице.');
        }
      } catch {
        setErr('Нет доступа к этой странице.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id: string) {
    if (!confirm('Удалить пользователя?')) return;
    try { await api.deleteUser(id); await load(); }
    catch (e:any) { alert(e.message || 'Ошибка удаления'); }
  }

  if (loading) return <div className="card"><p>Загрузка…</p></div>;
  if (err) return (
    <div className="card">
      <h2 className="title">Участники станции</h2>
      <p style={{color:'salmon', marginBottom: 8}}>{err}</p>
      <button className="btn" onClick={()=>router.replace('/profile')}>Вернуться в профиль</button>
    </div>
  );

  return (
    <div className="card">
      <h2 className="title">Участники станции</h2>
      <table className="table">
        <thead><tr><th>Email</th><th>Роль</th><th>Создан</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.email}</td>
              <td>{r.role || 'user'}</td>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn danger" onClick={() => onDelete(r.id)}>Удалить</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} style={{opacity:.7}}>Никого нет</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
