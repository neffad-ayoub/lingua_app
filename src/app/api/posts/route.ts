import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

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
        likes: userId
          ? { where: { userId }, take: 1 }
          : false,
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const postsWithLikes = posts.map(({ likes, _count, ...rest }) => ({
      ...rest,
      likeCount: _count.likes,
      likedByMe: Array.isArray(likes) ? likes.length > 0 : false,
    }));

    return NextResponse.json({ posts: postsWithLikes });
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

    let resolvedLanguageId = languageId || null;
    if (resolvedLanguageId) {
      const lang = await prisma.language.findUnique({ where: { code: resolvedLanguageId }, select: { id: true } });
      resolvedLanguageId = lang?.id || null;
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        content,
        languageId: resolvedLanguageId,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        language: true,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create post';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
