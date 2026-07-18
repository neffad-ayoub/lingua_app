import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email: rawEmail, password: rawPassword } = body;
    const email = String(rawEmail).toLowerCase().trim();
    const password = String(rawPassword);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ step: 'findUnique', found: false, email });
    }

    const isValid = await bcrypt.compare(password, user.password!);
    return NextResponse.json({
      step: 'bcrypt',
      found: true,
      hasPassword: !!user.password,
      isValid,
      userId: user.id,
    });
  } catch (e) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    }, { status: 500 });
  }
}