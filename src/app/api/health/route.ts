import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { handlers, signIn, signOut, auth } from '@/lib/auth';

export async function GET() {
  const envInfo: Record<string, string> = {};
  const authEnvVars = ['AUTH_SECRET', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'AUTH_URL',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'DATABASE_URL'];
  for (const key of authEnvVars) {
    envInfo[key] = process.env[key] ? `${process.env[key]!.substring(0, 8)}...` : 'undefined';
  }

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ db: true, result, env: envInfo });
  } catch (e) {
    return NextResponse.json({
      db: false,
      env: envInfo,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    }, { status: 500 });
  }
}