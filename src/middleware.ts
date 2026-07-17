export { middleware } from '@/lib/auth-middleware';

export const config = {
  matcher: ['/discover/:path*', '/chat/:path*', '/video/:path*', '/meetings/:path*', '/feed/:path*', '/settings/:path*'],
};
