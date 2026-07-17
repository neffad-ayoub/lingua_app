import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextRequest } from 'next/server';

const { auth: handler } = NextAuth({
  providers: [
    Credentials({
      credentials: {},
      async authorize() { return null; },
    }),
  ],
  session: { strategy: 'jwt' },
  trustHost: true,
});

export function auth(req: NextRequest) {
  return handler(req);
}
