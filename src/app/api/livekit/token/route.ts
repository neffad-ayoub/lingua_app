import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || 'default';
  const identity = session.user.id;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: session.user.name || identity,
    metadata: JSON.stringify({ userId: identity }),
  });

  at.addGrant({ roomJoin: true, room });
  const token = await at.toJwt();

  return NextResponse.json({ token, url: process.env.LIVEKIT_URL });
}
