import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blockerId, blockedId } = body;

    if (!blockerId || !blockedId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const block = await prisma.block.create({
      data: { blockerId, blockedId },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const blockerId = searchParams.get('blockerId');
  const blockedId = searchParams.get('blockedId');

  if (!blockerId || !blockedId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
