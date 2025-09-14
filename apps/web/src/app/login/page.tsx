'use client';
import { useState } from 'react';
import { api } from '@/src/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState<string|null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/profile';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.login(email, password);
      router.replace(next);
    } catch (err:any) {
      setError(err.message || 'Ошибка входа');
    }
  }

  const tgEnabled = process.env.NEXT_PUBLIC_ENABLE_TELEGRAM === 'true';

  return (
    <div>
      <h2>Вход</h2>
      <form onSubmit={onSubmit} style={{ display:'grid', gap:8 }}>
        <input required type="email" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" placeholder="пароль" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Войти</button>
      </form>
      {error && <p style={{color:'crimson'}}>{error}</p>}
      <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>

      {tgEnabled && (
        <>
          <hr/>
          <p>Или войти через Telegram (см. backend /auth/telegram/callback)</p>
        </>
      )}
    </div>
  );
}
