import { decode } from 'next-auth/jwt';

export async function getSessionFromCookie(request: Request) {
  const cookies = request.headers.get('cookie') || '';
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
  const match = cookies.split(';').find(c => c.trim().startsWith(cookieName));
  if (!match) return null;

  const token = match.split('=').slice(1).join('=').trim();
  if (!token) return null;

  try {
    const decoded = await decode({ token, secret: process.env.NEXTAUTH_SECRET! });
    if (!decoded || !decoded.sub) return null;
    return { user: { id: decoded.sub } };
  } catch {
    return null;
  }
}
