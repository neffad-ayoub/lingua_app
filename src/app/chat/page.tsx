'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSocket, getSocket } from '@/lib/socket';

interface Contact {
  id: string;
  name: string;
  image: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  isGroup: boolean;
}

interface MessageData {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null };
  corrections?: { id: string; original: string; corrected: string; note: string | null }[];
}

export default function ChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showCorrect, setShowCorrect] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTime = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketRef = useSocket(session?.user?.id, selectedContact?.id);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/conversations`)
      .then((r) => r.json())
      .then((data) => {
        const convs = data.conversations || [];
        setContacts(convs);
        const urlParams = new URLSearchParams(window.location.search);
        const convId = urlParams.get('conversation');
        if (convId) {
          const match = convs.find((c: Contact) => c.id === convId);
          if (match) setSelectedContact(match);
        }
      });
  }, [session]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/messages?conversationId=${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      const msgs: MessageData[] = data.messages || [];
      setMessages((prev) => {
        if (prev.length === msgs.length && prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id) return prev;
        return msgs;
      });
      if (msgs.length > 0) lastMessageTime.current = msgs[msgs.length - 1].createdAt;
      if (session?.user?.id) {
        fetch(`/api/conversations`)
          .then((r) => r.json())
          .then((d) => setContacts(d.conversations || []));
      }
    }
  }, [session]);

  useEffect(() => {
    if (!selectedContact) return;
    fetchMessages(selectedContact.id);
    pollingRef.current = setInterval(() => fetchMessages(selectedContact.id), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg: MessageData) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onCorrection = (corr: { messageId: string; id: string; original: string; corrected: string; note?: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === corr.messageId
            ? { ...m, corrections: [...(m.corrections || []), { id: corr.id, original: corr.original, corrected: corr.corrected, note: corr.note || null }] }
            : m
        )
      );
    };

    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.isTyping }));
    };

    socket.on('message:new', onMessage);
    socket.on('correction:new', onCorrection);
    socket.on('typing:update', onTyping);

    return () => {
      socket.off('message:new', onMessage);
      socket.off('correction:new', onCorrection);
      socket.off('typing:update', onTyping);
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || !selectedContact || !session?.user?.id) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: selectedContact.id,
        senderId: session.user.id,
        content: messageInput,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setMessageInput('');

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('message:send', {
          conversationId: selectedContact.id,
          senderId: session.user.id,
          content: messageInput,
        });
      }
    }
  }, [messageInput, selectedContact, session]);

  const handleTyping = useCallback((value: string) => {
    setMessageInput(value);
    const socket = getSocket();
    if (!socket?.connected || !selectedContact || !session?.user?.id) return;

    socket.emit('typing:start', { conversationId: selectedContact.id, userId: session.user.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: selectedContact.id, userId: session.user.id });
    }, 2000);
  }, [selectedContact, session]);

  const handleCorrect = async (messageId: string) => {
    if (!selectedContact || !correctionText.trim() || !session?.user?.id) return;

    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        authorId: session.user.id,
        original: msg.content,
        corrected: correctionText,
        note: correctionNote || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, corrections: [...(m.corrections || []), data.correction] }
            : m
        )
      );
      setShowCorrect(null);
      setCorrectionText('');
      setCorrectionNote('');

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('correction:send', {
          conversationId: selectedContact.id,
          messageId,
          authorId: session.user.id,
          original: msg.content,
          corrected: correctionText,
          note: correctionNote || undefined,
        });
      }
    }
  };

  const startVideoCall = useCallback(() => {
    if (!selectedContact) return;
    const partnerId = contacts.find((c) => c.id === selectedContact.id);
    if (partnerId) router.push(`/video?partner=${partnerId.id}`);
  }, [selectedContact, contacts, router]);

  const isTypingOther = selectedContact
    ? Object.entries(typingUsers).some(([uid, typing]) => typing && uid !== session?.user?.id)
    : false;

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      <div className="w-80 border-r border-slate-200 bg-white md:block">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-8rem)]">
          {contacts.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">No conversations yet</div>
          )}
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                selectedContact?.id === contact.id ? 'bg-indigo-50' : ''
              }`}
            >
              <Avatar name={contact.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{contact.name}</span>
                  {contact.unread > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {contact.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">{contact.lastMessage || 'No messages yet'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedContact ? (
        <div className="flex flex-1 flex-col bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={selectedContact.name} size="sm" />
              <div>
                <h3 className="text-sm font-semibold">{selectedContact.name}</h3>
                {isTypingOther && <p className="text-xs text-indigo-500">typing...</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={startVideoCall}>📹 Video</Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">No messages yet. Say hello!</div>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender.id === session?.user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group relative max-w-xs rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 shadow-sm rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`mt-0.5 text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!isMe && msg.type === 'TEXT' && (
                      <button
                        onClick={() => setShowCorrect(msg.id)}
                        className="absolute -right-2 -top-2 hidden rounded-full bg-amber-400 p-1 text-white shadow-sm hover:bg-amber-500 group-hover:block"
                        title="Correct this message"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {messages.map((msg) =>
              msg.corrections?.map((corr) => (
                <div key={corr.id} className="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-medium text-amber-700">✏️ Correction</p>
                  <p className="text-sm text-red-600 line-through">{corr.original}</p>
                  <p className="text-sm font-medium text-green-700">{corr.corrected}</p>
                  {corr.note && <p className="mt-1 text-xs text-slate-500 italic">"{corr.note}"</p>}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {showCorrect && (
            <div className="border-t border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-amber-700">✏️ Correcting message</p>
                <button onClick={() => setShowCorrect(null)} className="text-amber-500 hover:text-amber-700">✕</button>
              </div>
              <input placeholder="Corrected version..." value={correctionText} onChange={(e) => setCorrectionText(e.target.value)}
                className="mb-2 w-full rounded-lg border border-amber-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
              <input placeholder="Optional note..." value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)}
                className="mb-2 w-full rounded-lg border border-amber-300 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" />
              <Button size="sm" onClick={() => handleCorrect(showCorrect)}>Send Correction</Button>
            </div>
          )}

          <div className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <input placeholder="Type a message..." value={messageInput}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              <Button size="sm" onClick={handleSend} disabled={!messageInput.trim()}>Send</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          <div className="text-center">
            <p className="text-5xl">💬</p>
            <p className="mt-2 text-lg">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
