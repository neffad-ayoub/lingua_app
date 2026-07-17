import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang');
  const level = searchParams.get('level');
  const search = searchParams.get('search');
  const online = searchParams.get('online');

  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (lang || level) {
    const langFilter: Record<string, unknown> = {};
    if (lang) langFilter.language = { code: lang };
    if (level) langFilter.proficiency = level;
    where.userLanguages = { some: langFilter };
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        profile: { select: { country: true, city: true } },
        userLanguages: {
          include: { language: true },
          orderBy: { isNative: 'desc' },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, bio, country, city, showMap } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ?? undefined,
        bio: bio ?? undefined,
        profile: {
          upsert: {
            create: { country, city, showMap: showMap ?? false },
            update: { country, city, showMap: showMap ?? undefined },
          },
        },
      },
      select: { id: true, name: true, bio: true, profile: true },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
