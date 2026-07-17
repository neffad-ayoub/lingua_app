import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: { select: { id: true, name: true, image: true } },
        language: true,
        comments: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authorId, content, languageId, postId } = body;

    if (!authorId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (postId) {
      const comment = await prisma.postComment.create({
        data: { postId, authorId, content },
        include: { author: { select: { id: true, name: true, image: true } } },
      });
      return NextResponse.json({ comment }, { status: 201 });
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        content,
        languageId: languageId || null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        language: true,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
