import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || session.user.id;

  try {
    const availability = await prisma.availability.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
    });

    return NextResponse.json({ availability });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slots } = body as {
      slots: { dayOfWeek: number; startHour: number; endHour: number }[];
    };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'slots array is required' }, { status: 400 });
    }

    for (const s of slots) {
      if (s.dayOfWeek < 0 || s.dayOfWeek > 6 || s.startHour < 0 || s.startHour > 23 || s.endHour < 0 || s.endHour > 23 || s.startHour >= s.endHour) {
        return NextResponse.json({ error: `Invalid slot: day ${s.dayOfWeek} ${s.startHour}-${s.endHour}` }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { userId: session.user.id } });
      if (slots.length > 0) {
        await tx.availability.createMany({
          data: slots.map((s) => ({
            userId: session.user.id!,
            dayOfWeek: s.dayOfWeek,
            startHour: s.startHour,
            endHour: s.endHour,
          })),
        });
      }
    });

    const availability = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
    });

    return NextResponse.json({ availability });
  } catch {
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
