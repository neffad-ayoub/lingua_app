'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';

interface DiscoverUser {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  profile: { country: string | null; city: string | null } | null;
  userLanguages: {
    isNative: boolean;
    proficiency: string;
    language: { code: string; name: string; flag: string };
  }[];
}

const LANG_FILTERS = [
  { value: '', label: 'All Languages' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Spanish' },
  { value: 'fr', label: '🇫🇷 French' },
  { value: 'de', label: '🇩🇪 German' },
  { value: 'ja', label: '🇯🇵 Japanese' },
  { value: 'ko', label: '🇰🇷 Korean' },
  { value: 'ar', label: '🇸🇦 Arabic' },
  { value: 'pt', label: '🇵🇹 Portuguese' },
  { value: 'zh', label: '🇨🇳 Chinese' },
  { value: 'ru', label: '🇷🇺 Russian' },
];

const LEVEL_FILTERS = [
  { value: '', label: 'Any Level' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

export default function DiscoverPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDesc, setReportDesc] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleBlock = async (targetId: string) => {
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedId: targetId }),
    });
    if (res.ok) {
      setBlockedIds((prev) => new Set(prev).add(targetId));
      setOpenMenu(null);
    }
  };

  const handleUnblock = async (targetId: string) => {
    const res = await fetch(`/api/blocks?blockedId=${targetId}`, { method: 'DELETE' });
    if (res.ok) {
      const next = new Set(blockedIds);
      next.delete(targetId);
      setBlockedIds(next);
      setOpenMenu(null);
    }
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedId: reportTarget, reason: reportReason, description: reportDesc || undefined }),
    });
    if (res.ok) {
      setReportTarget(null);
      setReportReason('inappropriate');
      setReportDesc('');
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMessage = useCallback(async (targetUserId: string) => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds: [currentUserId, targetUserId] }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/chat?conversation=${data.conversation.id}`);
    }
  }, [router, session]);

  const handleVideoCall = useCallback(async (targetUserId: string) => {
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calleeId: targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/video?room=${data.call.roomCode}&meetingId=${data.call.id}`);
    }
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (langFilter) params.set('lang', langFilter);
    if (levelFilter) params.set('level', levelFilter);

    const qs = params.toString();
    fetch(`/api/users${qs ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, langFilter, levelFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Discover Language Partners</h1>
        <p className="text-slate-500">Find native speakers to practice with</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="w-64">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} options={LANG_FILTERS} />
        </div>
        <div className="w-40">
          <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} options={LEVEL_FILTERS} />
        </div>
        <button
          onClick={() => setOnlineOnly(!onlineOnly)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            onlineOnly
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${onlineOnly ? 'bg-green-500' : 'bg-slate-300'}`} />
          Online Now
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {loading ? 'Loading...' : `Showing ${users.length} users`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users
          .filter((u) => u.id !== session?.user?.id && !blockedIds.has(u.id))
          .map((user) => {
            const nativeLangs = user.userLanguages.filter((l) => l.isNative);
            const learnLangs = user.userLanguages.filter((l) => !l.isNative);
            const country = user.profile?.country || '';

            return (
              <div
                key={user.id}
                className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={user.name || 'User'} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{user.name || 'Anonymous'}</h3>
                    {country && <p className="text-sm text-slate-500">{country}</p>}
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                      </svg>
                    </button>
                    {openMenu === user.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {blockedIds.has(user.id) ? (
                          <button
                            onClick={() => handleUnblock(user.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Unblock user
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlock(user.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Block user
                          </button>
                        )}
                        <button
                          onClick={() => { setReportTarget(user.id); setOpenMenu(null); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Report user
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {user.bio && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{user.bio}</p>
                )}

                <div className="mt-3 space-y-1">
                  {nativeLangs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-slate-400">Native:</span>
                      {nativeLangs.map((l) => (
                        <Badge key={`${l.language.code}-native`} variant="info">
                          {l.language.flag} {l.language.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {learnLangs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-slate-400">Learning:</span>
                      {learnLangs.map((l) => (
                        <Badge key={`${l.language.code}-learn`}>
                          {l.language.flag} {l.language.name} ({l.proficiency})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleMessage(user.id)}>Message</Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleVideoCall(user.id)}>Video Call</Button>
                </div>
              </div>
            );
          })}
      </div>

      {!loading && users.length === 0 && (
        <div className="py-16 text-center text-slate-400">
          <p className="text-4xl">🔍</p>
          <p className="mt-2">No users found matching your filters</p>
        </div>
      )}

      <Modal isOpen={!!reportTarget} onClose={() => { setReportTarget(null); setReportReason('inappropriate'); setReportDesc(''); }} title="Report User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="inappropriate">Inappropriate behavior</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="fake">Fake account</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
            <textarea
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Provide more details..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setReportTarget(null); setReportReason('inappropriate'); setReportDesc(''); }}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleReport}>
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
