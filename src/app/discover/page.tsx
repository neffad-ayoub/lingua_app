'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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

  const handleVideoCall = useCallback((targetUserId: string) => {
    router.push(`/video?partner=${targetUserId}`);
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
          .filter((u) => u.id !== session?.user?.id)
          .map((user) => {
            const nativeLangs = user.userLanguages.filter((l) => l.isNative);
            const learnLangs = user.userLanguages.filter((l) => !l.isNative);
            const country = user.profile?.country || '';

            return (
              <div
                key={user.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={user.name || 'User'} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{user.name || 'Anonymous'}</h3>
                    {country && <p className="text-sm text-slate-500">{country}</p>}
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
    </div>
  );
}
