import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blockedId } = body;

    if (!blockedId) {
      return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
    }

    const block = await prisma.block.create({
      data: { blockerId: session.user.id, blockedId },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const blockedId = searchParams.get('blockedId');

  if (!blockedId) {
    return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
  }

  try {
    await prisma.block.deleteMany({
      where: { blockerId: session.user.id, blockedId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
