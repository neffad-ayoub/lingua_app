import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateRoomCode } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerId, guestId, languageId } = body;

    let resolvedLanguageId = languageId || null;
    if (resolvedLanguageId) {
      const lang = await prisma.language.findUnique({ where: { code: resolvedLanguageId }, select: { id: true } });
      resolvedLanguageId = lang?.id || null;
    }

    const meeting = await prisma.meeting.create({
      data: {
        ownerId: ownerId || 'anonymous',
        guestId: guestId || null,
        languageId: resolvedLanguageId,
        roomCode: generateRoomCode(),
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      roomCode: meeting.roomCode,
      meetingId: meeting.id,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || code.length < 6) {
    return NextResponse.json({ error: 'Valid room code is required' }, { status: 400 });
  }

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { roomCode: code.toUpperCase() },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        language: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ meeting });
  } catch {
    return NextResponse.json({ error: 'Failed to find room' }, { status: 500 });
  }
}
