/**
 * Custom server with Socket.io for real-time chat.
 *
 * Run with: npx tsx server.ts
 * (instead of `next dev`)
 */
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: { origin: '*' },
  });

  // Track online users
  const onlineUsers = new Map<string, { userId: string; socketId: string }>();

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // ── User comes online ──────────────────────────────
    socket.on('user:online', (userId: string) => {
      onlineUsers.set(userId, { userId, socketId: socket.id });
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log(`[Socket] User ${userId} is online`);
    });

    // ── Join a conversation room ───────────────────────
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      console.log(`[Socket] ${socket.id} joined conversation ${conversationId}`);
    });

    // ── Leave a conversation room ──────────────────────
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── Send a message ─────────────────────────────────
    socket.on('message:send', (data: {
      conversationId: string;
      senderId: string;
      content: string;
      type?: string;
    }) => {
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'TEXT',
        timestamp: new Date().toISOString(),
      };

      io.to(`conv:${data.conversationId}`).emit('message:new', message);
    });

    // ── Typing indicator ───────────────────────────────
    socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:update', {
        userId: data.userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:update', {
        userId: data.userId,
        isTyping: false,
      });
    });

    // ── Correction sent ────────────────────────────────
    socket.on('correction:send', (data: {
      conversationId: string;
      messageId: string;
      authorId: string;
      original: string;
      corrected: string;
      note?: string;
    }) => {
      const correction = {
        id: `corr_${Date.now()}`,
        ...data,
        timestamp: new Date().toISOString(),
      };

      io.to(`conv:${data.conversationId}`).emit('correction:new', correction);
    });

    // ── Video call signaling ───────────────────────────
    socket.on('call:invite', (data: { targetUserId: string; roomCode: string; callerName: string }) => {
      const target = onlineUsers.get(data.targetUserId);
      if (target) {
        io.to(target.socketId).emit('call:incoming', {
          roomCode: data.roomCode,
          callerName: data.callerName,
          callerSocketId: socket.id,
        });
      }
    });

    socket.on('call:accept', (data: { callerSocketId: string }) => {
      io.to(data.callerSocketId).emit('call:accepted', { acceptorSocketId: socket.id });
    });

    socket.on('call:reject', (data: { callerSocketId: string }) => {
      io.to(data.callerSocketId).emit('call:rejected');
    });

    // ── Disconnect ─────────────────────────────────────
    socket.on('disconnect', () => {
      // Remove from online users
      for (const [userId, info] of onlineUsers.entries()) {
        if (info.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io ready on path /api/socketio`);
  });
});
