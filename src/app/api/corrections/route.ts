import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, authorId, original, corrected, note } = body;

    if (!messageId || !authorId || !original || !corrected) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const correction = await prisma.correction.create({
      data: {
        messageId,
        authorId,
        original,
        corrected,
        note: note || null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create correction' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }

  try {
    const corrections = await prisma.correction.findMany({
      where: { messageId },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ corrections });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch corrections' }, { status: 500 });
  }
}
