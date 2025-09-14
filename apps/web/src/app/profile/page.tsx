'use client';
import { useEffect, useState } from 'react';
import { api } from '@/src/lib/api';

export default function ProfilePage() {
  const [me,setMe]=useState<any>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    (async ()=>{
      try {
        const r = await api.me();
        setMe((r as any).data ?? r);
      } catch {
        try {
          await api.refresh();
          const r2 = await api.me();
          setMe((r2 as any).data ?? r2);
        } catch(e:any) {
          setErr('Не авторизован');
        }
      }
    })();
  },[]);

  if (err) return <div className="card"><p>{err}</p></div>;
  if (!me) return <div className="card"><p>Загрузка…</p></div>;

  return (
    <div className="card">
      <h2 className="title">Профиль</h2>
      <div className="kv">
        <div><span>ID</span><code>{me.userId}</code></div>
        <div><span>Email</span><code>{me.email}</code></div>
      </div>
      <div className="row" style={{marginTop:12}}>
        <button className="btn danger" onClick={async ()=>{ await api.logout(); location.href='/login'; }}>
          Выйти
        </button>
      </div>
    </div>
  );
}
