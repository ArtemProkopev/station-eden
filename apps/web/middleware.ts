import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = { matcher: ['/profile'] };

export async function middleware(req: NextRequest) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
    const res = await fetch(apiBase + '/auth/me', {
      headers: { cookie: req.headers.get('cookie') || '' },
      credentials: 'include'
    });
    if (res.ok) return NextResponse.next();
  } catch {}
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', '/profile');
  return NextResponse.redirect(url);
}
