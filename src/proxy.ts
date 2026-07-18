import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/auth-proxy';

export async function proxy(request: NextRequest) {
  const session = await getSessionFromCookie(request);
  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password).*)'],
};
