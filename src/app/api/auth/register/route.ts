import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  nativeLang: z.string().optional(),
  learnLangs: z.array(z.string()).optional(),
  proficiency: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, password, nativeLang, learnLangs, proficiency } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Resolve language codes to CUIDs
    const langCodes = [...(nativeLang ? [nativeLang] : []), ...(learnLangs || [])];
    const languages = await prisma.language.findMany({
      where: { code: { in: langCodes } },
      select: { id: true, code: true },
    });
    const langMap = new Map(languages.map((l) => [l.code, l.id]));

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        profile: { create: {} },
        userLanguages: {
          create: [
            ...(nativeLang && langMap.has(nativeLang)
              ? [{ languageId: langMap.get(nativeLang)!, isNative: true, proficiency: 'NATIVE' as const }]
              : []),
            ...(learnLangs
            ?.map((langCode) => {
              const lid = langMap.get(langCode);
              return lid ? {
                languageId: lid,
                isNative: false,
                proficiency: (proficiency || 'B1') as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'NATIVE',
              } : null;
            })
            .filter((x): x is NonNullable<typeof x> => x != null) || []),
          ],
        },
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
