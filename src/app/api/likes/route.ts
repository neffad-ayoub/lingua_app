import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { postId, userId } = await request.json();
    if (!postId || !userId) {
      return NextResponse.json({ error: 'postId and userId are required' }, { status: 400 });
    }

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }

    await prisma.postLike.create({ data: { postId, userId } });
    return NextResponse.json({ liked: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  const userId = searchParams.get('userId');

  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  try {
    const [likes, userLiked] = await Promise.all([
      prisma.postLike.count({ where: { postId } }),
      userId
        ? prisma.postLike.findUnique({ where: { postId_userId: { postId, userId } } }).then(Boolean)
        : Promise.resolve(false),
    ]);

    return NextResponse.json({ likes, userLiked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
  }
}
