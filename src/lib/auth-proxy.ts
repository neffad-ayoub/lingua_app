import { decode } from 'next-auth/jwt';

// Each cookie name's salt is the cookie name itself (with __Secure- prefix on HTTPS)
const cookieConfigs = [
  { name: '__Secure-authjs.session-token', salt: '__Secure-authjs.session-token' },
  { name: '__Secure-next-auth.session-token', salt: '__Secure-next-auth.session-token' },
  { name: 'authjs.session-token', salt: 'authjs.session-token' },
  { name: 'next-auth.session-token', salt: 'next-auth.session-token' },
];

export async function getSessionFromCookie(request: Request) {
  const cookies = request.headers.get('cookie') || '';
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  for (const { name, salt } of cookieConfigs) {
    const match = cookies.split(';').find(c => c.trim().startsWith(name));
    if (!match) continue;

    const token = match.split('=').slice(1).join('=').trim();
    if (!token) continue;

    try {
      const decoded = await decode({ token, secret, salt });
      if (decoded?.sub) return { user: { id: decoded.sub } };
    } catch {
      continue;
    }
  }

  return null;
}
