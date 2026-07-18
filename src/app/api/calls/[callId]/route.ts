import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { callId } = await params;

  try {
    const { action } = await request.json();
    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'action must be "accept" or "decline"' }, { status: 400 });
    }

    const call = await prisma.meeting.findUnique({ where: { id: callId } });
    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    if (call.guestId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.meeting.update({
      where: { id: callId },
      data: {
        status: action === 'accept' ? 'ACTIVE' : 'CANCELLED',
        ...(action === 'accept' ? { startedAt: new Date() } : {}),
        ...(action === 'decline' ? { endedAt: new Date() } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        guest: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ call: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update call' }, { status: 500 });
  }
}
