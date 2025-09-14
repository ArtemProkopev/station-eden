const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(c => c.startsWith(name + '='))?.split('=')[1] ?? null;
}

async function fetchJSON<T>(path: string, init?: RequestInit & { csrf?: boolean }) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (init?.csrf) {
    const token = getCookie('csrf_token');
    if (token) headers['x-csrf-token'] = token;
  }
  const res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function ensureCsrf() {
  await fetchJSON('/auth/csrf', { method: 'GET' });
}

export const api = {
  // auth
  register: async (email: string, password: string) => {
    await ensureCsrf();
    return fetchJSON('/auth/register', { method: 'POST', csrf: true, body: JSON.stringify({ email, password }) });
  },
  login: async (email: string, password: string) => {
    await ensureCsrf();
    return fetchJSON('/auth/login', { method: 'POST', csrf: true, body: JSON.stringify({ email, password }) });
  },
  me: async () => fetchJSON('/auth/me', { method: 'GET' }),
  refresh: async () => {
    await ensureCsrf();
    return fetchJSON('/auth/refresh', { method: 'POST', csrf: true, body: '{}' });
  },
  logout: async () => {
    await ensureCsrf();
    return fetchJSON('/auth/logout', { method: 'POST', csrf: true, body: '{}' });
  },

  // admin users
  users: async () => fetchJSON('/users', { method: 'GET' }),
  deleteUser: async (id: string) => {
    await ensureCsrf();
    return fetchJSON(`/users/${id}`, { method: 'DELETE', csrf: true, body: '{}' });
  },
};
