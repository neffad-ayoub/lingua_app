'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';

interface Meeting {
  id: string;
  title: string | null;
  roomCode: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string | null;
  owner: { id: string; name: string | null; image: string | null };
  guest: { id: string; name: string | null; image: string | null } | null;
  language: { code: string; name: string; flag: string } | null;
}

interface RatingInfo {
  userRating: number | null;
  userComment: string | null;
  averageScore: number;
  totalRatings: number;
}

const LANGUAGES = [
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
];

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function MeetingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [ratingInfos, setRatingInfos] = useState<Record<string, RatingInfo>>({});
  const [showRating, setShowRating] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const handleJoin = useCallback(async (meeting: Meeting) => {
    if (meeting.status === 'PENDING') {
      await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id, status: 'ACTIVE', guestId: session?.user?.id }),
      });
    }
    router.push(`/video?room=${meeting.roomCode}`);
  }, [router, session]);

  const handleCancel = useCallback(async (meetingId: string) => {
    const res = await fetch('/api/meetings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, status: 'CANCELLED' }),
    });
    if (res.ok) {
      setMeetings((prev) =>
        prev.map((m) => (m.id === meetingId ? { ...m, status: 'CANCELLED' as const } : m))
      );
    }
  }, []);

  const fetchRatings = useCallback(async (meetingsList: Meeting[]) => {
    const completed = meetingsList.filter((m) => m.status === 'COMPLETED');
    if (completed.length === 0) return;
    const entries = await Promise.all(
      completed.map(async (m) => {
        try {
          const partner = m.owner.id === session?.user?.id ? m.guest : m.owner;
          if (!partner) return [m.id, null] as const;
          const res = await fetch(`/api/ratings?userId=${partner.id}`);
          if (!res.ok) return [m.id, null] as const;
          const data = await res.json();
          const userRating = data.ratings?.find(
            (r: { givenById: string }) => r.givenById === session?.user?.id
          );
          return [m.id, {
            userRating: userRating?.score || null,
            userComment: userRating?.comment || null,
            averageScore: data.averageScore || 0,
            totalRatings: data.totalRatings || 0,
          }] as const;
        } catch {
          return [m.id, null] as const;
        }
      })
    );
    setRatingInfos((prev) => ({ ...prev, ...Object.fromEntries(entries.filter((e): e is [string, RatingInfo] => e[1] !== null)) }));
  }, [session]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/meetings`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.meetings || [];
        setMeetings(list);
        setLoading(false);
        fetchRatings(list);
      })
      .catch(() => setLoading(false));
  }, [session, fetchRatings]);

  const handleRate = async () => {
    if (!showRating || !ratingScore || !session?.user?.id) return;
    const meeting = meetings.find((m) => m.id === showRating);
    if (!meeting) return;
    const partner = meeting.owner.id === session.user.id ? meeting.guest : meeting.owner;
    if (!partner) return;

    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId: showRating,
        userId: partner.id,
        score: ratingScore,
        comment: ratingComment || undefined,
      }),
    });

    if (res.ok) {
      setRatingInfos((prev) => ({
        ...prev,
        [showRating]: {
          userRating: ratingScore,
          userComment: ratingComment,
          averageScore: prev[showRating]?.averageScore || 0,
          totalRatings: (prev[showRating]?.totalRatings || 0) + 1,
        },
      }));
      setShowRating(null);
      setRatingScore(0);
      setRatingComment('');
    }
  };

  const filtered = meetings.filter((m) => {
    if (activeTab === 'upcoming') return m.status === 'PENDING' || m.status === 'ACTIVE';
    if (activeTab === 'completed') return m.status === 'COMPLETED';
    if (activeTab === 'cancelled') return m.status === 'CANCELLED';
    return true;
  });

  const handleCreate = async () => {
    if (!session?.user?.id || !newDate || !newTime) return;

    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        languageId: newLang || null,
        scheduledAt: `${newDate}T${newTime}:00`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMeetings([data.meeting, ...meetings]);
      setShowNew(false);
      setNewTitle('');
      setNewLang('');
      setNewDate('');
      setNewTime('');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-slate-500">Schedule and manage your practice sessions</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          + New Meeting
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {filtered.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading meetings...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => {
            const partner = meeting.owner.id === session?.user?.id ? meeting.guest : meeting.owner;
            const rating = ratingInfos[meeting.id];
            return (
              <div
                key={meeting.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <Avatar name={partner?.name || 'Partner'} size="md" />
                  <div>
                    <h3 className="font-medium">{meeting.title || 'Practice Session'}</h3>
                    <p className="text-sm text-slate-500">
                      {partner?.name || 'No partner'} {meeting.language ? `· ${meeting.language.flag} ${meeting.language.name}` : ''}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(meeting.scheduledAt)} at {formatTime(meeting.scheduledAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(meeting.status === 'PENDING' || meeting.status === 'ACTIVE') && (
                    <>
                      {meeting.roomCode && (
                        <Badge variant="info">Code: {meeting.roomCode}</Badge>
                      )}
                      <Button size="sm" onClick={() => handleJoin(meeting)}>Join</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(meeting.id)}>Cancel</Button>
                    </>
                  )}
                  {meeting.status === 'COMPLETED' && (
                    <>
                      <Badge variant="success">Completed</Badge>
                      {rating?.userRating ? (
                        <span className="text-sm text-amber-500">
                          {'★'.repeat(rating.userRating)}{'☆'.repeat(5 - rating.userRating)}
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setShowRating(meeting.id)}>
                          Rate
                        </Button>
                      )}
                    </>
                  )}
                  {meeting.status === 'CANCELLED' && (
                    <Badge variant="danger">Cancelled</Badge>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl">📅</p>
              <p className="mt-2">No {activeTab} meetings</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="Schedule a Meeting"
      >
        <div className="space-y-4">
          <Input
            label="Meeting Title"
            placeholder="e.g., Spanish Practice Session"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Select
            label="Practice Language"
            value={newLang}
            onChange={(e) => setNewLang(e.target.value)}
            options={[{ value: '', label: 'Select language...' }, ...LANGUAGES]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Input
              label="Time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowNew(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1" disabled={!newTitle || !newDate || !newTime}>
              Create Meeting
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!showRating}
        onClose={() => { setShowRating(null); setRatingScore(0); setRatingComment(''); }}
        title="Rate Your Session"
      >
        <div className="space-y-4">
          <div className="flex justify-center gap-1 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRatingScore(star)}
                className={`text-3xl transition-colors ${
                  star <= ratingScore ? 'text-amber-400' : 'text-slate-300'
                } hover:text-amber-400`}
              >
                {star <= ratingScore ? '★' : '☆'}
              </button>
            ))}
          </div>
          {ratingScore > 0 && (
            <p className="text-center text-sm text-slate-500">{STAR_LABELS[ratingScore - 1]}</p>
          )}
          <Input
            label="Comment (optional)"
            placeholder="How was your practice session?"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setShowRating(null); setRatingScore(0); setRatingComment(''); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleRate} className="flex-1" disabled={!ratingScore}>
              Submit Rating
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
