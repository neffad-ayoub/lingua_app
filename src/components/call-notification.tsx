'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

interface IncomingCall {
  id: string;
  roomCode: string;
  owner: { id: string; name: string | null; image: string | null };
}

export function CallNotification() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const enabledRef = useRef(true);

  const userIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setIncomingCall(null);
      enabledRef.current = false;
      return;
    }

    if (userIdRef.current === uid) return;
    userIdRef.current = uid;

    enabledRef.current = true;

    const interval = setInterval(async () => {
      if (!enabledRef.current) return;
      try {
        const res = await fetch('/api/calls?incoming=true');
        if (!res.ok) return;
        const data = await res.json();
        const calls = data.calls || [];
        if (calls.length > 0) {
          setIncomingCall(calls[0]);
          enabledRef.current = false;
        }
      } catch {}
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (pathname === '/video' || pathname.startsWith('/video/')) {
      setIncomingCall(null);
      enabledRef.current = false;
    } else {
      enabledRef.current = true;
    }
  }, [pathname]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    const res = await fetch(`/api/calls/${incomingCall.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    if (res.ok) {
      const { roomCode, id } = incomingCall;
      setIncomingCall(null);
      enabledRef.current = true;
      router.push(`/video?room=${roomCode}&meetingId=${id}`);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    await fetch(`/api/calls/${incomingCall.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    });
    setIncomingCall(null);
    enabledRef.current = true;
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl w-72 animate-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <Avatar name={incomingCall.owner.name || 'Caller'} size="md" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{incomingCall.owner.name || 'Someone'}</p>
            <p className="text-xs text-red-500 font-medium">Incoming video call...</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={handleDecline}>Decline</Button>
          <Button size="sm" className="flex-1" onClick={handleAccept}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
