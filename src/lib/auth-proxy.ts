import { decode } from 'next-auth/jwt';

const cookieNames = [
  '__Secure-authjs.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  'next-auth.session-token',
];
const salt = 'authjs.session-token';

export async function getSessionFromCookie(request: Request) {
  const cookies = request.headers.get('cookie') || '';

  for (const cookieName of cookieNames) {
    const match = cookies.split(';').find(c => c.trim().startsWith(cookieName));
    if (!match) continue;

    const token = match.split('=').slice(1).join('=').trim();
    if (!token) continue;

    try {
      const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET!, salt });
      if (decoded?.sub) return { user: { id: decoded.sub } };
    } catch {
      continue;
    }
  }

  return null;
}
