import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let calleeId: string;
    try {
      const body = await request.json();
      calleeId = body.calleeId;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!calleeId) {
      return NextResponse.json({ error: 'calleeId is required' }, { status: 400 });
    }

    const roomCode = generateRoomCode();

    const call = await prisma.meeting.create({
      data: {
        ownerId: session.user.id,
        guestId: calleeId,
        roomCode,
        status: 'PENDING',
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        guest: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ call }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const incoming = searchParams.get('incoming') === 'true';

  try {
    if (incoming) {
      const calls = await prisma.meeting.findMany({
        where: {
          guestId: session.user.id,
          status: 'PENDING',
          scheduledAt: null,
        },
        include: {
          owner: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return NextResponse.json({ calls });
    }

    const calls = await prisma.meeting.findMany({
      where: {
        OR: [{ ownerId: session.user.id }, { guestId: session.user.id }],
        scheduledAt: null,
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        guest: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ calls });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
