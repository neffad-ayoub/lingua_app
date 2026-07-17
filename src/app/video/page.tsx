'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Room, RoomEvent, createLocalTracks, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';

function VideoCallContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || searchParams.get('partner') ? 'connecting' : '');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [remoteParticipants, setRemoteParticipants] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteTracksRef = useRef<Map<string, RemoteTrackPublication>>(new Map());

  useEffect(() => {
    const room = searchParams.get('room');
    const partner = searchParams.get('partner');
    if (room) {
      setRoomCode(room);
    }
    if (partner && session?.user?.id) {
      handleCreateDirectCall(partner);
    }
  }, [searchParams, session]);

  useEffect(() => {
    if (!isInCall) return;
    timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInCall]);

  const cleanupRoom = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    remoteTracksRef.current.clear();
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const connectToRoom = useCallback(async (room: string, token: string, url: string) => {
    cleanupRoom();

    const livekitRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
    });

    livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'video' || track.kind === 'audio') {
        remoteTracksRef.current.set(participant.identity, publication);
        if (track.kind === 'video' && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        }
      }
      setRemoteParticipants((prev) =>
        prev.includes(participant.identity) ? prev : [...prev, participant.identity]
      );
    });

    livekitRoom.on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => {
      remoteTracksRef.current.delete(participant.identity);
      setRemoteParticipants((prev) => prev.filter((p) => p !== participant.identity));
    });

    livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setRemoteParticipants((prev) => prev.filter((p) => p !== participant.identity));
    });

    livekitRoom.on(RoomEvent.Disconnected, () => {
      setConnectionState('idle');
      setIsInCall(false);
      cleanupRoom();
    });

    livekitRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === 'connected') setConnectionState('connected');
      if (state === 'disconnected') setConnectionState('idle');
      if (state === 'reconnecting') setConnectionState('connecting');
    });

    roomRef.current = livekitRoom;

    try {
      setConnectionState('connecting');
      await livekitRoom.connect(url, token);
      const tracks = await createLocalTracks({ audio: true, video: true });
      for (const track of tracks) {
        await livekitRoom.localParticipant.publishTrack(track);
        if (track.kind === 'video' && localVideoRef.current) {
          track.attach(localVideoRef.current);
        }
      }
      setIsInCall(true);
    } catch {
      setConnectionState('error');
    }
  }, [cleanupRoom]);

  const fetchLiveKitToken = useCallback(async (room: string) => {
    const res = await fetch(`/api/livekit/token?room=${room}`);
    if (!res.ok) throw new Error('Failed to get LiveKit token');
    return res.json();
  }, []);

  const handleCreateRoom = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
    setGeneratedCode(code);
    setRoomCode(code);

    try {
      const data = await fetchLiveKitToken(code);
      await connectToRoom(code, data.token, data.url);
    } catch {
      setConnectionState('error');
    }
  };

  const handleJoinRoom = async () => {
    if (roomCode.trim().length < 6) return;
    try {
      const data = await fetchLiveKitToken(roomCode.trim());
      await connectToRoom(roomCode.trim(), data.token, data.url);
    } catch {
      setConnectionState('error');
    }
  };

  const handleCreateDirectCall = async (partnerId: string) => {
    const code = `DC${partnerId.slice(0, 6).toUpperCase()}`;
    setGeneratedCode(code);
    setRoomCode(code);
    try {
      const data = await fetchLiveKitToken(code);
      await connectToRoom(code, data.token, data.url);
    } catch {
      setConnectionState('error');
    }
  };

  const handleEndCall = () => {
    cleanupRoom();
    setIsInCall(false);
    setGeneratedCode('');
    setRoomCode('');
    setCallTimer(0);
    setConnectionState('idle');
    setRemoteParticipants([]);
  };

  const toggleMute = async () => {
    if (!roomRef.current) return;
    const pub = roomRef.current.localParticipant.getTrackPublication('audio');
    if (pub?.track) {
      await (isMuted ? pub.track.unmute() : pub.track.mute());
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    if (!roomRef.current) return;
    const pub = roomRef.current.localParticipant.getTrackPublication('video');
    if (pub?.track) {
      await (isVideoOff ? pub.track.unmute() : pub.track.mute());
    }
    setIsVideoOff(!isVideoOff);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (connectionState === 'connecting') {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-500" />
          <p className="text-lg font-medium">Connecting...</p>
          <p className="text-sm text-slate-400">Establishing secure connection</p>
        </div>
      </div>
    );
  }

  if (connectionState === 'error') {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <p className="mb-2 text-4xl">⚠️</p>
          <p className="mb-2 text-lg font-medium">Connection Failed</p>
          <p className="mb-6 text-sm text-slate-400">
            Could not connect to the video server. Check your LiveKit configuration.
          </p>
          <Button onClick={() => router.push('/video')} variant="secondary">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isInCall) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-900">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${remoteParticipants.length > 0 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse-dot`} />
            <span className="text-sm text-white font-medium">
              {roomCode} {remoteParticipants.length > 0 ? `· ${remoteParticipants.length} participant${remoteParticipants.length > 1 ? 's' : ''}` : '· Waiting...'}
            </span>
          </div>
          <span className="text-sm text-slate-300 font-mono">{formatTime(callTimer)}</span>
        </div>

        <div className="flex-1 p-4">
          <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
            <div className="relative rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden">
              {isVideoOff ? (
                <div className="text-center">
                  <Avatar name={session?.user?.name || 'You'} size="xl" />
                  <p className="mt-2 text-sm text-slate-400">Camera off</p>
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                You {isMuted ? '🔇' : ''}
              </div>
            </div>

            <div className="relative rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden">
              {remoteParticipants.length > 0 ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <p className="mb-2 text-4xl">👥</p>
                  <p className="text-slate-400 text-sm">Waiting for partner...</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Share code: <span className="font-mono font-bold text-white">{generatedCode || roomCode}</span>
                  </p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                Partner
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 bg-slate-800 px-4 py-4">
          <button onClick={toggleMute}
            className={`rounded-full p-4 transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`} title={isMuted ? 'Unmute' : 'Mute'}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <button onClick={toggleVideo}
            className={`rounded-full p-4 transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button onClick={handleEndCall} className="rounded-full bg-red-600 p-4 text-white hover:bg-red-700 transition-colors" title="End call">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l2-2m-2 2l-2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
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
          <p className="mb-4 text-sm text-slate-500">Generate a one-time room code to share with your partner.</p>
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
          <p className="mb-4 text-sm text-slate-500">Enter the room code your partner shared with you.</p>
          <Input placeholder="Enter room code..." value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="mb-3 font-mono text-center text-lg tracking-widest" />
          <Button onClick={handleJoinRoom} className="w-full" disabled={roomCode.trim().length < 6}>Join Room</Button>
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
