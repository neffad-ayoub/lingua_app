import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {},
      async authorize() { return null; },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  trustHost: true,
});

export default async function middleware(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/discover/:path*', '/chat/:path*', '/video/:path*', '/meetings/:path*', '/feed/:path*', '/settings/:path*'],
};
