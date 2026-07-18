'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (globalSocket?.connected) return globalSocket;
  return null;
}

export function useSocket(userId: string | undefined, conversationId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    if (!globalSocket) {
      globalSocket = io({
        path: '/api/socketio',
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });
    }

    const socket = globalSocket;
    socketRef.current = socket;

    const onConnect = () => {
      connectedRef.current = true;
      socket.emit('user:online', userId);
      if (conversationId) socket.emit('conversation:join', conversationId);
    };

    const onDisconnect = () => {
      connectedRef.current = false;
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [userId, conversationId]);

  useEffect(() => {
    if (!socketRef.current || !conversationId) return;
    if (connectedRef.current) {
      socketRef.current.emit('conversation:join', conversationId);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('conversation:leave', conversationId);
      }
    };
  }, [conversationId]);

  return socketRef;
}
