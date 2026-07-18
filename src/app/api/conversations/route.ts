import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId: session.user.id } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const userId = session.user.id;
    const formatted = await Promise.all(conversations.map(async (conv) => {
      const member = conv.members.find((m) => m.user.id === userId);
      const lastReadAt = member?.lastReadAt || new Date(0);

      const unread = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: { gt: lastReadAt },
        },
      });

      const otherMember = conv.members.find((m) => m.user.id !== userId);
      return {
        id: conv.id,
        name: conv.name || otherMember?.user.name || 'Unknown',
        image: otherMember?.user.image || null,
        lastMessage: conv.messages[0]?.content || null,
        lastMessageAt: conv.messages[0]?.createdAt || null,
        unread,
        isGroup: conv.isGroup,
      };
    }));

    return NextResponse.json({ conversations: formatted });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participantIds, name, isGroup } = body;

    if (!participantIds || participantIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 participants required' }, { status: 400 });
    }

    const allIds = [...new Set([session.user.id, ...participantIds])];

    if (!isGroup) {
      const otherId = allIds.find((id) => id !== session.user.id);
      if (otherId) {
        const existing = await prisma.conversation.findFirst({
          where: {
            isGroup: false,
            AND: [
              { members: { some: { userId: session.user.id } } },
              { members: { some: { userId: otherId } } },
            ],
          },
          include: {
            members: {
              include: { user: { select: { id: true, name: true, image: true } } },
            },
          },
        });

        if (existing) {
          return NextResponse.json({ conversation: existing });
        }
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        name: name || null,
        isGroup: isGroup || false,
        members: {
          create: allIds.map((pid: string) => ({ userId: pid })),
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
