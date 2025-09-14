'use client';
import { useState } from 'react';
import { api } from '@/src/lib/api';
import Link from 'next/link';

export default function RegisterPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null); const [ok,setOk]=useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.register(email, password);
      setOk(true);
    } catch (err:any) { setError(err.message || 'Ошибка'); }
  }

  return (
    <div>
      <h2>Регистрация</h2>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:8 }}>
        <input required type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" placeholder="пароль (≥8)" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Создать аккаунт</button>
      </form>
      {ok && <p>Готово! Теперь <Link href="/login">войдите</Link>.</p>}
      {error && <p style={{color:'crimson'}}>{error}</p>}
      <p><Link href="/login">У меня есть аккаунт</Link></p>
    </div>
  );
}
