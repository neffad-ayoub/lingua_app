import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    OR: [{ ownerId: userId }, { guestId: userId }],
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
    const body = await request.json();
    const { meetingId, status, guestId } = body;

    if (!meetingId || !status) {
      return NextResponse.json({ error: 'meetingId and status are required' }, { status: 400 });
    }

    const meeting = await prisma.meeting.update({
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

    return NextResponse.json({ meeting });
  } catch {
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerId, guestId, title, languageId, scheduledAt } = body;

    if (!ownerId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const meeting = await prisma.meeting.create({
      data: {
        ownerId,
        guestId: guestId || null,
        title: title || null,
        languageId: languageId || null,
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
