import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {
    OR: [{ ownerId: session.user.id }, { guestId: session.user.id }],
  };

  if (status) {
    where.status = status.toUpperCase();
  }

  try {
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, image: true } },
        guest: { select: { id: true, name: true, image: true } },
        language: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, status, guestId } = body;

    if (!meetingId || !status) {
      return NextResponse.json({ error: 'meetingId and status are required' }, { status: 400 });
    }

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    if (meeting.ownerId !== session.user.id && meeting.guestId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status,
        ...(guestId ? { guestId } : {}),
        ...(status === 'ACTIVE' ? { startedAt: new Date() } : {}),
        ...(status === 'COMPLETED' || status === 'CANCELLED' ? { endedAt: new Date() } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        guest: { select: { id: true, name: true } },
        language: true,
      },
    });

    return NextResponse.json({ meeting: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guestId, title, languageId, scheduledAt } = body;

    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
    }

    let resolvedLanguageId = languageId || null;
    if (resolvedLanguageId) {
      const lang = await prisma.language.findUnique({ where: { code: resolvedLanguageId }, select: { id: true } });
      resolvedLanguageId = lang?.id || null;
    }

    const meeting = await prisma.meeting.create({
      data: {
        ownerId: session.user.id,
        guestId: guestId || null,
        title: title || null,
        languageId: resolvedLanguageId,
        scheduledAt: new Date(scheduledAt),
        roomCode: generateRoomCode(),
      },
      include: {
        owner: { select: { id: true, name: true } },
        guest: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
