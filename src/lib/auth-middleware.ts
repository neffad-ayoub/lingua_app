import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';

const { auth: handler } = NextAuth({
  session: { strategy: 'jwt' },
  trustHost: true,
});

export function auth(req: NextRequest) {
  return handler(req);
}
