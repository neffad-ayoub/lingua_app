'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';

function VideoCallContent() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [liveKitAvailable, setLiveKitAvailable] = useState(true);
  const [liveKitToken, setLiveKitToken] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const r = searchParams.get('room');
    if (r) setRoomCode(r);
  }, [searchParams]);

  useEffect(() => {
    if (!isInCall) return;
    timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isInCall]);

  useEffect(() => {
    if (!isInCall || !videoRef.current) return;
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: !isVideoOff, audio: !isMuted })
        .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(() => {});
    }
  }, [isInCall, isVideoOff, isMuted]);

  const fetchLiveKitToken = useCallback(async (room: string) => {
    try {
      const res = await fetch(`/api/livekit/token?room=${room}`);
      if (res.ok) {
        const data = await res.json();
        setLiveKitToken(data.token);
        setLiveKitUrl(data.url);
        setLiveKitAvailable(true);
        return data;
      }
    } catch {}
    setLiveKitAvailable(false);
    return null;
  }, []);

  const handleCreateRoom = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedCode(code);
    await fetchLiveKitToken(code);
    setIsInCall(true);
  };

  const handleJoinRoom = async () => {
    if (roomCode.trim().length < 6) return;
    await fetchLiveKitToken(roomCode.trim());
    setIsInCall(true);
  };

  const handleEndCall = () => {
    setIsInCall(false);
    setGeneratedCode('');
    setRoomCode('');
    setCallTimer(0);
    setLiveKitToken('');
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (isInCall) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-900">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-dot" />
            <span className="text-sm text-white font-medium">
              {generatedCode ? `Room: ${generatedCode}` : `Joined: ${roomCode}`}
            </span>
          </div>
          <span className="text-sm text-slate-300 font-mono">{formatTime(callTimer)}</span>
        </div>

        <div className="flex-1 p-4">
          <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden">
              {isVideoOff ? (
                <Avatar name="You" size="xl" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">You</div>
            </div>

            <div className="relative rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-600">
              {liveKitToken ? (
                <div className="text-center p-4">
                  <p className="text-green-400 text-sm mb-2">✓ Connected to LiveKit</p>
                  <p className="text-slate-400 text-xs">Waiting for participant to join...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-4xl mb-2">👥</p>
                  <p className="text-slate-400 text-sm">Waiting for partner...</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Code: <span className="font-mono font-bold text-white">{generatedCode || roomCode}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 bg-slate-800 px-4 py-4">
          <button onClick={() => setIsMuted(!isMuted)}
            className={`rounded-full p-4 transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={isMuted ? 'Unmute' : 'Mute'}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button onClick={() => setIsVideoOff(!isVideoOff)}
            className={`rounded-full p-4 transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <button onClick={handleEndCall}
            className="rounded-full bg-red-600 p-4 text-white hover:bg-red-700 transition-colors"
            title="End call">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l2-2m-2 2l-2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>

          <button className="rounded-full bg-slate-700 p-4 text-white hover:bg-slate-600 transition-colors" title="Share screen">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Calls</h1>
        <p className="text-slate-500">Practice speaking face-to-face with language partners</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-3xl">🎙️</div>
          <h2 className="mb-2 text-lg font-semibold">Create a Room</h2>
          <p className="mb-4 text-sm text-slate-500">
            Generate a one-time room code to share with your partner.
          </p>
          <Button onClick={handleCreateRoom} className="w-full">Create Room</Button>
          {generatedCode && (
            <div className="mt-4 rounded-lg bg-indigo-50 p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">Share this code with your partner:</p>
              <p className="text-2xl font-mono font-bold text-indigo-700 tracking-widest">{generatedCode}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-3xl">🔗</div>
          <h2 className="mb-2 text-lg font-semibold">Join a Room</h2>
          <p className="mb-4 text-sm text-slate-500">
            Enter the room code your partner shared with you.
          </p>
          <Input
            placeholder="Enter room code..."
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="mb-3 font-mono text-center text-lg tracking-widest"
          />
          <Button onClick={handleJoinRoom} className="w-full" disabled={roomCode.trim().length < 6}>
            Join Room
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 font-semibold">📹 Video Call Tips</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2"><span className="text-green-500">✓</span>Find a quiet space with good lighting</li>
          <li className="flex items-start gap-2"><span className="text-green-500">✓</span>Start by introducing yourself in your target language</li>
          <li className="flex items-start gap-2"><span className="text-green-500">✓</span>Split time evenly — practice both languages</li>
          <li className="flex items-start gap-2"><span className="text-green-500">✓</span>Don&apos;t be afraid to ask your partner to slow down or repeat</li>
        </ul>
      </div>
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><p className="text-slate-400">Loading...</p></div>}>
      <VideoCallContent />
    </Suspense>
  );
}
