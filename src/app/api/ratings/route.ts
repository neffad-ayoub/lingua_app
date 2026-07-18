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
    const { meetingId, userId, score, comment } = body;

    if (!meetingId || !userId || !score) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (score < 1 || score > 5) {
      return NextResponse.json({ error: 'Score must be between 1 and 5' }, { status: 400 });
    }

    const rating = await prisma.rating.create({
      data: {
        meetingId,
        userId,
        givenById: session.user.id,
        score,
        comment: comment || null,
      },
    });

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const ratings = await prisma.rating.findMany({
      where: { userId },
      include: {
        givenBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const avgScore = ratings.reduce((acc, r) => acc + r.score, 0) / (ratings.length || 1);

    return NextResponse.json({
      ratings,
      averageScore: Math.round(avgScore * 10) / 10,
      totalRatings: ratings.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}
