'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailSlot {
  id?: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyMeetings, setNotifyMeetings] = useState(true);
  const [notifyCorrections, setNotifyCorrections] = useState(true);
  const [notifyPartners, setNotifyPartners] = useState(false);
  const [messagePrivacy, setMessagePrivacy] = useState('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [availSlots, setAvailSlots] = useState<AvailSlot[]>([]);
  const [availDay, setAvailDay] = useState('0');
  const [availStart, setAvailStart] = useState('9');
  const [availEnd, setAvailEnd] = useState('17');

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      fetch('/api/users/me')
        .then((r) => r.json())
        .then((data) => {
          const user = data.user;
          if (user) {
            setBio(user.bio || '');
            setCountry(user.profile?.country || '');
            setCity(user.profile?.city || '');
            setShowMap(user.profile?.showMap ?? false);
            setNotifyMessages(user.profile?.notifyMessages ?? true);
            setNotifyMeetings(user.profile?.notifyMeetings ?? true);
            setNotifyCorrections(user.profile?.notifyCorrections ?? true);
            setNotifyPartners(user.profile?.notifyPartners ?? false);
            setMessagePrivacy(user.profile?.messagePrivacy ?? 'all');
          }
        })
        .catch(() => {});

      fetch('/api/availability')
        .then((r) => r.json())
        .then((data) => {
          if (data.availability) setAvailSlots(data.availability);
        })
        .catch(() => {});
    }
  }, [session]);

  const addAvailSlot = () => {
    const s = parseInt(availStart);
    const e = parseInt(availEnd);
    if (s >= e) return;
    setAvailSlots((prev) => [
      ...prev,
      { dayOfWeek: parseInt(availDay), startHour: s, endHour: e },
    ]);
  };

  const removeAvailSlot = (index: number) => {
    setAvailSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          name,
          bio,
          country,
          city,
          showMap,
          notifyMessages,
          notifyMeetings,
          notifyCorrections,
          notifyPartners,
          messagePrivacy,
        }),
      });

      if (res.ok) {
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slots: availSlots }),
        });
        setSaved(true);
        update({ name });
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        {saved && (
          <span className="text-sm text-green-600 font-medium animate-fade-in">Saved!</span>
        )}
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell other learners about yourself..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Your country"
              />
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
              />
            </div>
          </div>
        </section>

        {/* Map visibility */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Location</h2>
          <p className="mb-4 text-sm text-slate-500">
            Show your approximate location on the map to find nearby language partners
          </p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={showMap}
              onChange={(e) => setShowMap(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-medium">Show me on the map</span>
              <p className="text-xs text-slate-400">Only your city is shown, not your exact location</p>
            </div>
          </label>
        </section>

        {/* Notification preferences */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Notifications</h2>
          <div className="space-y-3">
            {[
              { key: 'notifyMessages', label: 'Message notifications', desc: 'When someone sends you a message', value: notifyMessages, setter: setNotifyMessages },
              { key: 'notifyMeetings', label: 'Meeting reminders', desc: '15 minutes before a scheduled meeting', value: notifyMeetings, setter: setNotifyMeetings },
              { key: 'notifyCorrections', label: 'Correction alerts', desc: 'When someone corrects your post', value: notifyCorrections, setter: setNotifyCorrections },
              { key: 'notifyPartners', label: 'New partner suggestions', desc: 'Weekly recommended language partners', value: notifyPartners, setter: setNotifyPartners },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <span className="text-sm font-medium">{pref.label}</span>
                  <p className="text-xs text-slate-400">{pref.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref.value}
                  onChange={(e) => pref.setter(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Privacy</h2>
          <Select
            label="Who can message you"
            value={messagePrivacy}
            onChange={(e) => setMessagePrivacy(e.target.value)}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'verified', label: 'Verified users only' },
              { value: 'mutual', label: 'People with matching languages only' },
            ]}
          />
        </section>

        {/* Availability Calendar */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Availability Calendar</h2>
          <p className="mb-4 text-sm text-slate-500">Set your weekly availability so partners know when you're free for meetings.</p>

          <div className="flex flex-wrap items-end gap-2 mb-4">
            <div className="w-32">
              <Select
                label="Day"
                value={availDay}
                onChange={(e) => setAvailDay(e.target.value)}
                options={DAYS.map((d, i) => ({ value: String(i), label: d }))}
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
              <select
                value={availStart}
                onChange={(e) => setAvailStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={String(h)}>{h.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
              <select
                value={availEnd}
                onChange={(e) => setAvailEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={String(h)}>{h.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={addAvailSlot}>Add Slot</Button>
          </div>

          {availSlots.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No availability set. Add your first time slot above.</p>
          ) : (
            <div className="space-y-2">
              {availSlots.map((slot, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium">{DAYS[slot.dayOfWeek]}</span>
                    {' '}{slot.startHour.toString().padStart(2, '0')}:00 – {slot.endHour.toString().padStart(2, '0')}:00
                  </span>
                  <button onClick={() => removeAvailSlot(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Change password */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Change Password</h2>
          {pwError && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 border border-green-200">{pwSuccess}</div>
          )}
          <div className="space-y-3">
            <Input label="Current Password" type="password" placeholder="Your current password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} />
            <Input label="New Password" type="password" placeholder="Min. 8 characters" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
            <Input label="Confirm New Password" type="password" placeholder="Repeat new password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
            <Button
              variant="secondary"
              disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm || pwNew !== pwConfirm}
              onClick={async () => {
                if (!session?.user?.id) return;
                setPwLoading(true); setPwError(''); setPwSuccess('');
                if (pwNew !== pwConfirm) {
                  setPwError('Passwords do not match'); setPwLoading(false); return;
                }
                const res = await fetch('/api/auth/change-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
                });
                const data = await res.json();
                if (res.ok) {
                  setPwSuccess('Password changed successfully');
                  setPwCurrent(''); setPwNew(''); setPwConfirm('');
                } else {
                  setPwError(data.error || 'Failed to change password');
                }
                setPwLoading(false);
              }}
            >
              {pwLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-red-600">Delete Account</h2>
          <p className="mb-4 text-sm text-slate-500">This will permanently delete your account and all data. This cannot be undone.</p>
          {deleteError && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200">{deleteError}</div>
          )}
          <Input label="Enter your password to confirm" type="password" placeholder="Your password" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
          <Button
            variant="danger"
            className="mt-3"
            disabled={deleteLoading || !deleteConfirm}
            onClick={async () => {
              if (!session?.user?.id) return;
              setDeleteLoading(true); setDeleteError('');
              const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, password: deleteConfirm }),
              });
              if (res.ok) {
                window.location.href = '/';
              } else {
                const data = await res.json();
                setDeleteError(data.error || 'Failed to delete account');
              }
              setDeleteLoading(false);
            }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Account'}
          </Button>
        </section>

        <Button onClick={handleSave} className="w-full" disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
